import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getS3Url } from "@/lib/s3"
import { analyzePhotoWithGemini } from "./gemini-vision"
import { buildHybridPrompt } from "./photo-analysis-prompt"
import { detectFacesInImage } from "./detect-faces"
import { indexDetectedFaces } from "./index-faces"
import { PhotoAnalysisError, type PhotoAnalysisResult, type CVDetectedFace, type PersonFace } from "./types"

export async function analyzePhoto(
  photoId: string,
  galleryId: string,
  collectionId?: string
): Promise<void> {
  const startTime = Date.now()

  // Mark as processing
  await prisma.photoAnalysis.upsert({
    where: { photoId },
    create: { photoId, galleryId, status: "PROCESSING" },
    update: { status: "PROCESSING", errorMessage: null },
  })

  try {
    // Fetch the image
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { thumbnailUrl: true, s3Key: true, mimeType: true },
    })

    if (!photo) {
      throw new PhotoAnalysisError("Photo not found", "IMAGE_ERROR")
    }

    // Use full-resolution image for face detection/indexing (thumbnails produce
    // low-quality Rekognition embeddings that cause false-positive matches).
    // Use thumbnail for Gemini Vision analysis (scene understanding doesn't need high res).
    const fullImageUrl = getS3Url(photo.s3Key)
    const fullResponse = await fetch(fullImageUrl)
    if (!fullResponse.ok) {
      throw new PhotoAnalysisError(`Failed to fetch image: ${fullResponse.status}`, "IMAGE_ERROR")
    }

    const fullBuffer = Buffer.from(await fullResponse.arrayBuffer())
    const mimeType = photo.mimeType.startsWith("image/") ? photo.mimeType : "image/jpeg"

    // === STAGE 1: CV Face Detection (uses full-res for accurate bounding boxes) ===
    let cvFaces: CVDetectedFace[] = []
    try {
      cvFaces = await detectFacesInImage(fullBuffer)
    } catch (error) {
      // Non-fatal: fall back to LLM-only detection
      console.warn(`CV face detection failed for ${photoId}, falling back to LLM:`,
        error instanceof Error ? error.message : error)
    }

    // === STAGE 2: LLM Annotation (uses thumbnail if available to save bandwidth) ===
    let geminiBuffer: Buffer
    if (photo.thumbnailUrl) {
      try {
        const thumbResponse = await fetch(photo.thumbnailUrl)
        geminiBuffer = thumbResponse.ok
          ? Buffer.from(await thumbResponse.arrayBuffer())
          : fullBuffer
      } catch {
        geminiBuffer = fullBuffer
      }
    } else {
      geminiBuffer = fullBuffer
    }

    const prompt = buildHybridPrompt(cvFaces)
    const base64 = geminiBuffer.toString("base64")
    const rawResponse = await analyzePhotoWithGemini(base64, mimeType, prompt)

    // Parse JSON response
    const jsonStr = rawResponse.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim()
    let analysisResult: PhotoAnalysisResult
    try {
      analysisResult = JSON.parse(jsonStr)
    } catch {
      throw new PhotoAnalysisError(
        `Failed to parse Gemini response as JSON: ${jsonStr.substring(0, 200)}`,
        "PARSE_ERROR"
      )
    }

    // Merge CV data into LLM people results
    const people = mergeCVAndLLMFaces(cvFaces, analysisResult.people || [])

    // === STAGE 3: Face Indexing into Rekognition collection (uses full-res for quality) ===
    if (collectionId && cvFaces.length > 0) {
      try {
        const indexed = await indexDetectedFaces(collectionId, fullBuffer, photoId, cvFaces)
        // Write rekognitionFaceId back into the people array
        for (const result of indexed) {
          const matchingPerson = people[result.cvFaceIndex]
          if (matchingPerson) {
            matchingPerson.rekognitionFaceId = result.rekognitionFaceId
          }
        }
      } catch (error) {
        // Non-fatal: faces still have CV bounding boxes, just no embedding index
        console.warn(`Face indexing failed for ${photoId}:`,
          error instanceof Error ? error.message : error)
      }
    }

    // Extract flat search tags
    const searchTags = extractSearchTags({ ...analysisResult, people })

    // Upsert completed analysis
    await prisma.photoAnalysis.upsert({
      where: { photoId },
      create: {
        photoId,
        galleryId,
        status: "COMPLETED",
        description: analysisResult.description,
        analysisData: JSON.parse(JSON.stringify(analysisResult)) as Prisma.InputJsonValue,
        searchTags,
        faceData: JSON.parse(JSON.stringify(people)) as Prisma.InputJsonValue,
        faceCount: people.length,
        analyzedAt: new Date(),
      },
      update: {
        status: "COMPLETED",
        description: analysisResult.description,
        analysisData: JSON.parse(JSON.stringify(analysisResult)) as Prisma.InputJsonValue,
        searchTags,
        faceData: JSON.parse(JSON.stringify(people)) as Prisma.InputJsonValue,
        faceCount: people.length,
        analyzedAt: new Date(),
        errorMessage: null,
      },
    })

    const durationMs = Date.now() - startTime
    console.log(JSON.stringify({
      event: "photo_analysis_complete",
      galleryId,
      photoId,
      durationMs,
      cvFaces: cvFaces.length,
      indexedFaces: people.filter((p) => p.rekognitionFaceId).length,
    }))
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorCode = error instanceof PhotoAnalysisError ? error.code : "UNKNOWN"
    const rawMessage = error instanceof Error ? error.message : "Unknown error"
    const prefixedMessage = `[${errorCode}] ${rawMessage}`

    console.log(JSON.stringify({
      event: "photo_analysis_failed",
      galleryId,
      photoId,
      errorCode,
      errorMessage: rawMessage,
      durationMs,
    }))

    await prisma.photoAnalysis.upsert({
      where: { photoId },
      create: {
        photoId,
        galleryId,
        status: "FAILED",
        errorMessage: prefixedMessage,
        retryCount: 1,
      },
      update: {
        status: "FAILED",
        errorMessage: prefixedMessage,
        retryCount: { increment: 1 },
      },
    })
  }
}

function mergeCVAndLLMFaces(
  cvFaces: CVDetectedFace[],
  llmPeople: PersonFace[]
): PersonFace[] {
  if (cvFaces.length === 0) {
    // No CV faces — use LLM results as-is with legacy source
    return llmPeople.map((p) => ({
      ...p,
      detectionSource: "llm" as const,
    }))
  }

  // CV faces are the source of truth for positions and count
  return cvFaces.map((cv, i) => {
    const faceId = `face_${i + 1}`
    // Try to find matching LLM annotation by faceId
    const llmMatch = llmPeople.find((p) => p.faceId === faceId)

    const ageLabel = cv.ageRange
      ? ageRangeToLabel(cv.ageRange)
      : llmMatch?.ageRange || "adult"

    return {
      faceId,
      appearance: llmMatch?.appearance || "person",
      role: llmMatch?.role || null,
      expression: llmMatch?.expression || topEmotion(cv.emotions),
      ageRange: ageLabel,
      position: cv.boundingBox,
      confidence: cv.confidence,
      detectionSource: "rekognition" as const,
    } satisfies PersonFace
  })
}

function ageRangeToLabel(age: { low: number; high: number }): string {
  const mid = (age.low + age.high) / 2
  if (mid < 13) return "child"
  if (mid < 18) return "teen"
  if (mid < 30) return "young_adult"
  if (mid < 60) return "adult"
  return "senior"
}

function topEmotion(
  emotions?: Array<{ type: string; confidence: number }>
): string {
  if (!emotions || emotions.length === 0) return "neutral"
  const top = emotions.reduce((a, b) =>
    a.confidence > b.confidence ? a : b
  )
  return top.type.toLowerCase()
}

function extractSearchTags(result: PhotoAnalysisResult & { people: PersonFace[] }): string[] {
  const tags = new Set<string>()

  if (result.tags) {
    for (const tag of result.tags) {
      tags.add(tag.toLowerCase().trim())
    }
  }

  if (result.activities) {
    for (const activity of result.activities) {
      tags.add(activity.toLowerCase().trim())
    }
  }

  if (result.objects) {
    for (const obj of result.objects) {
      tags.add(obj.toLowerCase().trim())
    }
  }

  if (result.scene) tags.add(result.scene.toLowerCase().trim())
  if (result.mood) tags.add(result.mood.toLowerCase().trim())
  if (result.composition) tags.add(result.composition.toLowerCase().trim())

  if (result.people) {
    for (const person of result.people) {
      if (person.role) tags.add(person.role.toLowerCase().trim())
      if (person.expression) tags.add(person.expression.toLowerCase().trim())
      if (person.ageRange) tags.add(person.ageRange.toLowerCase().trim())
    }
  }

  return Array.from(tags).filter(Boolean)
}

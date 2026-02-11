import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getS3Url } from "@/lib/s3"
import { analyzePhotoWithGemini } from "./gemini-vision"
import { PHOTO_ANALYSIS_PROMPT } from "./photo-analysis-prompt"
import { PhotoAnalysisError, type PhotoAnalysisResult } from "./types"

export async function analyzePhoto(photoId: string, galleryId: string): Promise<void> {
  // Mark as processing
  await prisma.photoAnalysis.upsert({
    where: { photoId },
    create: { photoId, galleryId, status: "PROCESSING" },
    update: { status: "PROCESSING", errorMessage: null },
  })

  try {
    // Fetch the thumbnail (smaller payload)
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { thumbnailUrl: true, s3Key: true, mimeType: true },
    })

    if (!photo) {
      throw new PhotoAnalysisError("Photo not found", "IMAGE_ERROR")
    }

    const imageUrl = photo.thumbnailUrl || getS3Url(photo.s3Key)
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new PhotoAnalysisError(`Failed to fetch image: ${response.status}`, "IMAGE_ERROR")
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString("base64")
    const mimeType = photo.mimeType.startsWith("image/") ? photo.mimeType : "image/jpeg"

    // Call Gemini Vision
    const rawResponse = await analyzePhotoWithGemini(base64, mimeType, PHOTO_ANALYSIS_PROMPT)

    // Parse JSON response - strip markdown fencing if present
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

    // Extract flat search tags from structured data
    const searchTags = extractSearchTags(analysisResult)

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
        faceData: JSON.parse(JSON.stringify(analysisResult.people || [])) as Prisma.InputJsonValue,
        faceCount: analysisResult.people?.length || 0,
        analyzedAt: new Date(),
      },
      update: {
        status: "COMPLETED",
        description: analysisResult.description,
        analysisData: JSON.parse(JSON.stringify(analysisResult)) as Prisma.InputJsonValue,
        searchTags,
        faceData: JSON.parse(JSON.stringify(analysisResult.people || [])) as Prisma.InputJsonValue,
        faceCount: analysisResult.people?.length || 0,
        analyzedAt: new Date(),
        errorMessage: null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    // Increment retry count and mark as failed
    await prisma.photoAnalysis.upsert({
      where: { photoId },
      create: {
        photoId,
        galleryId,
        status: "FAILED",
        errorMessage: message,
        retryCount: 1,
      },
      update: {
        status: "FAILED",
        errorMessage: message,
        retryCount: { increment: 1 },
      },
    })
  }
}

function extractSearchTags(result: PhotoAnalysisResult): string[] {
  const tags = new Set<string>()

  // Add explicit tags
  if (result.tags) {
    for (const tag of result.tags) {
      tags.add(tag.toLowerCase().trim())
    }
  }

  // Add activities
  if (result.activities) {
    for (const activity of result.activities) {
      tags.add(activity.toLowerCase().trim())
    }
  }

  // Add objects
  if (result.objects) {
    for (const obj of result.objects) {
      tags.add(obj.toLowerCase().trim())
    }
  }

  // Add scene and mood
  if (result.scene) tags.add(result.scene.toLowerCase().trim())
  if (result.mood) tags.add(result.mood.toLowerCase().trim())
  if (result.composition) tags.add(result.composition.toLowerCase().trim())

  // Add people roles
  if (result.people) {
    for (const person of result.people) {
      if (person.role) tags.add(person.role.toLowerCase().trim())
      if (person.expression) tags.add(person.expression.toLowerCase().trim())
      if (person.ageRange) tags.add(person.ageRange.toLowerCase().trim())
    }
  }

  return Array.from(tags).filter(Boolean)
}

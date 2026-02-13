/**
 * One-time preparation script for the demo gallery.
 *
 * Reads photos from a local directory, uploads to S3, runs AI analysis
 * (Gemini Vision + Rekognition), and exports a fixture JSON that the
 * runtime seeder uses to create per-user demo data.
 *
 * Usage:
 *   npx tsx scripts/prepare-demo-gallery.ts ./path/to/photos
 *
 * To get photos from Slack #hb_photos:
 *   1. Open the channel in Slack web
 *   2. Click the channel name → Files tab
 *   3. Download images into a local folder
 *   4. Run this script pointing to that folder
 *
 * Prerequisites:
 *   - .env.local with AWS + GEMINI credentials
 *   - A directory of JPEG/PNG images
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import {
  RekognitionClient,
  DetectFacesCommand,
  type FaceDetail,
} from "@aws-sdk/client-rekognition"
import { GoogleGenAI, createPartFromBase64 } from "@google/genai"
import sharp from "sharp"
import crypto from "crypto"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Config checks
// ---------------------------------------------------------------------------
const INPUT_DIR = process.argv[2]
if (!INPUT_DIR) {
  console.error("Usage: npx tsx scripts/prepare-demo-gallery.ts <photos-directory>")
  process.exit(1)
}

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN // Optional: for Slack download mode

const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET_NAME",
  "GEMINI_API_KEY",
]
for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`Missing required env var: ${v}`)
    process.exit(1)
  }
}

const BUCKET = process.env.AWS_S3_BUCKET_NAME!
const REGION = process.env.AWS_REGION!
const MAX_PHOTOS = 40
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const rekognition = new RekognitionClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CVDetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
  ageRange?: { low: number; high: number }
  emotions?: Array<{ type: string; confidence: number }>
}

interface PersonFace {
  faceId: string
  appearance: string
  role: string | null
  expression: string
  ageRange: string
  position: { x: number; y: number; width: number; height: number }
  confidence?: number
  detectionSource?: "rekognition" | "llm"
}

interface PhotoAnalysisResult {
  description: string
  people: PersonFace[]
  activities: string[]
  objects: string[]
  scene: string
  mood: string
  composition: string
  tags: string[]
}

interface PhotoFixture {
  templateId: string
  seedS3Key: string
  seedThumbnailKey: string
  filename: string
  width: number
  height: number
  fileSize: number
  mimeType: string
  order: number
  analysis: {
    description: string
    analysisData: PhotoAnalysisResult
    searchTags: string[]
    faceData: PersonFace[]
    faceCount: number
  }
}

interface PersonClusterFixture {
  templatePhotoIds: string[]
  name: string | null
  role: string | null
  description: string
  faceDescription: string
}

interface DemoFixture {
  contact: {
    firstName: string
    lastName: string
    email: string
    type: string
    tags: string[]
  }
  project: {
    name: string
    projectType: string
    status: string
    totalPrice: string
    tags: string[]
    eventDateOffsetDays: number
    bookedAtOffsetDays: number
  }
  gallery: {
    title: string
    theme: string
    gridStyle: string
    aiSearchEnabled: boolean
    analysisProgress: number
    isPublic: boolean
    allowDownload: boolean
  }
  photos: PhotoFixture[]
  personClusters: PersonClusterFixture[]
}

// ---------------------------------------------------------------------------
// Upload to S3
// ---------------------------------------------------------------------------
async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )
}

// ---------------------------------------------------------------------------
// Step 4: Face detection via Rekognition
// ---------------------------------------------------------------------------
async function detectFaces(imageBuffer: Buffer): Promise<CVDetectedFace[]> {
  try {
    const res = await rekognition.send(
      new DetectFacesCommand({
        Image: { Bytes: imageBuffer },
        Attributes: ["ALL"],
      })
    )

    return (res.FaceDetails || [])
      .filter((f) => (f.Confidence ?? 0) >= 70)
      .map((f: FaceDetail) => ({
        boundingBox: {
          x: f.BoundingBox?.Left ?? 0,
          y: f.BoundingBox?.Top ?? 0,
          width: f.BoundingBox?.Width ?? 0,
          height: f.BoundingBox?.Height ?? 0,
        },
        confidence: f.Confidence ?? 0,
        ageRange: f.AgeRange
          ? { low: f.AgeRange.Low ?? 0, high: f.AgeRange.High ?? 100 }
          : undefined,
        emotions: (f.Emotions || []).map((e) => ({
          type: e.Type ?? "UNKNOWN",
          confidence: e.Confidence ?? 0,
        })),
      }))
  } catch (error) {
    console.warn(
      `  CV face detection failed:`,
      error instanceof Error ? error.message : error
    )
    return []
  }
}

// ---------------------------------------------------------------------------
// Step 5: Gemini Vision analysis
// ---------------------------------------------------------------------------
function buildHybridPrompt(cvFaces: CVDetectedFace[]): string {
  const faceLines = cvFaces.map((f, i) => {
    const age = ageRangeToLabel(f.ageRange)
    const emotion = topEmotion(f.emotions)
    const box = f.boundingBox
    return `  Face ${i + 1}: position (x=${box.x.toFixed(3)}, y=${box.y.toFixed(3)}, w=${box.width.toFixed(3)}, h=${box.height.toFixed(3)}), age ~${age}, expression ~${emotion}`
  })

  const facesSection =
    cvFaces.length > 0
      ? `
I have already detected ${cvFaces.length} face(s) in this image using computer vision:
${faceLines.join("\n")}

For the "people" array, annotate EACH detected face with appearance, role, and expression. Use the provided face indices (face_1, face_2, etc.) as faceId. Keep the position values I provided — do NOT change them.`
      : `
No faces were detected by computer vision. If you see people in the image, include them in the "people" array with your best estimated position. Otherwise, return an empty "people" array.`

  return `Analyze this photograph and return a JSON object with the following structure. This is a corporate event photo — focus on what would make this photo searchable.
${facesSection}

Return ONLY valid JSON, no markdown fencing:

{
  "description": "A rich natural language description (2-4 sentences).",
  "people": [
    {
      "faceId": "face_1",
      "appearance": "Brief physical description",
      "role": "speaker|organizer|attendee|photographer|staff|null",
      "expression": "smiling|laughing|serious|neutral|etc",
      "ageRange": "child|teen|young_adult|adult|senior",
      "position": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 }
    }
  ],
  "activities": ["presenting", "networking", "applauding", "etc"],
  "objects": ["microphone", "podium", "laptop", "etc"],
  "scene": "conference|meeting|reception|stage|outdoor|indoor|etc",
  "mood": "professional|celebratory|focused|casual|energetic|formal",
  "composition": "close_up|medium_shot|wide_shot|group_shot|portrait|candid",
  "tags": ["keyword1", "keyword2", "..."]
}

Rules for "tags": Include 10-30 searchable keywords including synonyms.
Rules for "description": Be specific and vivid. Mention people count, clothing, setting.`
}

function ageRangeToLabel(age?: { low: number; high: number }): string {
  if (!age) return "unknown"
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

async function analyzeWithGemini(
  base64: string,
  mimeType: string,
  prompt: string
): Promise<PhotoAnalysisResult> {
  const imagePart = createPartFromBase64(base64, mimeType)

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [imagePart, { text: prompt }],
      },
    ],
    config: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  })

  const text = result.text
  if (!text) throw new Error("Empty Gemini response")

  const jsonStr = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim()

  return JSON.parse(jsonStr) as PhotoAnalysisResult
}

// ---------------------------------------------------------------------------
// Step 6: Merge CV + LLM faces
// ---------------------------------------------------------------------------
function mergeFaces(
  cvFaces: CVDetectedFace[],
  llmPeople: PersonFace[]
): PersonFace[] {
  if (cvFaces.length === 0) {
    return llmPeople.map((p) => ({
      ...p,
      detectionSource: "llm" as const,
    }))
  }

  return cvFaces.map((cv, i) => {
    const faceId = `face_${i + 1}`
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
    }
  })
}

// ---------------------------------------------------------------------------
// Step 7: Extract search tags
// ---------------------------------------------------------------------------
function extractSearchTags(
  result: PhotoAnalysisResult,
  people: PersonFace[]
): string[] {
  const tags = new Set<string>()

  for (const tag of result.tags || []) tags.add(tag.toLowerCase().trim())
  for (const a of result.activities || []) tags.add(a.toLowerCase().trim())
  for (const o of result.objects || []) tags.add(o.toLowerCase().trim())
  if (result.scene) tags.add(result.scene.toLowerCase().trim())
  if (result.mood) tags.add(result.mood.toLowerCase().trim())
  if (result.composition) tags.add(result.composition.toLowerCase().trim())

  for (const person of people) {
    if (person.role) tags.add(person.role.toLowerCase().trim())
    if (person.expression) tags.add(person.expression.toLowerCase().trim())
    if (person.ageRange) tags.add(person.ageRange.toLowerCase().trim())
  }

  return Array.from(tags).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Step 8: Person clustering (role-based for fixture, no Rekognition IDs)
// ---------------------------------------------------------------------------
function clusterByRole(
  photos: PhotoFixture[]
): PersonClusterFixture[] {
  const roleMap = new Map<
    string,
    { templateIds: Set<string>; face: PersonFace }
  >()

  for (const photo of photos) {
    for (const face of photo.analysis.faceData) {
      const role = face.role?.toLowerCase()
      if (!role) continue

      const existing = roleMap.get(role)
      if (existing) {
        existing.templateIds.add(photo.templateId)
      } else {
        roleMap.set(role, {
          templateIds: new Set([photo.templateId]),
          face,
        })
      }
    }
  }

  // Only create clusters for roles appearing in 2+ photos
  return Array.from(roleMap.entries())
    .filter(([, v]) => v.templateIds.size >= 2)
    .map(([role, v]) => ({
      templatePhotoIds: Array.from(v.templateIds),
      name: null,
      role,
      description: v.face.appearance,
      faceDescription: v.face.appearance,
    }))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Demo Gallery Preparation Script ===\n")

  const inputDir = path.resolve(INPUT_DIR)
  if (!fs.existsSync(inputDir)) {
    console.error(`Directory not found: ${inputDir}`)
    process.exit(1)
  }

  // Read image files from the directory
  const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"])
  const allFiles = fs.readdirSync(inputDir)
    .filter((f) => imageExts.has(path.extname(f).toLowerCase()))
    .sort()
    .slice(0, MAX_PHOTOS)

  console.log(`Found ${allFiles.length} images in ${inputDir}`)

  if (allFiles.length === 0) {
    console.error("No image files found!")
    process.exit(1)
  }

  // Process each photo
  const photoFixtures: PhotoFixture[] = []

  for (let batchStart = 0; batchStart < allFiles.length; batchStart += BATCH_SIZE) {
    const batch = allFiles.slice(batchStart, batchStart + BATCH_SIZE)
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(allFiles.length / BATCH_SIZE)

    console.log(`\n--- Batch ${batchNum}/${totalBatches} ---`)

    const results = await Promise.allSettled(
      batch.map(async (filename, batchIndex) => {
        const index = batchStart + batchIndex
        const templateId = `photo_${String(index + 1).padStart(3, "0")}`
        const uuid = crypto.randomUUID()
        const ext = "jpg"

        console.log(`  [${index + 1}/${allFiles.length}] ${filename}`)

        // Read from local directory
        const filePath = path.join(inputDir, filename)
        const originalBuffer = fs.readFileSync(filePath)
        console.log(
          `    Read (${Math.round(originalBuffer.length / 1024)} KB)`
        )

        // Get dimensions
        const metadata = await sharp(originalBuffer).metadata()
        const width = metadata.width ?? 1920
        const height = metadata.height ?? 1280

        // Convert to JPEG and get final buffer
        const jpegBuffer = await sharp(originalBuffer)
          .jpeg({ quality: 90 })
          .toBuffer()

        // Generate thumbnail (600px wide)
        const thumbnailBuffer = await sharp(originalBuffer)
          .resize(600, null, { withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()

        // Upload to S3
        const s3Key = `seed/demo-gallery/${uuid}.${ext}`
        const thumbnailKey = `seed/demo-gallery/thumbnails/${uuid}.${ext}`

        await uploadToS3(jpegBuffer, s3Key, "image/jpeg")
        await uploadToS3(thumbnailBuffer, thumbnailKey, "image/jpeg")
        console.log(`    Uploaded to S3: ${s3Key}`)

        // CV face detection
        const cvFaces = await detectFaces(jpegBuffer)
        console.log(`    Detected ${cvFaces.length} faces`)

        // Gemini Vision analysis
        const prompt = buildHybridPrompt(cvFaces)
        const base64 = jpegBuffer.toString("base64")
        const analysisResult = await analyzeWithGemini(
          base64,
          "image/jpeg",
          prompt
        )

        // Merge faces
        const people = mergeFaces(cvFaces, analysisResult.people || [])
        const searchTags = extractSearchTags(analysisResult, people)

        console.log(
          `    Analysis: "${analysisResult.description.substring(0, 80)}..."`
        )

        return {
          templateId,
          seedS3Key: s3Key,
          seedThumbnailKey: thumbnailKey,
          filename: `HB_event_${String(index + 1).padStart(3, "0")}.jpg`,
          width,
          height,
          fileSize: jpegBuffer.length,
          mimeType: "image/jpeg",
          order: index,
          analysis: {
            description: analysisResult.description,
            analysisData: { ...analysisResult, people },
            searchTags,
            faceData: people,
            faceCount: people.length,
          },
        } satisfies PhotoFixture
      })
    )

    for (const result of results) {
      if (result.status === "fulfilled") {
        photoFixtures.push(result.value)
      } else {
        console.error(`  FAILED:`, result.reason)
      }
    }

    // Delay between batches
    if (batchStart + BATCH_SIZE < allFiles.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  console.log(`\nProcessed ${photoFixtures.length}/${allFiles.length} photos`)

  if (photoFixtures.length === 0) {
    console.error("No photos processed successfully!")
    process.exit(1)
  }

  // Sort by order
  photoFixtures.sort((a, b) => a.order - b.order)

  // Step 3: Cluster persons by role
  const personClusters = clusterByRole(photoFixtures)
  console.log(`Created ${personClusters.length} person clusters`)

  // Step 4: Build and write fixture
  const fixture: DemoFixture = {
    contact: {
      firstName: "Masha",
      lastName: "Popov",
      email: "masha.popov@example.com",
      type: "CLIENT",
      tags: ["corporate", "demo"],
    },
    project: {
      name: "HoneyBook Corporate Events",
      projectType: "CORPORATE",
      status: "DELIVERED",
      totalPrice: "4500.00",
      tags: ["corporate", "demo"],
      eventDateOffsetDays: -14,
      bookedAtOffsetDays: -60,
    },
    gallery: {
      title: "HoneyBook Corporate Events",
      theme: "classic",
      gridStyle: "masonry",
      aiSearchEnabled: true,
      analysisProgress: 100,
      isPublic: false,
      allowDownload: true,
    },
    photos: photoFixtures,
    personClusters,
  }

  const outPath = path.resolve(
    __dirname,
    "../prisma/fixtures/demo-gallery.json"
  )
  fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2))
  console.log(`\nFixture written to ${outPath}`)
  console.log(`  Photos: ${fixture.photos.length}`)
  console.log(`  Clusters: ${fixture.personClusters.length}`)
  console.log("\nDone!")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})

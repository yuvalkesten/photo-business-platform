/**
 * Integration test: Rekognition face detection, indexing, and matching
 *
 * Uses two real photos:
 * - solo-girl.jpeg: a single girl in ski gear (green Club Med vest, pink goggles)
 * - family-group.jpeg: a family of 5 lying in the snow, including the same girl
 *
 * Verifies that after detecting + indexing faces from both images into a
 * Rekognition collection, searching for the solo girl's face returns a match
 * from the group photo.
 *
 * Requires AWS credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).
 * Skip with: SKIP_INTEGRATION=1 npm run test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import fs from "fs"
import path from "path"
import sharp from "sharp"
import {
  detectFaces,
  createCollection,
  deleteCollection,
  indexFace,
  searchFacesById,
} from "@/lib/aws/rekognition"

const FIXTURES_DIR = path.join(__dirname, "fixtures")
const COLLECTION_ID = `test-face-matching-${Date.now()}`
const SIMILARITY_THRESHOLD = 70

// Skip if no AWS credentials or SKIP_INTEGRATION is set
const shouldSkip =
  process.env.SKIP_INTEGRATION === "1" ||
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_REGION

describe.skipIf(shouldSkip)("Rekognition face matching (integration)", () => {
  let soloImageBuffer: Buffer
  let groupImageBuffer: Buffer

  beforeAll(async () => {
    soloImageBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "solo-girl.jpeg"))
    groupImageBuffer = fs.readFileSync(path.join(FIXTURES_DIR, "family-group.jpeg"))

    // Create a fresh collection for this test run
    await createCollection(COLLECTION_ID)
  })

  afterAll(async () => {
    // Clean up the Rekognition collection
    try {
      await deleteCollection(COLLECTION_ID)
    } catch {
      // ignore cleanup errors
    }
  })

  it("detects exactly 1 face in the solo photo", async () => {
    const faces = await detectFaces(soloImageBuffer)
    expect(faces.length).toBe(1)
    expect(faces[0].confidence).toBeGreaterThan(90)
    expect(faces[0].boundingBox.width).toBeGreaterThan(0)
  })

  it("detects multiple faces in the group photo", async () => {
    const faces = await detectFaces(groupImageBuffer)
    expect(faces.length).toBeGreaterThanOrEqual(4)
  })

  it("finds the solo girl in the group photo via face search", async () => {
    // Step 1: Detect face in solo photo
    const soloFaces = await detectFaces(soloImageBuffer)
    expect(soloFaces.length).toBe(1)
    const soloFace = soloFaces[0]

    // Step 2: Crop the solo face and index it
    const soloCrop = await cropFace(soloImageBuffer, soloFace.boundingBox)
    const soloIndexed = await indexFace(COLLECTION_ID, soloCrop, "solo_photo_face_0")
    expect(soloIndexed).not.toBeNull()
    const soloRekId = soloIndexed!.faceId

    // Step 3: Detect faces in group photo
    const groupFaces = await detectFaces(groupImageBuffer)
    expect(groupFaces.length).toBeGreaterThanOrEqual(4)

    // Step 4: Crop and index each group face
    const groupRekIds: string[] = []
    for (let i = 0; i < groupFaces.length; i++) {
      const crop = await cropFace(groupImageBuffer, groupFaces[i].boundingBox)
      const indexed = await indexFace(COLLECTION_ID, crop, `group_photo_face_${i}`)
      if (indexed) {
        groupRekIds.push(indexed.faceId)
      }
    }
    expect(groupRekIds.length).toBeGreaterThanOrEqual(4)

    // Step 5: Search for the solo girl's face in the collection
    const matches = await searchFacesById(
      COLLECTION_ID,
      soloRekId,
      SIMILARITY_THRESHOLD
    )

    // We expect at least one match from the group photo
    const groupMatches = matches.filter((m) => groupRekIds.includes(m.faceId))
    expect(groupMatches.length).toBeGreaterThanOrEqual(1)

    // The best match should have high similarity
    const bestMatch = groupMatches.sort((a, b) => b.similarity - a.similarity)[0]
    expect(bestMatch.similarity).toBeGreaterThan(80)

    console.log(
      `Solo girl matched in group photo with ${bestMatch.similarity.toFixed(1)}% similarity`
    )
  }, 30000) // 30s timeout for API calls
})

/**
 * Crop a face from an image buffer using normalized bounding box coords.
 * Adds 40% padding (same as production code in index-faces.ts).
 */
async function cropFace(
  imageBuffer: Buffer,
  box: { x: number; y: number; width: number; height: number }
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata()
  const imgWidth = metadata.width ?? 1
  const imgHeight = metadata.height ?? 1

  const padding = 0.4
  const padW = box.width * padding
  const padH = box.height * padding

  const left = Math.max(0, Math.round((box.x - padW) * imgWidth))
  const top = Math.max(0, Math.round((box.y - padH) * imgHeight))
  const right = Math.min(imgWidth, Math.round((box.x + box.width + padW) * imgWidth))
  const bottom = Math.min(imgHeight, Math.round((box.y + box.height + padH) * imgHeight))

  return sharp(imageBuffer)
    .extract({ left, top, width: right - left, height: bottom - top })
    .jpeg({ quality: 85 })
    .toBuffer()
}

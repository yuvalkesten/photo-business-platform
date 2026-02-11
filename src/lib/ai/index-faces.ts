import sharp from "sharp"
import { prisma } from "@/lib/db"
import {
  createCollection,
  indexFace,
  type IndexedFace,
} from "@/lib/aws/rekognition"
import type { CVDetectedFace } from "./types"

const FACE_PADDING = 0.4 // 40% padding around bounding box

interface IndexedFaceResult {
  cvFaceIndex: number
  rekognitionFaceId: string
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
}

export async function ensureCollection(galleryId: string): Promise<string> {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { rekognitionCollectionId: true },
  })

  if (gallery?.rekognitionCollectionId) {
    return gallery.rekognitionCollectionId
  }

  const collectionId = `gallery-${galleryId}`
  await createCollection(collectionId)

  await prisma.gallery.update({
    where: { id: galleryId },
    data: { rekognitionCollectionId: collectionId },
  })

  return collectionId
}

export async function indexDetectedFaces(
  collectionId: string,
  imageBuffer: Buffer,
  photoId: string,
  detectedFaces: CVDetectedFace[]
): Promise<IndexedFaceResult[]> {
  const metadata = await sharp(imageBuffer).metadata()
  const imgWidth = metadata.width ?? 1
  const imgHeight = metadata.height ?? 1

  const results: IndexedFaceResult[] = []

  for (let i = 0; i < detectedFaces.length; i++) {
    const face = detectedFaces[i]
    const cropped = await cropFace(
      imageBuffer,
      face.boundingBox,
      imgWidth,
      imgHeight
    )

    if (!cropped) continue

    const externalId = `${photoId}_face_${i}`

    try {
      const indexed: IndexedFace | null = await indexFace(
        collectionId,
        cropped,
        externalId
      )

      if (indexed) {
        results.push({
          cvFaceIndex: i,
          rekognitionFaceId: indexed.faceId,
          boundingBox: face.boundingBox,
          confidence: indexed.confidence,
        })
      }
    } catch (error) {
      // Non-fatal: face may be too small or blurry for indexing
      console.warn(
        `Failed to index face ${i} for photo ${photoId}:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  return results
}

async function cropFace(
  imageBuffer: Buffer,
  box: { x: number; y: number; width: number; height: number },
  imgWidth: number,
  imgHeight: number
): Promise<Buffer | null> {
  // Convert normalized coords to pixels with padding
  const padW = box.width * FACE_PADDING
  const padH = box.height * FACE_PADDING

  const left = Math.max(0, Math.round((box.x - padW) * imgWidth))
  const top = Math.max(0, Math.round((box.y - padH) * imgHeight))
  const right = Math.min(
    imgWidth,
    Math.round((box.x + box.width + padW) * imgWidth)
  )
  const bottom = Math.min(
    imgHeight,
    Math.round((box.y + box.height + padH) * imgHeight)
  )

  const cropWidth = right - left
  const cropHeight = bottom - top

  if (cropWidth < 20 || cropHeight < 20) return null

  try {
    return await sharp(imageBuffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch {
    return null
  }
}

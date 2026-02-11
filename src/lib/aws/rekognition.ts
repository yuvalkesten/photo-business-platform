import {
  RekognitionClient,
  DetectFacesCommand,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  IndexFacesCommand,
  SearchFacesCommand,
  DeleteFacesCommand,
  type FaceDetail,
  type FaceRecord,
  type BoundingBox,
} from "@aws-sdk/client-rekognition"

const client = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
  ageRange?: { low: number; high: number }
  emotions?: Array<{ type: string; confidence: number }>
  landmarks?: Array<{ type: string; x: number; y: number }>
}

export interface IndexedFace {
  faceId: string
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
}

export interface FaceMatch {
  faceId: string
  similarity: number
}

function normalizeBoundingBox(box: BoundingBox): {
  x: number
  y: number
  width: number
  height: number
} {
  return {
    x: box.Left ?? 0,
    y: box.Top ?? 0,
    width: box.Width ?? 0,
    height: box.Height ?? 0,
  }
}

function mapFaceDetail(face: FaceDetail): DetectedFace {
  return {
    boundingBox: normalizeBoundingBox(face.BoundingBox!),
    confidence: face.Confidence ?? 0,
    ageRange:
      face.AgeRange?.Low != null && face.AgeRange?.High != null
        ? { low: face.AgeRange.Low, high: face.AgeRange.High }
        : undefined,
    emotions: face.Emotions?.map((e) => ({
      type: e.Type ?? "UNKNOWN",
      confidence: e.Confidence ?? 0,
    })),
    landmarks: face.Landmarks?.map((l) => ({
      type: l.Type ?? "UNKNOWN",
      x: l.X ?? 0,
      y: l.Y ?? 0,
    })),
  }
}

export async function detectFaces(
  imageBytes: Buffer,
  minConfidence: number = 70
): Promise<DetectedFace[]> {
  const command = new DetectFacesCommand({
    Image: { Bytes: imageBytes },
    Attributes: ["ALL"],
  })

  const response = await client.send(command)
  const faces = response.FaceDetails ?? []

  return faces
    .filter((f) => (f.Confidence ?? 0) >= minConfidence)
    .map(mapFaceDetail)
}

export async function createCollection(collectionId: string): Promise<void> {
  const command = new CreateCollectionCommand({ CollectionId: collectionId })
  await client.send(command)
}

export async function deleteCollection(collectionId: string): Promise<void> {
  try {
    const command = new DeleteCollectionCommand({
      CollectionId: collectionId,
    })
    await client.send(command)
  } catch (error: unknown) {
    // Ignore if collection doesn't exist
    if (
      error instanceof Error &&
      error.name === "ResourceNotFoundException"
    ) {
      return
    }
    throw error
  }
}

export async function indexFace(
  collectionId: string,
  imageBytes: Buffer,
  externalImageId: string
): Promise<IndexedFace | null> {
  const command = new IndexFacesCommand({
    CollectionId: collectionId,
    Image: { Bytes: imageBytes },
    ExternalImageId: externalImageId,
    MaxFaces: 1,
    DetectionAttributes: ["DEFAULT"],
  })

  const response = await client.send(command)
  const record: FaceRecord | undefined = response.FaceRecords?.[0]

  if (!record?.Face?.FaceId || !record.Face.BoundingBox) {
    return null
  }

  return {
    faceId: record.Face.FaceId,
    boundingBox: normalizeBoundingBox(record.Face.BoundingBox),
    confidence: record.Face.Confidence ?? 0,
  }
}

export async function searchFacesById(
  collectionId: string,
  faceId: string,
  similarityThreshold: number = 80,
  maxFaces: number = 100
): Promise<FaceMatch[]> {
  const command = new SearchFacesCommand({
    CollectionId: collectionId,
    FaceId: faceId,
    FaceMatchThreshold: similarityThreshold,
    MaxFaces: maxFaces,
  })

  const response = await client.send(command)
  return (response.FaceMatches ?? [])
    .filter((m) => m.Face?.FaceId)
    .map((m) => ({
      faceId: m.Face!.FaceId!,
      similarity: m.Similarity ?? 0,
    }))
}

export async function deleteFaces(
  collectionId: string,
  faceIds: string[]
): Promise<void> {
  if (faceIds.length === 0) return

  const command = new DeleteFacesCommand({
    CollectionId: collectionId,
    FaceIds: faceIds,
  })
  await client.send(command)
}

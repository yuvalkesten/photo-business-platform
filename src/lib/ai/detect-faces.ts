import { detectFaces as rekognitionDetectFaces } from "@/lib/aws/rekognition"
import type { CVDetectedFace } from "./types"
import { PhotoAnalysisError } from "./types"

const MIN_CONFIDENCE = 70

export async function detectFacesInImage(
  imageBuffer: Buffer
): Promise<CVDetectedFace[]> {
  try {
    const rawFaces = await rekognitionDetectFaces(imageBuffer, MIN_CONFIDENCE)

    return rawFaces.map((face) => ({
      boundingBox: face.boundingBox,
      confidence: face.confidence,
      ageRange: face.ageRange,
      emotions: face.emotions,
    }))
  } catch (error) {
    if (error instanceof Error && error.message.includes("throttl")) {
      throw new PhotoAnalysisError(
        "Rekognition rate limit exceeded",
        "RATE_LIMIT",
        error
      )
    }
    throw new PhotoAnalysisError(
      `Face detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "API_ERROR",
      error instanceof Error ? error : undefined
    )
  }
}

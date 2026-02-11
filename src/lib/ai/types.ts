export interface PersonFace {
  faceId: string
  appearance: string
  role: string | null
  expression: string
  ageRange: string
  position: { x: number; y: number; width: number; height: number }
  personClusterId?: string
}

export interface PhotoAnalysisResult {
  description: string
  people: PersonFace[]
  activities: string[]
  objects: string[]
  scene: string
  mood: string
  composition: string
  tags: string[]
}

export type PhotoAnalysisErrorCode =
  | "API_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "IMAGE_ERROR"

export class PhotoAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: PhotoAnalysisErrorCode,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = "PhotoAnalysisError"
  }
}

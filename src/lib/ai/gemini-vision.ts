import { GoogleGenAI, createPartFromBase64 } from "@google/genai"
import { PhotoAnalysisError } from "./types"

let genAI: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new PhotoAnalysisError(
        "GEMINI_API_KEY environment variable is not set",
        "API_ERROR"
      )
    }
    genAI = new GoogleGenAI({ apiKey })
  }
  return genAI
}

export async function analyzePhotoWithGemini(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  timeout: number = 60000
): Promise<string> {
  const ai = getGenAI()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AbortError")), timeout)
    })

    const imagePart = createPartFromBase64(imageBase64, mimeType)

    const result = await Promise.race([
      ai.models.generateContent({
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
      }),
      timeoutPromise,
    ])

    const text = result.text
    if (!text) {
      throw new PhotoAnalysisError("Empty response from Gemini API", "API_ERROR")
    }

    return text
  } catch (error) {
    if (error instanceof PhotoAnalysisError) throw error

    if (error instanceof Error) {
      if (error.message === "AbortError") {
        throw new PhotoAnalysisError(
          `Request timed out after ${timeout}ms`,
          "TIMEOUT",
          error
        )
      }
      if (error.message.includes("429") || error.message.includes("quota")) {
        throw new PhotoAnalysisError(
          "Gemini API rate limit exceeded",
          "RATE_LIMIT",
          error
        )
      }
      throw new PhotoAnalysisError(
        `Gemini API error: ${error.message}`,
        "API_ERROR",
        error
      )
    }

    throw new PhotoAnalysisError("Unknown error calling Gemini API", "API_ERROR")
  }
}

export async function rankWithGemini(
  prompt: string,
  timeout: number = 30000
): Promise<string> {
  const ai = getGenAI()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AbortError")), timeout)
    })

    const result = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
      timeoutPromise,
    ])

    const text = result.text
    if (!text) {
      throw new PhotoAnalysisError("Empty response from Gemini API", "API_ERROR")
    }

    return text
  } catch (error) {
    if (error instanceof PhotoAnalysisError) throw error

    if (error instanceof Error) {
      if (error.message === "AbortError") {
        throw new PhotoAnalysisError(`Request timed out after ${timeout}ms`, "TIMEOUT", error)
      }
      throw new PhotoAnalysisError(`Gemini API error: ${error.message}`, "API_ERROR", error)
    }

    throw new PhotoAnalysisError("Unknown error calling Gemini API", "API_ERROR")
  }
}

export function resetGeminiVisionClient(): void {
  genAI = null
}

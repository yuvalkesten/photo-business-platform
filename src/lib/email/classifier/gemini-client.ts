/**
 * Gemini API Client for Email Classification
 *
 * Wrapper around the Google Generative AI SDK for classifying emails.
 * Uses gemini-2.0-flash for fast, cost-effective classification.
 */

import { GoogleGenAI } from "@google/genai";
import { ClassificationError } from "./types";

// Singleton instance
let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ClassificationError(
        "GEMINI_API_KEY environment variable is not set",
        "API_ERROR"
      );
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

/**
 * Send a prompt to Gemini and get a text response.
 *
 * @param prompt - The prompt to send
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns The text response from Gemini
 * @throws ClassificationError on API errors
 */
export async function classifyWithGemini(
  prompt: string,
  timeout: number = 30000
): Promise<string> {
  const ai = getGenAI();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("AbortError"));
      }, timeout);
    });

    // Race between API call and timeout
    const result = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          temperature: 0.1, // Low temperature for consistent classification
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      }),
      timeoutPromise,
    ]);

    // Extract text from response
    const text = result.text;

    if (!text) {
      throw new ClassificationError(
        "Empty response from Gemini API",
        "API_ERROR"
      );
    }

    return text;
  } catch (error) {
    if (error instanceof ClassificationError) {
      throw error;
    }

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === "AbortError") {
        throw new ClassificationError(
          `Request timed out after ${timeout}ms`,
          "TIMEOUT",
          error
        );
      }

      if (error.message.includes("429") || error.message.includes("quota")) {
        throw new ClassificationError(
          "Gemini API rate limit exceeded",
          "RATE_LIMIT",
          error
        );
      }

      throw new ClassificationError(
        `Gemini API error: ${error.message}`,
        "API_ERROR",
        error
      );
    }

    throw new ClassificationError(
      "Unknown error calling Gemini API",
      "API_ERROR"
    );
  }
}

/**
 * Reset the client (useful for testing)
 */
export function resetGeminiClient(): void {
  genAI = null;
}

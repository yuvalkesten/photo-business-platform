/**
 * Instagram DM Classification
 *
 * Classifies Instagram DMs using Gemini AI.
 * Similar to email classification but adapted for shorter DM format.
 */

import { classifyWithGemini } from "../email/classifier/gemini-client";
import {
  DMClassificationResult,
  DMContent,
  DMClassifierOptions,
  MessageClassificationType,
  DMSenderInfo,
  DMDateInfo,
} from "./classifier-types";
import { ClassificationError } from "../email/classifier/types";

// Valid classification types for DMs
const VALID_CLASSIFICATIONS: MessageClassificationType[] = [
  "INQUIRY",
  "URGENT_REQUEST",
  "OTHER",
];

// Valid project types (matching Prisma enum)
const VALID_PROJECT_TYPES = [
  "WEDDING",
  "ENGAGEMENT",
  "PORTRAIT",
  "FAMILY",
  "NEWBORN",
  "CORPORATE",
  "EVENT",
  "COMMERCIAL",
  "REAL_ESTATE",
  "OTHER",
];

/**
 * Classify an Instagram DM using Gemini AI.
 *
 * @param message - The DM content to classify
 * @param options - Optional configuration
 * @returns Classification result with extracted data
 */
export async function classifyInstagramMessage(
  message: DMContent,
  options: DMClassifierOptions = {}
): Promise<DMClassificationResult> {
  const { timeout = 30000 } = options;

  // Build the prompt
  const prompt = buildDMClassificationPrompt(message);

  // Call Gemini API
  const response = await classifyWithGemini(prompt, timeout);

  // Parse and validate the response
  const result = parseClassificationResponse(response);

  // Validate and sanitize
  return validateClassificationResult(result, message);
}

/**
 * Build the classification prompt for an Instagram DM.
 */
function buildDMClassificationPrompt(message: DMContent): string {
  const senderInfo = message.senderUsername
    ? `@${message.senderUsername}${message.senderName ? ` (${message.senderName})` : ""}`
    : `User ID: ${message.senderId}`;

  return `You are a message classifier for a photography business. Analyze the following Instagram DM and return a JSON response with classification and extracted data.

INSTAGRAM DM:
==============
From: ${senderInfo}
Date: ${message.timestamp.toISOString()}
Message: ${message.text}
Has Attachments: ${message.hasAttachments}
==============

CLASSIFICATION CATEGORIES:
1. INQUIRY - New business inquiry from potential client asking about photography services (weddings, portraits, events, pricing, availability, booking)
2. URGENT_REQUEST - Time-sensitive request requiring immediate attention (deadline changes, urgent questions, same-day requests)
3. OTHER - General messages, spam, or unrelated content

CLASSIFICATION RULES:
- If the message is asking about photography services, pricing, availability, or booking → INQUIRY
- If the message mentions "urgent", "ASAP", "immediately", tight deadlines, or requires quick response → URGENT_REQUEST
- If none of the above apply clearly → OTHER
- Instagram DMs are often informal and brief - still classify based on intent

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown code blocks, just raw JSON):
{
  "classification": "INQUIRY|URGENT_REQUEST|OTHER",
  "confidence": 0.0-1.0,
  "sender": {
    "instagramId": "${message.senderId}",
    "username": "${message.senderUsername || "null"}",
    "name": "extracted name from message or null"
  },
  "dates": {
    "eventDate": "YYYY-MM-DD or null (the date of the photography event)",
    "mentionedDates": [{"date": "YYYY-MM-DD", "context": "brief context for this date"}]
  },
  "projectType": "WEDDING|ENGAGEMENT|PORTRAIT|FAMILY|NEWBORN|CORPORATE|EVENT|COMMERCIAL|REAL_ESTATE|OTHER or null",
  "projectReferences": ["any project or event names mentioned"],
  "isUrgent": true or false,
  "urgencyIndicators": ["list of words/phrases indicating urgency found in message"],
  "summary": "1-2 sentence summary of the message content and intent",
  "suggestedAction": "recommended next action (e.g., 'Send pricing info', 'Schedule call', 'Reply with availability')"
}

IMPORTANT:
- For dates, use YYYY-MM-DD format or null if not mentioned
- Set isUrgent to true only if there are clear urgency indicators
- projectType should match one of the enum values or be null
- DMs are often short - extract what you can, use null for missing info
- Be conservative with confidence - 0.7+ only when intent is clear`;
}

/**
 * Parse the JSON response from Gemini.
 */
function parseClassificationResponse(response: string): unknown {
  let jsonString = response.trim();

  // Remove markdown code blocks if present
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.slice(3);
  }

  if (jsonString.endsWith("```")) {
    jsonString = jsonString.slice(0, -3);
  }

  jsonString = jsonString.trim();

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new ClassificationError(
      `Failed to parse Gemini response as JSON: ${jsonString.slice(0, 200)}...`,
      "PARSE_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validate and sanitize the classification result.
 */
function validateClassificationResult(
  raw: unknown,
  message: DMContent
): DMClassificationResult {
  if (!raw || typeof raw !== "object") {
    throw new ClassificationError(
      "Invalid response: expected object",
      "VALIDATION_ERROR"
    );
  }

  const data = raw as Record<string, unknown>;

  return {
    classification: validateClassification(data.classification),
    confidence: validateConfidence(data.confidence),
    sender: validateSender(data.sender, message),
    dates: validateDates(data.dates),
    projectType: validateProjectType(data.projectType),
    projectReferences: validateStringArray(data.projectReferences),
    isUrgent: typeof data.isUrgent === "boolean" ? data.isUrgent : false,
    urgencyIndicators: validateStringArray(data.urgencyIndicators),
    summary:
      typeof data.summary === "string" ? data.summary : "No summary provided",
    suggestedAction:
      typeof data.suggestedAction === "string"
        ? data.suggestedAction
        : "Review message",
  };
}

function validateClassification(value: unknown): MessageClassificationType {
  if (typeof value !== "string") {
    return "OTHER";
  }

  const normalized = value.toUpperCase().trim();

  if (VALID_CLASSIFICATIONS.includes(normalized as MessageClassificationType)) {
    return normalized as MessageClassificationType;
  }

  return "OTHER";
}

function validateConfidence(value: unknown): number {
  if (typeof value !== "number") {
    return 0.5;
  }
  return Math.max(0, Math.min(1, value));
}

function validateSender(value: unknown, message: DMContent): DMSenderInfo {
  const defaults: DMSenderInfo = {
    instagramId: message.senderId,
    username: message.senderUsername || null,
    name: message.senderName || null,
  };

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const data = value as Record<string, unknown>;

  return {
    instagramId: message.senderId,
    username:
      typeof data.username === "string" && data.username !== "null"
        ? data.username
        : defaults.username,
    name:
      typeof data.name === "string" && data.name !== "null"
        ? data.name
        : defaults.name,
  };
}

function validateDates(value: unknown): DMDateInfo {
  const defaults: DMDateInfo = {
    eventDate: null,
    mentionedDates: [],
  };

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const data = value as Record<string, unknown>;

  return {
    eventDate: validateDateString(data.eventDate),
    mentionedDates: validateMentionedDates(data.mentionedDates),
  };
}

function validateDateString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return null;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }

  return value;
}

function validateMentionedDates(
  value: unknown
): Array<{ date: string; context: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => {
      if (!item || typeof item !== "object") return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj.date === "string" &&
        typeof obj.context === "string" &&
        validateDateString(obj.date) !== null
      );
    })
    .map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        date: obj.date as string,
        context: (obj.context as string).slice(0, 200),
      };
    });
}

function validateProjectType(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.toUpperCase().trim();

  if (VALID_PROJECT_TYPES.includes(normalized)) {
    return normalized;
  }

  return null;
}

function validateStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => (item as string).trim());
}

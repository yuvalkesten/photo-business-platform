/**
 * Email Classification
 *
 * Main module for classifying emails using Gemini AI.
 * Takes an email, sends it to Gemini for classification, and returns structured results.
 */

import { classifyWithGemini } from "./gemini-client";
import { buildClassificationPrompt } from "./prompts";
import {
  ClassificationResult,
  EmailContent,
  ClassifierOptions,
  ClassificationError,
  EmailClassificationType,
  SenderInfo,
  FinancialInfo,
  DateInfo,
  ParsedEmailAddress,
} from "./types";

// Valid classification types
const VALID_CLASSIFICATIONS: EmailClassificationType[] = [
  "INQUIRY",
  "URGENT_REQUEST",
  "INVOICE",
  "RECEIPT",
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
 * Classify an email using Gemini AI.
 *
 * @param email - The email content to classify
 * @param options - Optional configuration
 * @returns Classification result with extracted data
 * @throws ClassificationError on API or parsing errors
 */
export async function classifyEmail(
  email: EmailContent,
  options: ClassifierOptions = {}
): Promise<ClassificationResult> {
  const { timeout = 30000 } = options;

  // Build the prompt
  const prompt = buildClassificationPrompt(email);

  // Call Gemini API
  const response = await classifyWithGemini(prompt, timeout);

  // Parse and validate the response
  const result = parseClassificationResponse(response);

  // Validate and sanitize
  return validateClassificationResult(result, email);
}

/**
 * Parse the JSON response from Gemini.
 */
function parseClassificationResponse(response: string): unknown {
  // Strip any markdown formatting if present
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
 * Ensures all required fields are present and valid.
 */
function validateClassificationResult(
  raw: unknown,
  email: EmailContent
): ClassificationResult {
  if (!raw || typeof raw !== "object") {
    throw new ClassificationError(
      "Invalid response: expected object",
      "VALIDATION_ERROR"
    );
  }

  const data = raw as Record<string, unknown>;

  // Validate classification
  const classification = validateClassification(data.classification);

  // Validate confidence
  const confidence = validateConfidence(data.confidence);

  // Validate sender
  const sender = validateSender(data.sender, email.from);

  // Validate financial (can be null)
  const financial = validateFinancial(data.financial);

  // Validate dates
  const dates = validateDates(data.dates);

  // Validate project type
  const projectType = validateProjectType(data.projectType);

  // Validate project references
  const projectReferences = validateStringArray(data.projectReferences);

  // Validate urgency
  const isUrgent = typeof data.isUrgent === "boolean" ? data.isUrgent : false;
  const urgencyIndicators = validateStringArray(data.urgencyIndicators);

  // Validate summary and suggested action
  const summary =
    typeof data.summary === "string" ? data.summary : "No summary provided";
  const suggestedAction =
    typeof data.suggestedAction === "string"
      ? data.suggestedAction
      : "Review email";

  return {
    classification,
    confidence,
    sender,
    financial,
    dates,
    projectType,
    projectReferences,
    isUrgent,
    urgencyIndicators,
    summary,
    suggestedAction,
  };
}

/**
 * Validate and normalize the classification type.
 */
function validateClassification(value: unknown): EmailClassificationType {
  if (typeof value !== "string") {
    return "OTHER";
  }

  const normalized = value.toUpperCase().trim();

  if (VALID_CLASSIFICATIONS.includes(normalized as EmailClassificationType)) {
    return normalized as EmailClassificationType;
  }

  return "OTHER";
}

/**
 * Validate confidence score (0-1).
 */
function validateConfidence(value: unknown): number {
  if (typeof value !== "number") {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

/**
 * Validate and extract sender information.
 * Falls back to parsing the email's "from" field if needed.
 */
function validateSender(value: unknown, fromField: string): SenderInfo {
  const parsed = parseEmailAddress(fromField);

  if (!value || typeof value !== "object") {
    return {
      email: parsed.email,
      name: parsed.name,
      company: null,
      jobTitle: null,
    };
  }

  const data = value as Record<string, unknown>;

  return {
    email:
      typeof data.email === "string" && data.email.includes("@")
        ? data.email.toLowerCase().trim()
        : parsed.email,
    name:
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : parsed.name,
    company:
      typeof data.company === "string" && data.company.trim()
        ? data.company.trim()
        : null,
    jobTitle:
      typeof data.jobTitle === "string" && data.jobTitle.trim()
        ? data.jobTitle.trim()
        : null,
  };
}

/**
 * Validate financial information.
 * Returns null if not present or not applicable.
 */
function validateFinancial(value: unknown): FinancialInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;

  // If no amount is present, return null
  const amount =
    typeof data.amount === "number"
      ? data.amount
      : typeof data.amount === "string"
        ? parseFloat(data.amount)
        : null;

  // Only return financial info if there's meaningful data
  if (amount === null && !data.documentNumber) {
    return null;
  }

  return {
    amount: amount !== null && !isNaN(amount) ? amount : null,
    currency:
      typeof data.currency === "string" ? data.currency.toUpperCase() : "USD",
    documentNumber:
      typeof data.documentNumber === "string" && data.documentNumber.trim()
        ? data.documentNumber.trim()
        : null,
    documentDate: validateDateString(data.documentDate),
    dueDate: validateDateString(data.dueDate),
  };
}

/**
 * Validate date information.
 */
function validateDates(value: unknown): DateInfo {
  const defaultDates: DateInfo = {
    eventDate: null,
    deadlineDate: null,
    mentionedDates: [],
  };

  if (!value || typeof value !== "object") {
    return defaultDates;
  }

  const data = value as Record<string, unknown>;

  return {
    eventDate: validateDateString(data.eventDate),
    deadlineDate: validateDateString(data.deadlineDate),
    mentionedDates: validateMentionedDates(data.mentionedDates),
  };
}

/**
 * Validate a date string in YYYY-MM-DD format.
 */
function validateDateString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  // Check if it's a valid YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    return null;
  }

  // Verify it's a valid date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }

  return value;
}

/**
 * Validate mentioned dates array.
 */
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
        context: (obj.context as string).slice(0, 200), // Limit context length
      };
    });
}

/**
 * Validate project type.
 */
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

/**
 * Validate string array.
 */
function validateStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => (item as string).trim());
}

/**
 * Parse email address from "Name <email>" format.
 */
export function parseEmailAddress(fromField: string): ParsedEmailAddress {
  // Match "Name <email@domain.com>" format
  const matchWithName = fromField.match(/^(.+?)\s*<([^>]+)>$/);

  if (matchWithName) {
    return {
      email: matchWithName[2].toLowerCase().trim(),
      name: matchWithName[1].trim().replace(/^["']|["']$/g, ""), // Remove quotes
    };
  }

  // Just an email address
  const emailMatch = fromField.match(/[^\s<>]+@[^\s<>]+/);

  if (emailMatch) {
    return {
      email: emailMatch[0].toLowerCase().trim(),
      name: null,
    };
  }

  return {
    email: fromField.toLowerCase().trim(),
    name: null,
  };
}

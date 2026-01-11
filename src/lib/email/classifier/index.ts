/**
 * Email Classifier Module
 *
 * Classifies incoming emails using Gemini AI.
 * Supports detection of inquiries, urgent requests, invoices, and receipts.
 */

// Main classification function
export { classifyEmail, parseEmailAddress } from "./classify-email";

// Types
export type {
  EmailClassificationType,
  SenderInfo,
  FinancialInfo,
  DateInfo,
  ClassificationResult,
  EmailContent,
  ParsedEmailAddress,
  ClassifierOptions,
  ClassificationErrorCode,
} from "./types";

export { ClassificationError } from "./types";

// For testing - allow resetting the client
export { resetGeminiClient } from "./gemini-client";

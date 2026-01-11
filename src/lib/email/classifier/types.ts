/**
 * Email Classification Types
 *
 * TypeScript interfaces for the email classification system.
 * These types define the structure of email content, classification results,
 * and extracted data from emails.
 */

// Classification categories matching Prisma enum
export type EmailClassificationType =
  | "INQUIRY"
  | "URGENT_REQUEST"
  | "INVOICE"
  | "RECEIPT"
  | "OTHER";

// Sender information extracted from email
export interface SenderInfo {
  email: string;
  name: string | null;
  company: string | null;
  jobTitle: string | null;
}

// Financial information for invoices/receipts
export interface FinancialInfo {
  amount: number | null;
  currency: string;
  documentNumber: string | null;
  documentDate: string | null; // ISO date string YYYY-MM-DD
  dueDate: string | null; // ISO date string YYYY-MM-DD
}

// Date information extracted from email
export interface DateInfo {
  eventDate: string | null; // ISO date string YYYY-MM-DD
  deadlineDate: string | null; // ISO date string YYYY-MM-DD
  mentionedDates: Array<{
    date: string; // ISO date string YYYY-MM-DD
    context: string;
  }>;
}

// Full classification result from Gemini
export interface ClassificationResult {
  classification: EmailClassificationType;
  confidence: number; // 0-1

  // Extracted data
  sender: SenderInfo;
  financial: FinancialInfo | null;
  dates: DateInfo;

  // Project/inquiry specific
  projectType: string | null; // e.g., "WEDDING", "CORPORATE", "PORTRAIT"
  projectReferences: string[]; // Mentioned project names

  // Urgency
  isUrgent: boolean;
  urgencyIndicators: string[];

  // Summary
  summary: string; // AI-generated summary
  suggestedAction: string;
}

// Raw email content for classification
export interface EmailContent {
  messageId: string;
  threadId: string | null;
  subject: string;
  from: string; // Full "Name <email>" format
  to: string;
  date: Date;
  body: string; // Plain text
  htmlBody: string | null;
  snippet: string; // Preview text
}

// Parsed "From" header
export interface ParsedEmailAddress {
  email: string;
  name: string | null;
}

// Options for the classifier
export interface ClassifierOptions {
  // If true, include raw Gemini response in result for debugging
  includeRawResponse?: boolean;
  // Timeout in milliseconds (default: 30000)
  timeout?: number;
}

// Error types for the classifier
export class ClassificationError extends Error {
  constructor(
    message: string,
    public readonly code: ClassificationErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ClassificationError";
  }
}

export type ClassificationErrorCode =
  | "API_ERROR" // Gemini API error
  | "PARSE_ERROR" // Failed to parse JSON response
  | "VALIDATION_ERROR" // Response doesn't match expected schema
  | "TIMEOUT" // Request timed out
  | "RATE_LIMIT"; // Rate limit exceeded

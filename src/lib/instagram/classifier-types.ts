/**
 * Instagram Message Classification Types
 *
 * TypeScript interfaces for the Instagram DM classification system.
 * Mirrors the email classification system but adapted for DMs.
 */

// Classification categories for Instagram DMs
// Using the same enum as email for consistency
export type MessageClassificationType =
  | "INQUIRY"
  | "URGENT_REQUEST"
  | "OTHER";

// Note: INVOICE and RECEIPT are not applicable for Instagram DMs

// Sender information extracted from message
export interface DMSenderInfo {
  instagramId: string;
  username: string | null;
  name: string | null;
}

// Date information extracted from message
export interface DMDateInfo {
  eventDate: string | null; // ISO date string YYYY-MM-DD
  mentionedDates: Array<{
    date: string;
    context: string;
  }>;
}

// Full classification result for Instagram DM
export interface DMClassificationResult {
  classification: MessageClassificationType;
  confidence: number; // 0-1

  // Extracted data
  sender: DMSenderInfo;
  dates: DMDateInfo;

  // Project/inquiry specific
  projectType: string | null;
  projectReferences: string[];

  // Urgency
  isUrgent: boolean;
  urgencyIndicators: string[];

  // Summary
  summary: string;
  suggestedAction: string;
}

// Raw message content for classification
export interface DMContent {
  messageId: string;
  threadId?: string;
  senderId: string;
  senderUsername?: string;
  senderName?: string;
  text: string;
  timestamp: Date;
  hasAttachments: boolean;
}

// Options for the DM classifier
export interface DMClassifierOptions {
  timeout?: number;
}

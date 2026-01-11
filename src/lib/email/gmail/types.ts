/**
 * Gmail Integration Types
 *
 * TypeScript interfaces for Gmail API operations.
 */

import { gmail_v1 } from "googleapis";

// Gmail message structure after parsing
export interface ParsedGmailMessage {
  messageId: string;
  threadId: string | null;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
  htmlBody: string | null;
  snippet: string;
  labelIds: string[];
}

// Watch subscription info
export interface GmailWatchInfo {
  historyId: string;
  expiration: Date;
}

// History record for new messages
export interface HistoryRecord {
  messageId: string;
  threadId: string | null;
}

// Pub/Sub notification payload
export interface PubSubNotification {
  emailAddress: string;
  historyId: string;
}

// Error class for Gmail operations
export class GmailError extends Error {
  constructor(
    message: string,
    public readonly code: GmailErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "GmailError";
  }
}

export type GmailErrorCode =
  | "AUTH_ERROR" // Authentication/token error
  | "NOT_FOUND" // Message/resource not found
  | "RATE_LIMIT" // API rate limit exceeded
  | "INVALID_GRANT" // Token refresh failed
  | "WATCH_ERROR" // Watch setup failed
  | "API_ERROR"; // Generic API error

// Type guard for Gmail API message
export function isValidGmailMessage(
  message: gmail_v1.Schema$Message | undefined
): message is gmail_v1.Schema$Message & { id: string } {
  return !!message?.id;
}

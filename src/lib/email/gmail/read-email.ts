/**
 * Gmail Read Module
 *
 * Functions to read and parse emails from Gmail.
 */

import { gmail_v1 } from "googleapis";
import { getGmailClient } from "@/lib/google/gmail";
import { ParsedGmailMessage, GmailError } from "./types";
import { EmailContent } from "../classifier/types";

/**
 * Fetch a single email by message ID.
 *
 * @param userId - The user ID to fetch email for
 * @param messageId - The Gmail message ID
 * @returns Parsed email content
 */
export async function fetchEmail(
  userId: string,
  messageId: string
): Promise<ParsedGmailMessage> {
  try {
    const gmail = await getGmailClient(userId);

    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    if (!response.data) {
      throw new GmailError(
        `Message ${messageId} not found`,
        "NOT_FOUND"
      );
    }

    return parseGmailMessage(response.data);
  } catch (error) {
    if (error instanceof GmailError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("invalid_grant")) {
        throw new GmailError(
          "Gmail token refresh failed. User needs to re-authenticate.",
          "INVALID_GRANT",
          error
        );
      }
      if (error.message.includes("404")) {
        throw new GmailError(
          `Message ${messageId} not found`,
          "NOT_FOUND",
          error
        );
      }
      if (error.message.includes("429")) {
        throw new GmailError(
          "Gmail API rate limit exceeded",
          "RATE_LIMIT",
          error
        );
      }
    }

    throw new GmailError(
      `Failed to fetch email: ${error instanceof Error ? error.message : "Unknown error"}`,
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Convert a ParsedGmailMessage to EmailContent for classification.
 */
export function toEmailContent(message: ParsedGmailMessage): EmailContent {
  return {
    messageId: message.messageId,
    threadId: message.threadId,
    subject: message.subject,
    from: message.from,
    to: message.to,
    date: message.date,
    body: message.body,
    htmlBody: message.htmlBody,
    snippet: message.snippet,
  };
}

/**
 * Parse a Gmail API message into a structured format.
 */
export function parseGmailMessage(
  message: gmail_v1.Schema$Message
): ParsedGmailMessage {
  const headers = message.payload?.headers || [];

  const getHeader = (name: string): string => {
    const header = headers.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase()
    );
    return header?.value || "";
  };

  // Parse date from internal timestamp or header
  let date: Date;
  if (message.internalDate) {
    date = new Date(parseInt(message.internalDate));
  } else {
    const dateHeader = getHeader("date");
    date = dateHeader ? new Date(dateHeader) : new Date();
  }

  // Extract body content
  const { textBody, htmlBody } = extractBodyContent(message.payload);

  return {
    messageId: message.id || "",
    threadId: message.threadId || null,
    subject: getHeader("subject"),
    from: getHeader("from"),
    to: getHeader("to"),
    date,
    body: textBody,
    htmlBody,
    snippet: message.snippet || "",
    labelIds: message.labelIds || [],
  };
}

/**
 * Extract text and HTML body from message payload.
 * Handles multipart messages recursively.
 */
function extractBodyContent(
  payload: gmail_v1.Schema$MessagePart | undefined
): { textBody: string; htmlBody: string | null } {
  let textBody = "";
  let htmlBody: string | null = null;

  if (!payload) {
    return { textBody, htmlBody };
  }

  // Direct body (simple message)
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    const mimeType = payload.mimeType || "";

    if (mimeType === "text/plain") {
      textBody = decoded;
    } else if (mimeType === "text/html") {
      htmlBody = decoded;
      // Also extract text from HTML if no plain text
      textBody = stripHtml(decoded);
    }
  }

  // Multipart message - recursively process parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const mimeType = part.mimeType || "";

      if (mimeType === "text/plain" && part.body?.data) {
        textBody = decodeBase64Url(part.body.data);
      } else if (mimeType === "text/html" && part.body?.data) {
        htmlBody = decodeBase64Url(part.body.data);
      } else if (mimeType.startsWith("multipart/")) {
        // Nested multipart - recurse
        const nested = extractBodyContent(part);
        if (nested.textBody && !textBody) {
          textBody = nested.textBody;
        }
        if (nested.htmlBody && !htmlBody) {
          htmlBody = nested.htmlBody;
        }
      }
    }
  }

  // If we only got HTML, extract plain text from it
  if (!textBody && htmlBody) {
    textBody = stripHtml(htmlBody);
  }

  return { textBody, htmlBody };
}

/**
 * Decode base64url encoded string.
 */
function decodeBase64Url(data: string): string {
  // Convert base64url to regular base64
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");

  // Decode
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Strip HTML tags and decode entities for plain text extraction.
 */
function stripHtml(html: string): string {
  return html
    // Remove style and script tags with content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Replace common block elements with newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, "\n")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse multiple newlines/spaces
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Fetch multiple emails by their IDs.
 * Uses batch requests for efficiency.
 */
export async function fetchEmails(
  userId: string,
  messageIds: string[]
): Promise<ParsedGmailMessage[]> {
  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 10;
  const results: ParsedGmailMessage[] = [];

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((id) =>
        fetchEmail(userId, id).catch((error) => {
          console.error(`Failed to fetch message ${id}:`, error);
          return null;
        })
      )
    );

    results.push(
      ...batchResults.filter((r): r is ParsedGmailMessage => r !== null)
    );
  }

  return results;
}

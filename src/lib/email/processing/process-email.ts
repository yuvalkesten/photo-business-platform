/**
 * Email Processing Pipeline
 *
 * Orchestrates the full email processing flow:
 * 1. Sync new messages from Gmail
 * 2. Check for duplicates
 * 3. Classify emails using Gemini
 * 4. Create entities based on classification
 */

import { prisma } from "@/lib/db";
import { ProcessingStatus } from "@prisma/client";
import {
  syncFromNotification,
  fetchEmail,
  toEmailContent,
  isMessageProcessed,
} from "../gmail";
import { classifyEmail, ClassificationResult } from "../classifier";
import { createEntitiesFromClassification } from "./create-entities";

// Maximum retries for failed processing
const MAX_RETRIES = 3;

/**
 * Process a Gmail push notification.
 * This is the main entry point called by the webhook.
 *
 * @param userId - The user ID
 * @param historyId - The history ID from the Pub/Sub notification
 */
export async function processEmailNotification(
  userId: string,
  historyId: string
): Promise<void> {
  console.log(`Processing email notification for user ${userId}, history: ${historyId}`);

  try {
    // Sync new messages since last known history ID
    const records = await syncFromNotification(userId, historyId);

    console.log(`Found ${records.length} new messages for user ${userId}`);

    // Process each new message
    for (const record of records) {
      try {
        await processMessage(userId, record.messageId);
      } catch (error) {
        console.error(
          `Error processing message ${record.messageId}:`,
          error
        );
        // Continue with other messages
      }
    }
  } catch (error) {
    console.error(`Error syncing Gmail history for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Process a single email message.
 *
 * @param userId - The user ID
 * @param messageId - The Gmail message ID
 */
export async function processMessage(
  userId: string,
  messageId: string
): Promise<void> {
  // Check for duplicates
  if (await isMessageProcessed(userId, messageId)) {
    console.log(`Message ${messageId} already processed, skipping`);
    return;
  }

  // Fetch the email content
  const gmailMessage = await fetchEmail(userId, messageId);

  // Create the processing record
  const record = await prisma.processedEmail.create({
    data: {
      userId,
      gmailMessageId: gmailMessage.messageId,
      gmailThreadId: gmailMessage.threadId,
      subject: gmailMessage.subject,
      fromEmail: extractEmail(gmailMessage.from),
      fromName: extractName(gmailMessage.from),
      receivedAt: gmailMessage.date,
      snippet: gmailMessage.snippet,
      status: ProcessingStatus.PROCESSING,
    },
  });

  try {
    // Convert to EmailContent for classifier
    const emailContent = toEmailContent(gmailMessage);

    // Classify the email
    const result = await classifyEmail(emailContent);

    // Store classification result
    await prisma.processedEmail.update({
      where: { id: record.id },
      data: {
        classification: result.classification,
        classificationData: JSON.stringify(result),
        classifiedAt: new Date(),
        status: ProcessingStatus.CLASSIFIED,
      },
    });

    console.log(
      `Classified message ${messageId} as ${result.classification} (confidence: ${result.confidence})`
    );

    // Create entities if applicable
    if (result.classification !== "OTHER") {
      await createEntitiesFromClassification(
        userId,
        record.id,
        result,
        emailContent
      );

      // Update status to ACTION_TAKEN
      await prisma.processedEmail.update({
        where: { id: record.id },
        data: { status: ProcessingStatus.ACTION_TAKEN },
      });
    }
  } catch (error) {
    console.error(`Error classifying message ${messageId}:`, error);

    // Update record with error
    const newRetryCount = record.retryCount + 1;
    await prisma.processedEmail.update({
      where: { id: record.id },
      data: {
        status:
          newRetryCount >= MAX_RETRIES
            ? ProcessingStatus.FAILED
            : ProcessingStatus.PENDING,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
        retryCount: newRetryCount,
      },
    });

    throw error;
  }
}

/**
 * Retry processing for failed emails.
 *
 * @param userId - The user ID
 * @returns Number of emails retried
 */
export async function retryFailedEmails(userId: string): Promise<number> {
  const failedEmails = await prisma.processedEmail.findMany({
    where: {
      userId,
      status: ProcessingStatus.PENDING,
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: "asc" },
    take: 10, // Process in batches
  });

  let retriedCount = 0;

  for (const email of failedEmails) {
    try {
      await processMessage(userId, email.gmailMessageId);
      retriedCount++;
    } catch (error) {
      console.error(`Retry failed for message ${email.gmailMessageId}:`, error);
    }
  }

  return retriedCount;
}

/**
 * Get processing statistics for a user.
 */
export async function getProcessingStats(userId: string) {
  const stats = await prisma.processedEmail.groupBy({
    by: ["status"],
    where: { userId },
    _count: { id: true },
  });

  const byClassification = await prisma.processedEmail.groupBy({
    by: ["classification"],
    where: {
      userId,
      classification: { not: null },
    },
    _count: { id: true },
  });

  return {
    byStatus: Object.fromEntries(
      stats.map((s) => [s.status, s._count.id])
    ),
    byClassification: Object.fromEntries(
      byClassification.map((c) => [c.classification ?? "null", c._count.id])
    ),
  };
}

/**
 * Extract email address from "Name <email>" format.
 */
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  // Try to find an email pattern
  const emailMatch = from.match(/[^\s<>]+@[^\s<>]+/);
  if (emailMatch) {
    return emailMatch[0].toLowerCase().trim();
  }
  return from.toLowerCase().trim();
}

/**
 * Extract name from "Name <email>" format.
 */
function extractName(from: string): string | null {
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  if (match) {
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

/**
 * Instagram Message Processing Pipeline
 *
 * Orchestrates the full Instagram DM processing flow:
 * 1. Check for duplicate messages
 * 2. Fetch sender profile info
 * 3. Store the message
 * 4. Classify using Gemini AI
 * 5. Create entities based on classification
 */

import { prisma } from "@/lib/db";
import { ProcessingStatus, MessagePlatform } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { classifyInstagramMessage } from "./classifier";
import { DMContent } from "./classifier-types";
import { fetchInstagramUserProfile, getInstagramAccount } from "./client";
import { createEntitiesFromDMClassification } from "./create-entities";
import { ParsedInstagramMessage } from "./types";

// Maximum retries for failed processing
const MAX_RETRIES = 3;

/**
 * Process an Instagram DM from webhook.
 * This is the main entry point called by the webhook handler.
 *
 * @param userId - The platform user ID
 * @param message - The parsed Instagram message
 */
export async function processInstagramMessage(
  userId: string,
  message: ParsedInstagramMessage
): Promise<void> {
  console.log(`Processing Instagram DM for user ${userId}:`, {
    messageId: message.messageId,
    senderId: message.senderId,
  });

  try {
    // Check for duplicate
    if (await isMessageProcessed(userId, message.messageId)) {
      console.log(`Message ${message.messageId} already processed, skipping`);
      return;
    }

    // Fetch sender profile if we have an access token
    let senderProfile = null;
    const instagramAccount = await getInstagramAccount(userId);
    if (instagramAccount?.accessToken) {
      senderProfile = await fetchInstagramUserProfile(
        instagramAccount.accessToken,
        message.senderId
      );
    }

    // Create the processing record
    const record = await prisma.processedMessage.create({
      data: {
        userId,
        platform: MessagePlatform.INSTAGRAM,
        platformMessageId: message.messageId,
        platformThreadId: message.threadId,
        senderId: message.senderId,
        senderHandle: senderProfile?.username || message.senderHandle,
        senderName: senderProfile?.name || message.senderName,
        messageText: message.text,
        receivedAt: message.timestamp,
        status: ProcessingStatus.PROCESSING,
      },
    });

    try {
      // Build content for classifier
      const dmContent: DMContent = {
        messageId: message.messageId,
        threadId: message.threadId,
        senderId: message.senderId,
        senderUsername: senderProfile?.username || message.senderHandle,
        senderName: senderProfile?.name || message.senderName,
        text: message.text,
        timestamp: message.timestamp,
        hasAttachments: message.hasAttachments,
      };

      // Classify the message
      const result = await classifyInstagramMessage(dmContent);

      // Store classification result
      await prisma.processedMessage.update({
        where: { id: record.id },
        data: {
          classification: result.classification,
          classificationData: JSON.stringify(result),
          classifiedAt: new Date(),
          status: ProcessingStatus.CLASSIFIED,
        },
      });

      console.log(
        `Classified Instagram DM ${message.messageId} as ${result.classification} (confidence: ${result.confidence})`
      );

      // Create entities if applicable
      if (result.classification !== "OTHER") {
        await createEntitiesFromDMClassification(
          userId,
          record.id,
          result,
          dmContent
        );

        // Update status to ACTION_TAKEN
        await prisma.processedMessage.update({
          where: { id: record.id },
          data: { status: ProcessingStatus.ACTION_TAKEN },
        });
      }

      // Revalidate the messages page
      revalidatePath("/dashboard/messages");
    } catch (error) {
      console.error(`Error classifying Instagram DM ${message.messageId}:`, error);

      // Update record with error
      const newRetryCount = record.retryCount + 1;
      await prisma.processedMessage.update({
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
  } catch (error) {
    console.error(`Error processing Instagram DM for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if a message has already been processed.
 */
async function isMessageProcessed(
  userId: string,
  messageId: string
): Promise<boolean> {
  const existing = await prisma.processedMessage.findUnique({
    where: {
      userId_platform_platformMessageId: {
        userId,
        platform: MessagePlatform.INSTAGRAM,
        platformMessageId: messageId,
      },
    },
  });

  return existing !== null;
}

/**
 * Retry processing for failed Instagram messages.
 *
 * @param userId - The user ID
 * @returns Number of messages retried
 */
export async function retryFailedMessages(userId: string): Promise<number> {
  const failedMessages = await prisma.processedMessage.findMany({
    where: {
      userId,
      platform: MessagePlatform.INSTAGRAM,
      status: ProcessingStatus.PENDING,
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  let retriedCount = 0;

  for (const msg of failedMessages) {
    try {
      // Re-classify using stored message text
      const dmContent: DMContent = {
        messageId: msg.platformMessageId,
        threadId: msg.platformThreadId || undefined,
        senderId: msg.senderId,
        senderUsername: msg.senderHandle || undefined,
        senderName: msg.senderName || undefined,
        text: msg.messageText,
        timestamp: msg.receivedAt,
        hasAttachments: false,
      };

      const result = await classifyInstagramMessage(dmContent);

      await prisma.processedMessage.update({
        where: { id: msg.id },
        data: {
          classification: result.classification,
          classificationData: JSON.stringify(result),
          classifiedAt: new Date(),
          status: ProcessingStatus.CLASSIFIED,
        },
      });

      if (result.classification !== "OTHER") {
        await createEntitiesFromDMClassification(
          userId,
          msg.id,
          result,
          dmContent
        );

        await prisma.processedMessage.update({
          where: { id: msg.id },
          data: { status: ProcessingStatus.ACTION_TAKEN },
        });
      }

      retriedCount++;
    } catch (error) {
      console.error(`Retry failed for message ${msg.platformMessageId}:`, error);

      await prisma.processedMessage.update({
        where: { id: msg.id },
        data: {
          retryCount: msg.retryCount + 1,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          status:
            msg.retryCount + 1 >= MAX_RETRIES
              ? ProcessingStatus.FAILED
              : ProcessingStatus.PENDING,
        },
      });
    }
  }

  return retriedCount;
}

/**
 * Get processing statistics for Instagram messages.
 */
export async function getInstagramProcessingStats(userId: string) {
  const stats = await prisma.processedMessage.groupBy({
    by: ["status"],
    where: {
      userId,
      platform: MessagePlatform.INSTAGRAM,
    },
    _count: { id: true },
  });

  const byClassification = await prisma.processedMessage.groupBy({
    by: ["classification"],
    where: {
      userId,
      platform: MessagePlatform.INSTAGRAM,
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
 * Get recent Instagram messages for a user.
 */
export async function getRecentInstagramMessages(
  userId: string,
  limit = 20
) {
  return prisma.processedMessage.findMany({
    where: {
      userId,
      platform: MessagePlatform.INSTAGRAM,
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
    include: {
      createdContact: true,
      createdProject: true,
    },
  });
}

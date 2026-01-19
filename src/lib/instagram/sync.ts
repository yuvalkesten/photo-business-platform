/**
 * Instagram Historical Message Sync
 *
 * Fetches historical Instagram DMs and processes them through the existing pipeline.
 * Used for initial sync when a user first connects their Instagram account.
 *
 * NOTE: Historical message sync requires Facebook Login (accessing Instagram via a Facebook Page).
 * Instagram Login tokens do not have access to the /conversations endpoint.
 * If using Instagram Login, this will return early with a message indicating the limitation.
 */

import { revalidatePath } from "next/cache";
import {
  getInstagramAccount,
  fetchInstagramConversations,
  fetchConversationMessages,
  InstagramAPIMessage,
} from "./client";
import { processInstagramMessage } from "./processing";
import { ParsedInstagramMessage } from "./types";

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
  conversations: number;
}

export interface SyncOptions {
  /** Maximum age of messages to sync (in days). Default: 30 */
  maxDays?: number;
  /** Maximum conversations to process. Default: 50 */
  maxConversations?: number;
  /** Maximum messages per conversation. Default: 100 */
  maxMessagesPerConversation?: number;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  maxDays: 30,
  maxConversations: 50,
  maxMessagesPerConversation: 100,
};

/**
 * Sync historical Instagram messages for a user.
 *
 * This fetches conversations and messages from the Instagram API and processes
 * them through the existing message processing pipeline.
 *
 * @param userId - The platform user ID
 * @param options - Sync options
 * @returns Sync statistics
 */
export async function syncHistoricalMessages(
  userId: string,
  options?: SyncOptions
): Promise<SyncResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cutoffDate = new Date(Date.now() - opts.maxDays * 24 * 60 * 60 * 1000);

  console.log(`[Instagram Sync] Starting sync for user ${userId}`, {
    maxDays: opts.maxDays,
    cutoffDate: cutoffDate.toISOString(),
  });

  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    errors: 0,
    conversations: 0,
  };

  // Get the user's Instagram account
  const instagramAccount = await getInstagramAccount(userId);
  if (!instagramAccount || !instagramAccount.isActive) {
    console.log(`[Instagram Sync] No active Instagram account for user ${userId}`);
    return result;
  }

  const { accessToken, instagramUserId } = instagramAccount;

  try {
    // Fetch all conversations (with pagination)
    let conversationCursor: string | undefined;
    let conversationsProcessed = 0;

    // Try to fetch conversations - this may fail with Instagram Login tokens
    let initialResponse;
    try {
      initialResponse = await fetchInstagramConversations(
        accessToken,
        instagramUserId,
        { after: conversationCursor, limit: 20 }
      );
    } catch (error) {
      // Check if this is a permission error (Instagram Login doesn't support /conversations)
      if (error instanceof Error && error.message.includes("unknown error")) {
        console.log(
          `[Instagram Sync] Historical sync not available for user ${userId}. ` +
          `This typically means the account is using Instagram Login instead of Facebook Login. ` +
          `Real-time messages via webhooks will still work.`
        );
        return {
          ...result,
          // Return 0s to indicate sync wasn't possible, but not an error
        };
      }
      throw error;
    }

    let { conversations, nextCursor } = initialResponse;
    conversationCursor = nextCursor;

    // Process conversations in a loop with pagination
    while (true) {
      for (const conversation of conversations) {
        if (conversationsProcessed >= opts.maxConversations) {
          console.log(`[Instagram Sync] Reached max conversations limit (${opts.maxConversations})`);
          break;
        }

        try {
          const conversationResult = await syncConversation(
            userId,
            accessToken,
            instagramUserId,
            conversation.id,
            cutoffDate,
            opts.maxMessagesPerConversation
          );

          result.synced += conversationResult.synced;
          result.skipped += conversationResult.skipped;
          result.errors += conversationResult.errors;
          result.conversations++;
          conversationsProcessed++;
        } catch (error) {
          console.error(
            `[Instagram Sync] Error syncing conversation ${conversation.id}:`,
            error
          );
          result.errors++;
        }

        // Small delay to avoid rate limiting
        await sleep(100);
      }

      // Check if we should stop
      if (conversationsProcessed >= opts.maxConversations || !conversationCursor) {
        break;
      }

      // Fetch next page
      const nextPage = await fetchInstagramConversations(
        accessToken,
        instagramUserId,
        { after: conversationCursor, limit: 20 }
      );
      conversations = nextPage.conversations;
      conversationCursor = nextPage.nextCursor;
    }

    console.log(`[Instagram Sync] Completed for user ${userId}:`, result);

    // Revalidate the messages page
    revalidatePath("/dashboard/messages");

    return result;
  } catch (error) {
    console.error(`[Instagram Sync] Error syncing for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Sync messages from a single conversation.
 */
async function syncConversation(
  userId: string,
  accessToken: string,
  myInstagramId: string,
  conversationId: string,
  cutoffDate: Date,
  maxMessages: number
): Promise<{ synced: number; skipped: number; errors: number }> {
  const result = { synced: 0, skipped: 0, errors: 0 };

  try {
    const { messages } = await fetchConversationMessages(
      accessToken,
      conversationId
    );

    for (const message of messages) {
      if (result.synced + result.skipped >= maxMessages) {
        break;
      }

      // Skip messages older than cutoff
      const messageDate = new Date(message.created_time);
      if (messageDate < cutoffDate) {
        break; // Messages are in reverse chronological order
      }

      // Skip messages from ourselves (we only want incoming DMs)
      if (message.from.id === myInstagramId) {
        result.skipped++;
        continue;
      }

      // Skip messages without text content
      if (!message.message) {
        result.skipped++;
        continue;
      }

      try {
        const parsedMessage = convertToParsdMessage(
          message,
          conversationId,
          myInstagramId
        );

        await processInstagramMessage(userId, parsedMessage);
        result.synced++;
      } catch (error) {
        // Check if it's a duplicate error (expected for already-processed messages)
        if (
          error instanceof Error &&
          error.message.includes("already processed")
        ) {
          result.skipped++;
        } else {
          console.error(
            `[Instagram Sync] Error processing message ${message.id}:`,
            error
          );
          result.errors++;
        }
      }

      // Small delay between messages
      await sleep(50);
    }
  } catch (error) {
    console.error(
      `[Instagram Sync] Error fetching messages for conversation ${conversationId}:`,
      error
    );
    result.errors++;
  }

  return result;
}

/**
 * Convert an Instagram API message to the parsed format expected by the processing pipeline.
 */
function convertToParsdMessage(
  message: InstagramAPIMessage,
  conversationId: string,
  recipientId: string
): ParsedInstagramMessage {
  return {
    messageId: message.id,
    threadId: conversationId,
    senderId: message.from.id,
    senderHandle: message.from.username,
    senderName: message.from.name,
    text: message.message || "",
    timestamp: new Date(message.created_time),
    recipientId,
    hasAttachments: false, // Historical sync doesn't include attachments
    attachmentUrls: [],
  };
}

/**
 * Helper function to pause execution.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

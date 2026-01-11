/**
 * Gmail History Sync Module
 *
 * Handles incremental sync of new messages using Gmail History API.
 * This is used to efficiently get only new messages since the last sync.
 */

import { getGmailClient } from "@/lib/google/gmail";
import { prisma } from "@/lib/db";
import { GmailError, HistoryRecord } from "./types";
import { updateWatchHistoryId } from "./watch";

/**
 * Sync Gmail history to get new message IDs since last sync.
 *
 * @param userId - The user ID to sync for
 * @returns Array of new message IDs
 */
export async function syncGmailHistory(userId: string): Promise<string[]> {
  try {
    // Get the stored history ID
    const watch = await prisma.emailWatch.findUnique({
      where: { userId },
    });

    if (!watch) {
      throw new GmailError(
        "No email watch configured for user",
        "NOT_FOUND"
      );
    }

    const gmail = await getGmailClient(userId);
    const newMessageIds: string[] = [];
    let pageToken: string | undefined;
    let latestHistoryId = watch.historyId;

    // Paginate through history
    do {
      const response = await gmail.users.history.list({
        userId: "me",
        startHistoryId: watch.historyId,
        historyTypes: ["messageAdded"],
        labelId: "INBOX",
        pageToken,
      });

      // Process history records
      if (response.data.history) {
        for (const record of response.data.history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                // Only include if message is in INBOX
                const labels = added.message.labelIds || [];
                if (labels.includes("INBOX")) {
                  newMessageIds.push(added.message.id);
                }
              }
            }
          }
        }
      }

      // Update latest history ID
      if (response.data.historyId) {
        latestHistoryId = response.data.historyId;
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    // Update stored history ID
    if (latestHistoryId !== watch.historyId) {
      await updateWatchHistoryId(userId, latestHistoryId);
    }

    // Deduplicate (same message can appear multiple times)
    return [...new Set(newMessageIds)];
  } catch (error) {
    if (error instanceof GmailError) {
      throw error;
    }

    if (error instanceof Error) {
      // History ID too old - need to do full sync
      if (
        error.message.includes("404") ||
        error.message.includes("historyId")
      ) {
        throw new GmailError(
          "History ID expired. Need to resync.",
          "NOT_FOUND",
          error
        );
      }

      if (error.message.includes("invalid_grant")) {
        throw new GmailError(
          "Gmail token refresh failed. User needs to re-authenticate.",
          "INVALID_GRANT",
          error
        );
      }
    }

    throw new GmailError(
      `Failed to sync Gmail history: ${error instanceof Error ? error.message : "Unknown error"}`,
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Sync Gmail history from a specific history ID.
 * Used when processing a Pub/Sub notification.
 *
 * @param userId - The user ID
 * @param notificationHistoryId - History ID from Pub/Sub notification
 * @returns Array of new message records
 */
export async function syncFromNotification(
  userId: string,
  notificationHistoryId: string
): Promise<HistoryRecord[]> {
  try {
    // Get the stored history ID
    const watch = await prisma.emailWatch.findUnique({
      where: { userId },
    });

    if (!watch) {
      throw new GmailError(
        "No email watch configured for user",
        "NOT_FOUND"
      );
    }

    // Use the older of the two history IDs to ensure we don't miss messages
    const startHistoryId = compareHistoryIds(
      watch.historyId,
      notificationHistoryId
    ) < 0
      ? watch.historyId
      : notificationHistoryId;

    const gmail = await getGmailClient(userId);
    const records: HistoryRecord[] = [];
    let pageToken: string | undefined;
    let latestHistoryId = startHistoryId;

    do {
      const response = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
        labelId: "INBOX",
        pageToken,
      });

      if (response.data.history) {
        for (const record of response.data.history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                records.push({
                  messageId: added.message.id,
                  threadId: added.message.threadId || null,
                });
              }
            }
          }
        }
      }

      if (response.data.historyId) {
        latestHistoryId = response.data.historyId;
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    // Update stored history ID
    await updateWatchHistoryId(userId, latestHistoryId);

    // Deduplicate by message ID
    const seen = new Set<string>();
    return records.filter((r) => {
      if (seen.has(r.messageId)) {
        return false;
      }
      seen.add(r.messageId);
      return true;
    });
  } catch (error) {
    if (error instanceof GmailError) {
      throw error;
    }

    throw new GmailError(
      `Failed to sync from notification: ${error instanceof Error ? error.message : "Unknown error"}`,
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compare two history IDs.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareHistoryIds(a: string, b: string): number {
  // History IDs are numeric strings
  const numA = BigInt(a);
  const numB = BigInt(b);

  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

/**
 * Get recent messages from inbox (for initial sync or recovery).
 *
 * @param userId - The user ID
 * @param maxResults - Maximum number of messages to fetch (default 50)
 * @returns Array of message IDs
 */
export async function getRecentInboxMessages(
  userId: string,
  maxResults: number = 50
): Promise<string[]> {
  try {
    const gmail = await getGmailClient(userId);

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      labelIds: ["INBOX"],
    });

    return (response.data.messages || [])
      .filter((m) => m.id)
      .map((m) => m.id as string);
  } catch (error) {
    throw new GmailError(
      `Failed to get recent messages: ${error instanceof Error ? error.message : "Unknown error"}`,
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if a message has already been processed.
 *
 * @param userId - The user ID
 * @param messageId - The Gmail message ID
 * @returns True if already processed
 */
export async function isMessageProcessed(
  userId: string,
  messageId: string
): Promise<boolean> {
  const existing = await prisma.processedEmail.findUnique({
    where: {
      userId_gmailMessageId: {
        userId,
        gmailMessageId: messageId,
      },
    },
    select: { id: true },
  });

  return !!existing;
}

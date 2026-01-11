/**
 * Gmail Watch Module
 *
 * Setup and manage Gmail push notifications via Google Pub/Sub.
 * Gmail watches expire after 7 days and need to be renewed.
 */

import { getGmailClient } from "@/lib/google/gmail";
import { prisma } from "@/lib/db";
import { GmailError, GmailWatchInfo } from "./types";

// Pub/Sub topic for Gmail notifications
// Format: projects/{project-id}/topics/{topic-name}
function getPubSubTopic(): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) {
    throw new GmailError(
      "GOOGLE_CLOUD_PROJECT_ID environment variable is not set",
      "WATCH_ERROR"
    );
  }
  return `projects/${projectId}/topics/gmail-push`;
}

/**
 * Set up a Gmail watch for a user's inbox.
 * This subscribes the user's inbox to push notifications.
 *
 * @param userId - The user ID to set up watch for
 * @returns Watch info including history ID and expiration
 */
export async function setupGmailWatch(userId: string): Promise<GmailWatchInfo> {
  try {
    const gmail = await getGmailClient(userId);
    const topic = getPubSubTopic();

    // Stop any existing watch first
    await stopGmailWatch(userId);

    // Start new watch
    const response = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: topic,
        labelIds: ["INBOX"],
        labelFilterAction: "include",
      },
    });

    if (!response.data.historyId || !response.data.expiration) {
      throw new GmailError(
        "Invalid watch response from Gmail API",
        "WATCH_ERROR"
      );
    }

    const watchInfo: GmailWatchInfo = {
      historyId: response.data.historyId,
      expiration: new Date(parseInt(response.data.expiration)),
    };

    // Store watch info in database
    await prisma.emailWatch.upsert({
      where: { userId },
      create: {
        userId,
        historyId: watchInfo.historyId,
        expiration: watchInfo.expiration,
        resourceUri: topic,
        isActive: true,
      },
      update: {
        historyId: watchInfo.historyId,
        expiration: watchInfo.expiration,
        resourceUri: topic,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    return watchInfo;
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
      if (error.message.includes("403")) {
        throw new GmailError(
          "Permission denied. Check Pub/Sub topic permissions.",
          "WATCH_ERROR",
          error
        );
      }
    }

    throw new GmailError(
      `Failed to set up Gmail watch: ${error instanceof Error ? error.message : "Unknown error"}`,
      "WATCH_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Stop an existing Gmail watch for a user.
 *
 * @param userId - The user ID to stop watch for
 */
export async function stopGmailWatch(userId: string): Promise<void> {
  try {
    const gmail = await getGmailClient(userId);

    // Try to stop the watch (may fail if no watch exists)
    await gmail.users.stop({ userId: "me" }).catch(() => {
      // Ignore errors - watch may not exist
    });

    // Mark as inactive in database
    await prisma.emailWatch.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  } catch (error) {
    // Log but don't throw - stopping is best effort
    console.error(`Failed to stop Gmail watch for user ${userId}:`, error);
  }
}

/**
 * Get the current watch status for a user.
 *
 * @param userId - The user ID to check
 * @returns Watch info if active, null otherwise
 */
export async function getWatchStatus(
  userId: string
): Promise<GmailWatchInfo | null> {
  const watch = await prisma.emailWatch.findUnique({
    where: { userId },
  });

  if (!watch || !watch.isActive) {
    return null;
  }

  // Check if expired
  if (watch.expiration < new Date()) {
    return null;
  }

  return {
    historyId: watch.historyId,
    expiration: watch.expiration,
  };
}

/**
 * Check if a user's watch needs renewal (expiring within 24 hours).
 *
 * @param userId - The user ID to check
 * @returns True if watch needs renewal
 */
export async function watchNeedsRenewal(userId: string): Promise<boolean> {
  const watch = await prisma.emailWatch.findUnique({
    where: { userId },
  });

  if (!watch || !watch.isActive) {
    return true; // No watch = needs setup
  }

  // Check if expiring within 24 hours
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return watch.expiration < oneDayFromNow;
}

/**
 * Renew all watches that are expiring soon.
 * This should be called by a cron job.
 *
 * @returns Number of watches renewed
 */
export async function renewExpiringWatches(): Promise<number> {
  // Find watches expiring within 24 hours
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const expiringWatches = await prisma.emailWatch.findMany({
    where: {
      isActive: true,
      expiration: {
        lt: oneDayFromNow,
      },
    },
    select: { userId: true },
  });

  let renewedCount = 0;

  for (const watch of expiringWatches) {
    try {
      await setupGmailWatch(watch.userId);
      renewedCount++;
    } catch (error) {
      console.error(
        `Failed to renew watch for user ${watch.userId}:`,
        error
      );
      // Continue with other watches
    }
  }

  return renewedCount;
}

/**
 * Update the history ID for a user's watch.
 * Called after processing notifications to track progress.
 *
 * @param userId - The user ID
 * @param historyId - The new history ID
 */
export async function updateWatchHistoryId(
  userId: string,
  historyId: string
): Promise<void> {
  await prisma.emailWatch.update({
    where: { userId },
    data: {
      historyId,
      lastSyncAt: new Date(),
    },
  });
}

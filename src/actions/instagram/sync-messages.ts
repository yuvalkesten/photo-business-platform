"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { syncHistoricalMessages, SyncResult } from "@/lib/instagram/sync";
import { hasActiveInstagramConnection } from "@/lib/instagram/client";

export interface SyncMessagesResult {
  success: boolean;
  data?: SyncResult;
  error?: string;
}

/**
 * Manually trigger Instagram message sync.
 *
 * Fetches the last 30 days of Instagram DMs and processes them.
 * Useful for catching up on messages that arrived before webhooks were set up.
 */
export async function triggerInstagramSync(): Promise<SyncMessagesResult> {
  try {
    const user = await requireAuth();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user has an active Instagram connection
    const isConnected = await hasActiveInstagramConnection(user.id);
    if (!isConnected) {
      return {
        success: false,
        error: "No active Instagram connection. Please connect your Instagram account first.",
      };
    }

    // Run the sync
    const result = await syncHistoricalMessages(user.id, { maxDays: 30 });

    // Revalidate the messages page
    revalidatePath("/dashboard/messages");

    // Check if sync actually ran (it won't with Instagram Login)
    if (result.synced === 0 && result.skipped === 0 && result.conversations === 0 && result.errors === 0) {
      return {
        success: true,
        data: result,
        error: "Historical sync is not available with Instagram Login. " +
               "New messages will still be received in real-time via webhooks.",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error triggering Instagram sync:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

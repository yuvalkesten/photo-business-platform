"use server";

import { requireAuth } from "@/lib/auth/utils";
import { setupGmailWatch, GmailError } from "@/lib/email/gmail";

/**
 * Set up Gmail watch for the current user.
 * This enables email classification for incoming emails.
 */
export async function setupEmailWatch() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const watchInfo = await setupGmailWatch(user.id);

    return {
      success: true,
      watch: {
        historyId: watchInfo.historyId,
        expiration: watchInfo.expiration.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error setting up email watch:", error);

    if (error instanceof GmailError) {
      if (error.code === "INVALID_GRANT") {
        return {
          error: "Gmail access expired. Please sign out and sign in again to reconnect.",
          code: "REAUTH_REQUIRED",
        };
      }
      if (error.code === "WATCH_ERROR") {
        return {
          error: "Failed to set up email notifications. Please check your Google Cloud configuration.",
          code: "WATCH_ERROR",
        };
      }
    }

    return { error: "Failed to set up email watch" };
  }
}

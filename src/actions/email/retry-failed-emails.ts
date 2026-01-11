"use server";

import { requireAuth } from "@/lib/auth/utils";
import { retryFailedEmails as retryFailed } from "@/lib/email/processing";

/**
 * Retry processing failed emails for the current user.
 */
export async function retryFailedEmails() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const retriedCount = await retryFailed(user.id);

    return {
      success: true,
      retriedCount,
    };
  } catch (error) {
    console.error("Error retrying failed emails:", error);
    return { error: "Failed to retry emails" };
  }
}

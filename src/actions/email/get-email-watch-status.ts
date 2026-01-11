"use server";

import { requireAuth } from "@/lib/auth/utils";
import { getWatchStatus, watchNeedsRenewal } from "@/lib/email/gmail";

/**
 * Get the current email watch status for the user.
 */
export async function getEmailWatchStatus() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const watchInfo = await getWatchStatus(user.id);
    const needsRenewal = await watchNeedsRenewal(user.id);

    if (!watchInfo) {
      return {
        success: true,
        status: "inactive" as const,
        watch: null,
        needsRenewal: true,
      };
    }

    return {
      success: true,
      status: "active" as const,
      watch: {
        historyId: watchInfo.historyId,
        expiration: watchInfo.expiration.toISOString(),
      },
      needsRenewal,
    };
  } catch (error) {
    console.error("Error getting email watch status:", error);
    return { error: "Failed to get email watch status" };
  }
}

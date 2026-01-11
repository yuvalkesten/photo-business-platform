"use server";

import { requireAuth } from "@/lib/auth/utils";
import { getProcessingStats } from "@/lib/email/processing";

/**
 * Get email processing statistics for the current user.
 */
export async function getEmailStats() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const stats = await getProcessingStats(user.id);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("Error getting email stats:", error);
    return { error: "Failed to get email statistics" };
  }
}

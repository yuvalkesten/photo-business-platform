"use server";

import { requireAuth } from "@/lib/auth/utils";
import { getInstagramProcessingStats } from "@/lib/instagram/processing";

/**
 * Get Instagram message processing statistics.
 */
export async function getInstagramStats() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const stats = await getInstagramProcessingStats(user.id);

    // Calculate totals
    const totalMessages = Object.values(stats.byStatus).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      success: true,
      stats: {
        total: totalMessages,
        byStatus: stats.byStatus,
        byClassification: stats.byClassification,
      },
    };
  } catch (error) {
    console.error("Error getting Instagram stats:", error);
    return { error: "Failed to get Instagram stats" };
  }
}

"use server";

import { requireAuth } from "@/lib/auth/utils";
import { getInstagramAccount } from "@/lib/instagram/client";

/**
 * Get the current Instagram connection status for the user.
 */
export async function getInstagramStatus() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const account = await getInstagramAccount(user.id);

    if (!account) {
      return {
        success: true,
        connected: false,
        account: null,
        needsRenewal: false,
      };
    }

    // Check if token needs renewal (within 7 days of expiration)
    const needsRenewal = account.tokenExpiresAt
      ? account.tokenExpiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
      : false;

    // Check if token has expired
    const isExpired = account.tokenExpiresAt
      ? account.tokenExpiresAt < new Date()
      : false;

    return {
      success: true,
      connected: account.isActive && !isExpired,
      account: {
        username: account.username,
        pageName: account.pageName,
        tokenExpiresAt: account.tokenExpiresAt?.toISOString() || null,
        isActive: account.isActive,
      },
      needsRenewal,
      isExpired,
    };
  } catch (error) {
    console.error("Error getting Instagram status:", error);
    return { error: "Failed to get Instagram status" };
  }
}

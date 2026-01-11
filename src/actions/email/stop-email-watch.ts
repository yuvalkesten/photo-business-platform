"use server";

import { requireAuth } from "@/lib/auth/utils";
import { stopGmailWatch } from "@/lib/email/gmail";

/**
 * Stop Gmail watch for the current user.
 * This disables email classification.
 */
export async function stopEmailWatch() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    await stopGmailWatch(user.id);

    return { success: true };
  } catch (error) {
    console.error("Error stopping email watch:", error);
    return { error: "Failed to stop email watch" };
  }
}

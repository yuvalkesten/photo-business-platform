"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { retryFailedMessages as retryMessages } from "@/lib/instagram/processing";

/**
 * Retry processing for failed Instagram messages.
 */
export async function retryFailedInstagramMessages() {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const retriedCount = await retryMessages(user.id);

    revalidatePath("/dashboard/messages");

    return {
      success: true,
      retriedCount,
    };
  } catch (error) {
    console.error("Error retrying failed Instagram messages:", error);
    return { error: "Failed to retry messages" };
  }
}

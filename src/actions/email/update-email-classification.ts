"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { EmailClassification } from "@prisma/client";

/**
 * Update the classification of a processed email.
 * This is a manual override of the AI classification.
 */
export async function updateEmailClassification(
  emailId: string,
  newClassification: EmailClassification
) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify the email belongs to the user
    const existingEmail = await prisma.processedEmail.findFirst({
      where: {
        id: emailId,
        userId: user.id,
      },
      select: {
        id: true,
        classification: true,
        classificationData: true,
      },
    });

    if (!existingEmail) {
      return { error: "Email not found" };
    }

    // Parse existing classificationData
    let classificationData: Record<string, unknown> = {};
    if (existingEmail.classificationData) {
      try {
        classificationData =
          typeof existingEmail.classificationData === "string"
            ? JSON.parse(existingEmail.classificationData)
            : (existingEmail.classificationData as Record<string, unknown>);
      } catch {
        classificationData = {};
      }
    }

    // Add manual override information
    const updatedClassificationData = {
      ...classificationData,
      manualOverride: true,
      manualOverrideAt: new Date().toISOString(),
      previousClassification: existingEmail.classification,
      originalClassification:
        classificationData.originalClassification || existingEmail.classification,
    };

    // Update the email classification
    await prisma.processedEmail.update({
      where: { id: emailId },
      data: {
        classification: newClassification,
        classificationData: updatedClassificationData,
        // Reset status to CLASSIFIED since this is a manual correction
        status: "CLASSIFIED",
      },
    });

    revalidatePath("/dashboard/emails");

    return { success: true };
  } catch (error) {
    console.error("Error updating email classification:", error);
    return { error: "Failed to update classification" };
  }
}

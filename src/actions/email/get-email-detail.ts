"use server";

import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { fetchEmail } from "@/lib/email/gmail/read-email";
import { GmailError } from "@/lib/email/gmail/types";

/**
 * Get detailed information about a processed email, including full content from Gmail.
 */
export async function getEmailDetail(emailId: string) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Fetch the processed email with all relations
    const processedEmail = await prisma.processedEmail.findFirst({
      where: {
        id: emailId,
        userId: user.id,
      },
      include: {
        createdContact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdProject: {
          select: { id: true, name: true, projectType: true },
        },
        financialDocument: {
          select: {
            id: true,
            documentType: true,
            amount: true,
            currency: true,
            documentNumber: true,
            documentDate: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    if (!processedEmail) {
      return { error: "Email not found" };
    }

    // Try to fetch full email content from Gmail
    let emailContent: {
      body: string;
      htmlBody: string | null;
    } | null = null;
    let contentError: string | null = null;

    try {
      const gmailMessage = await fetchEmail(user.id, processedEmail.gmailMessageId);
      emailContent = {
        body: gmailMessage.body,
        htmlBody: gmailMessage.htmlBody,
      };
    } catch (error) {
      if (error instanceof GmailError) {
        if (error.code === "NOT_FOUND") {
          contentError = "Email content is no longer available in Gmail";
        } else if (error.code === "INVALID_GRANT") {
          contentError = "Gmail access expired. Please re-authenticate to view email content.";
        } else if (error.code === "RATE_LIMIT") {
          contentError = "Gmail rate limit reached. Please try again later.";
        } else {
          contentError = "Unable to fetch email content from Gmail";
        }
      } else {
        contentError = "Unable to fetch email content";
      }
      console.error("Error fetching email content:", error);
    }

    // Parse classificationData JSON safely
    let classificationData = null;
    if (processedEmail.classificationData) {
      try {
        classificationData =
          typeof processedEmail.classificationData === "string"
            ? JSON.parse(processedEmail.classificationData)
            : processedEmail.classificationData;
      } catch {
        console.error("Failed to parse classificationData");
      }
    }

    return {
      success: true,
      email: {
        id: processedEmail.id,
        gmailMessageId: processedEmail.gmailMessageId,
        gmailThreadId: processedEmail.gmailThreadId,
        subject: processedEmail.subject,
        fromEmail: processedEmail.fromEmail,
        fromName: processedEmail.fromName,
        receivedAt: processedEmail.receivedAt.toISOString(),
        snippet: processedEmail.snippet,
        classification: processedEmail.classification,
        status: processedEmail.status,
        errorMessage: processedEmail.errorMessage,
        retryCount: processedEmail.retryCount,
        classifiedAt: processedEmail.classifiedAt?.toISOString() || null,
        createdAt: processedEmail.createdAt.toISOString(),
        updatedAt: processedEmail.updatedAt.toISOString(),
        classificationData,
        createdContact: processedEmail.createdContact,
        createdProject: processedEmail.createdProject,
        financialDocument: processedEmail.financialDocument
          ? {
              ...processedEmail.financialDocument,
              amount: processedEmail.financialDocument.amount?.toString() || null,
              documentDate: processedEmail.financialDocument.documentDate?.toISOString() || null,
              dueDate: processedEmail.financialDocument.dueDate?.toISOString() || null,
            }
          : null,
      },
      emailContent,
      contentError,
    };
  } catch (error) {
    console.error("Error getting email detail:", error);
    return { error: "Failed to get email details" };
  }
}

"use server";

import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { EmailClassification, ProcessingStatus } from "@prisma/client";

interface GetProcessedEmailsParams {
  page?: number;
  limit?: number;
  classification?: EmailClassification | null;
  status?: ProcessingStatus;
}

/**
 * Get processed emails for the current user with pagination and filtering.
 */
export async function getProcessedEmails(params: GetProcessedEmailsParams = {}) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const { page = 1, limit = 20, classification, status } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      classification?: EmailClassification | null;
      status?: ProcessingStatus;
    } = { userId: user.id };

    if (classification !== undefined) {
      where.classification = classification;
    }

    if (status) {
      where.status = status;
    }

    // Get emails with pagination
    const [emails, total] = await Promise.all([
      prisma.processedEmail.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
        include: {
          createdContact: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdProject: {
            select: { id: true, name: true },
          },
          financialDocument: {
            select: { id: true, documentType: true, amount: true },
          },
        },
      }),
      prisma.processedEmail.count({ where }),
    ]);

    return {
      success: true,
      emails: emails.map((e) => ({
        ...e,
        receivedAt: e.receivedAt.toISOString(),
        classifiedAt: e.classifiedAt?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        financialDocument: e.financialDocument
          ? {
              ...e.financialDocument,
              amount: e.financialDocument.amount?.toString() || null,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error getting processed emails:", error);
    return { error: "Failed to get processed emails" };
  }
}

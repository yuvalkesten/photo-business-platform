"use server";

import { requireAuth } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { MessagePlatform, ProcessingStatus, EmailClassification } from "@prisma/client";

interface GetMessagesParams {
  page?: number;
  limit?: number;
  classification?: string;
  status?: string;
  senderHandle?: string;
}

/**
 * Get processed Instagram messages with pagination and filtering.
 */
export async function getInstagramMessages(params: GetMessagesParams = {}) {
  try {
    const user = await requireAuth();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const {
      page = 1,
      limit = 20,
      classification,
      status,
      senderHandle,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      userId: string;
      platform: typeof MessagePlatform.INSTAGRAM;
      classification?: EmailClassification;
      status?: ProcessingStatus;
      senderHandle?: { contains: string; mode: "insensitive" };
    } = {
      userId: user.id,
      platform: MessagePlatform.INSTAGRAM,
    };

    if (classification && Object.values(EmailClassification).includes(classification as EmailClassification)) {
      where.classification = classification as EmailClassification;
    }

    if (status && Object.values(ProcessingStatus).includes(status as ProcessingStatus)) {
      where.status = status as ProcessingStatus;
    }

    if (senderHandle) {
      where.senderHandle = { contains: senderHandle, mode: "insensitive" };
    }

    // Get messages and total count in parallel
    const [messages, total] = await Promise.all([
      prisma.processedMessage.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
        include: {
          createdContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdProject: {
            select: {
              id: true,
              name: true,
              projectType: true,
              status: true,
            },
          },
        },
      }),
      prisma.processedMessage.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error getting Instagram messages:", error);
    return { error: "Failed to get Instagram messages" };
  }
}

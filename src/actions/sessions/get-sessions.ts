"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { PhotoSessionStatus } from "@prisma/client"

export interface GetSessionsParams {
  projectId?: string
  status?: PhotoSessionStatus
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export async function getSessions(params: GetSessionsParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const {
      projectId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      project: {
        userId: user.id,
      },
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.scheduledAt = {}
      if (startDate) {
        where.scheduledAt.gte = startDate
      }
      if (endDate) {
        where.scheduledAt.lte = endDate
      }
    }

    // Get sessions with pagination
    const [sessions, totalCount] = await Promise.all([
      prisma.photoSession.findMany({
        where,
        include: {
          project: {
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [
          { scheduledAt: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.photoSession.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      success: true,
      sessions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching sessions:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch sessions" }
  }
}

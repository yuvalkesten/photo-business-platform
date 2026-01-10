"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export interface GetGalleriesParams {
  projectId?: string
  contactId?: string
  search?: string
  page?: number
  limit?: number
}

export async function getGalleries(params: GetGalleriesParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const {
      projectId,
      contactId,
      search,
      page = 1,
      limit = 50,
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: user.id,
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get galleries with pagination
    const [galleries, totalCount] = await Promise.all([
      prisma.gallery.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              projectType: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              photos: true,
            },
          },
        },
        orderBy: [
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.gallery.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      success: true,
      galleries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching galleries:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch galleries" }
  }
}

"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { OrgType } from "@prisma/client"

export interface GetOrganizationsParams {
  type?: OrgType
  search?: string
  page?: number
  limit?: number
}

export async function getOrganizations(params: GetOrganizationsParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const {
      type,
      search,
      page = 1,
      limit = 50,
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: user.id,
    }

    if (type) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get organizations with pagination
    const [organizations, totalCount] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              contacts: true,
              projects: true,
            },
          },
        },
        orderBy: [
          { name: "asc" },
        ],
        skip,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      success: true,
      organizations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching organizations:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch organizations" }
  }
}

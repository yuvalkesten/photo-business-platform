"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { ContactType, ContactStatus } from "@prisma/client"

export interface GetContactsParams {
  type?: ContactType
  status?: ContactStatus
  organizationId?: string
  search?: string
  page?: number
  limit?: number
}

export async function getContacts(params: GetContactsParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const {
      type,
      status,
      organizationId,
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

    if (status) {
      where.status = status
    }

    if (organizationId) {
      where.organizationId = organizationId
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get contacts with pagination
    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          organization: true,
          _count: {
            select: {
              projects: true,
              galleries: true,
            },
          },
        },
        orderBy: [
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      success: true,
      contacts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching contacts:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch contacts" }
  }
}

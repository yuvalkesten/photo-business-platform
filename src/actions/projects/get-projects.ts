"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { ProjectStatus, ProjectType } from "@prisma/client"

export interface GetProjectsParams {
  status?: ProjectStatus
  projectType?: ProjectType
  contactId?: string
  organizationId?: string
  search?: string
  page?: number
  limit?: number
  excludeLeads?: boolean // When true (default), excludes INQUIRY and PROPOSAL_SENT
}

export async function getProjects(params: GetProjectsParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const {
      status,
      projectType,
      contactId,
      organizationId,
      search,
      page = 1,
      limit = 50,
      excludeLeads = true, // Default to excluding leads
    } = params

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: user.id,
    }

    if (status) {
      where.status = status
    } else if (excludeLeads) {
      // Exclude lead statuses when not filtering by a specific status
      where.status = {
        notIn: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT],
      }
    }

    if (projectType) {
      where.projectType = projectType
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (organizationId) {
      where.organizationId = organizationId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { contact: { firstName: { contains: search, mode: "insensitive" } } },
        { contact: { lastName: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get projects with pagination
    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          sessions: {
            where: {
              scheduledAt: {
                gte: new Date(),
              },
            },
            orderBy: {
              scheduledAt: "asc",
            },
            take: 1,
          },
          _count: {
            select: {
              sessions: true,
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
      prisma.project.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Serialize Decimal values to numbers for client components
    const serializedProjects = projects.map((project) => ({
      ...project,
      budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
      budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
      totalPrice: project.totalPrice ? Number(project.totalPrice) : null,
      deposit: project.deposit ? Number(project.deposit) : null,
      paidAmount: project.paidAmount ? Number(project.paidAmount) : null,
    }))

    return {
      success: true,
      projects: serializedProjects,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    }
  } catch (error) {
    console.error("Error fetching projects:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch projects" }
  }
}

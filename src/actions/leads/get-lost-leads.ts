"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { ProjectStatus, LostReason } from "@prisma/client"

export interface GetLostLeadsParams {
  search?: string
  lostReason?: LostReason
  page?: number
  limit?: number
}

export async function getLostLeads(params: GetLostLeadsParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const { search, lostReason, page = 1, limit = 50 } = params

    // Build the where clause - cancelled leads that were never booked
    const where: any = {
      userId: user.id,
      status: ProjectStatus.CANCELLED,
      bookedAt: null, // Never reached booking stage
    }

    // Filter by lost reason
    if (lostReason) {
      where.lostReason = lostReason
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { firstName: { contains: search, mode: "insensitive" } } },
        { contact: { lastName: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Count total
    const total = await prisma.project.count({ where })

    // Fetch lost leads
    const lostLeads = await prisma.project.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Get counts by lost reason
    const reasonCounts = await prisma.project.groupBy({
      by: ["lostReason"],
      where: {
        userId: user.id,
        status: ProjectStatus.CANCELLED,
        bookedAt: null,
        lostReason: { not: null },
      },
      _count: true,
    })

    const reasonStats = reasonCounts.reduce(
      (acc, item) => {
        if (item.lostReason) {
          acc[item.lostReason] = item._count
        }
        return acc
      },
      {} as Record<string, number>
    )

    // Serialize Decimal values to numbers for client components
    const serializedLeads = lostLeads.map((lead) => ({
      ...lead,
      budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
      budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
      totalPrice: lead.totalPrice ? Number(lead.totalPrice) : null,
      deposit: lead.deposit ? Number(lead.deposit) : null,
      paidAmount: lead.paidAmount ? Number(lead.paidAmount) : null,
    }))

    return {
      success: true,
      lostLeads: serializedLeads,
      stats: {
        total,
        byReason: reasonStats,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error("Error fetching lost leads:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch lost leads" }
  }
}

"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { ProjectStatus, LeadTemperature } from "@prisma/client"

export interface GetLeadsParams {
  search?: string
  temperature?: LeadTemperature
  status?: "INQUIRY" | "PROPOSAL_SENT"
  overdueFollowUp?: boolean
  page?: number
  limit?: number
}

export async function getLeads(params: GetLeadsParams = {}) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const {
      search,
      temperature,
      status,
      overdueFollowUp,
      page = 1,
      limit = 50,
    } = params

    // Build the where clause
    const where: any = {
      userId: user.id,
      // Only leads (INQUIRY or PROPOSAL_SENT status)
      status: status
        ? status
        : { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
    }

    // Filter by temperature
    if (temperature) {
      where.leadTemperature = temperature
    }

    // Filter for overdue follow-ups
    if (overdueFollowUp) {
      where.nextFollowUpDate = {
        lt: new Date(),
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { firstName: { contains: search, mode: "insensitive" } } },
        { contact: { lastName: { contains: search, mode: "insensitive" } } },
        { contact: { email: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Count total leads
    const total = await prisma.project.count({ where })

    // Fetch leads with pagination
    const leads = await prisma.project.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            type: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        sessions: {
          where: { status: "SCHEDULED" },
          orderBy: { scheduledAt: "asc" },
          take: 1,
          select: {
            id: true,
            title: true,
            scheduledAt: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            galleries: true,
          },
        },
      },
      orderBy: [
        // Hot leads first
        { leadTemperature: "asc" },
        // Then by follow-up date (overdue first)
        { nextFollowUpDate: "asc" },
        // Then by created date (newest first)
        { createdAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Get counts by status and temperature for quick stats
    const [inquiryCount, proposalSentCount, hotCount, warmCount, coldCount, overdueCount] =
      await Promise.all([
        prisma.project.count({
          where: { userId: user.id, status: ProjectStatus.INQUIRY },
        }),
        prisma.project.count({
          where: { userId: user.id, status: ProjectStatus.PROPOSAL_SENT },
        }),
        prisma.project.count({
          where: {
            userId: user.id,
            status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
            leadTemperature: LeadTemperature.HOT,
          },
        }),
        prisma.project.count({
          where: {
            userId: user.id,
            status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
            leadTemperature: LeadTemperature.WARM,
          },
        }),
        prisma.project.count({
          where: {
            userId: user.id,
            status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
            leadTemperature: LeadTemperature.COLD,
          },
        }),
        prisma.project.count({
          where: {
            userId: user.id,
            status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
            nextFollowUpDate: { lt: new Date() },
          },
        }),
      ])

    // Serialize Decimal values to numbers for client components
    const serializedLeads = leads.map((lead) => ({
      ...lead,
      budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
      budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
      totalPrice: lead.totalPrice ? Number(lead.totalPrice) : null,
      deposit: lead.deposit ? Number(lead.deposit) : null,
      paidAmount: lead.paidAmount ? Number(lead.paidAmount) : null,
    }))

    return {
      success: true,
      leads: serializedLeads,
      stats: {
        total: inquiryCount + proposalSentCount,
        inquiry: inquiryCount,
        proposalSent: proposalSentCount,
        hot: hotCount,
        warm: warmCount,
        cold: coldCount,
        overdueFollowUps: overdueCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error("Error fetching leads:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch leads" }
  }
}

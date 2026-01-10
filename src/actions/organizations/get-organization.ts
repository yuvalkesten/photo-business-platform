"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getOrganization(organizationId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        contacts: {
          orderBy: { createdAt: "desc" },
        },
        projects: {
          include: {
            contact: true,
            _count: {
              select: {
                sessions: true,
                galleries: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!organization) {
      return { error: "Organization not found" }
    }

    if (organization.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    return { success: true, organization }
  } catch (error) {
    console.error("Error fetching organization:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch organization" }
  }
}

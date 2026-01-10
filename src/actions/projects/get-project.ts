"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getProject(projectId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        contact: true,
        organization: true,
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        galleries: {
          include: {
            _count: {
              select: {
                photos: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!project) {
      return { error: "Project not found" }
    }

    if (project.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Serialize Decimal values to numbers for client components
    const serializedProject = {
      ...project,
      budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
      budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
      totalPrice: project.totalPrice ? Number(project.totalPrice) : null,
      deposit: project.deposit ? Number(project.deposit) : null,
      paidAmount: project.paidAmount ? Number(project.paidAmount) : null,
    }

    return { success: true, project: serializedProject }
  } catch (error) {
    console.error("Error fetching project:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch project" }
  }
}

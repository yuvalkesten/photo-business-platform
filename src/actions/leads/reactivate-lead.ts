"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { ProjectStatus } from "@prisma/client"

export async function reactivateLead(projectId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!existingProject) {
      return { error: "Project not found" }
    }

    if (existingProject.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Verify it's a cancelled lead (never reached BOOKED)
    if (existingProject.status !== ProjectStatus.CANCELLED) {
      return { error: "Only cancelled leads can be reactivated" }
    }

    // If it was ever booked, it can't be reactivated as a lead
    if (existingProject.bookedAt) {
      return { error: "This project was previously booked and cannot be reactivated as a lead" }
    }

    // Reactivate the lead to INQUIRY status
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.INQUIRY,
        lostReason: null,
        lostNotes: null,
      },
      include: {
        contact: true,
        organization: true,
      },
    })

    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/leads/lost")
    revalidatePath(`/dashboard/projects/${projectId}`)

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
    console.error("Error reactivating lead:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to reactivate lead" }
  }
}

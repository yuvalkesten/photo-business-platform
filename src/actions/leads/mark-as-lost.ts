"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { markAsLostSchema } from "@/lib/validations/project.schema"
import { ProjectStatus } from "@prisma/client"

export async function markLeadAsLost(projectId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = markAsLostSchema.parse(data)

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

    // Verify it's a lead (INQUIRY or PROPOSAL_SENT)
    if (
      existingProject.status !== ProjectStatus.INQUIRY &&
      existingProject.status !== ProjectStatus.PROPOSAL_SENT
    ) {
      return { error: "Only leads can be marked as lost" }
    }

    // Update the project to CANCELLED status with lost reason
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.CANCELLED,
        lostReason: validatedData.lostReason,
        lostNotes: validatedData.lostNotes,
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
    console.error("Error marking lead as lost:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to mark lead as lost" }
  }
}

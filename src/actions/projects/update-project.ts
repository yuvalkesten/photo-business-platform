"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updateProjectSchema } from "@/lib/validations/project.schema"
import { ProjectStatus } from "@prisma/client"

export async function updateProject(projectId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updateProjectSchema.parse(data)

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

    // If contactId is being changed, verify the new contact belongs to the user
    if (validatedData.contactId && validatedData.contactId !== existingProject.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: validatedData.contactId },
      })

      if (!contact || contact.userId !== user.id) {
        return { error: "Contact not found or unauthorized" }
      }
    }

    // If organizationId is being changed, verify it belongs to the user
    if (validatedData.organizationId !== undefined) {
      if (validatedData.organizationId) {
        const organization = await prisma.organization.findUnique({
          where: { id: validatedData.organizationId },
        })

        if (!organization || organization.userId !== user.id) {
          return { error: "Organization not found or unauthorized" }
        }
      }
    }

    // Auto-set completedAt and bookedAt based on status changes
    const updateData: any = {
      ...validatedData,
      tags: validatedData.tags !== undefined ? validatedData.tags : undefined,
    }

    // Set bookedAt when first moving to BOOKED status
    if (validatedData.status === ProjectStatus.BOOKED && !existingProject.bookedAt) {
      updateData.bookedAt = new Date()
    }

    // Set completedAt when moving to COMPLETED status
    if (validatedData.status === ProjectStatus.COMPLETED && !existingProject.completedAt) {
      updateData.completedAt = new Date()
    } else if (validatedData.status && validatedData.status !== ProjectStatus.COMPLETED) {
      updateData.completedAt = null
    }

    // Update the project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        contact: true,
        organization: true,
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        _count: {
          select: {
            sessions: true,
            galleries: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath("/dashboard/leads")
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
    console.error("Error updating project:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update project" }
  }
}

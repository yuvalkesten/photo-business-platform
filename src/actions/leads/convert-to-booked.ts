"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { convertToBookedSchema } from "@/lib/validations/project.schema"
import { ProjectStatus, ContactType } from "@prisma/client"

export async function convertToBooked(projectId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = convertToBookedSchema.parse(data)

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { contact: true },
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
      return { error: "Only leads can be converted to booked projects" }
    }

    // Update the project to BOOKED status
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.BOOKED,
        bookedAt: new Date(),
        totalPrice: validatedData.totalPrice ?? existingProject.totalPrice,
        deposit: validatedData.deposit ?? existingProject.deposit,
      },
      include: {
        contact: true,
        organization: true,
      },
    })

    // Update contact type from LEAD to CLIENT
    if (existingProject.contact.type === ContactType.LEAD) {
      await prisma.contact.update({
        where: { id: existingProject.contactId },
        data: { type: ContactType.CLIENT },
      })
    }

    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/projects")
    revalidatePath("/dashboard/contacts")
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
    console.error("Error converting lead to booked:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to convert lead" }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { createProjectSchema } from "@/lib/validations/project.schema"
import { ProjectStatus } from "@prisma/client"

export async function createProject(data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = createProjectSchema.parse(data)

    // Verify the contact belongs to the user
    const contact = await prisma.contact.findUnique({
      where: { id: validatedData.contactId },
    })

    if (!contact || contact.userId !== user.id) {
      return { error: "Contact not found or unauthorized" }
    }

    // If organizationId is provided, verify it belongs to the user
    if (validatedData.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: validatedData.organizationId },
      })

      if (!organization || organization.userId !== user.id) {
        return { error: "Organization not found or unauthorized" }
      }
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        contactId: validatedData.contactId,
        organizationId: validatedData.organizationId,
        name: validatedData.name,
        description: validatedData.description,
        projectType: validatedData.projectType,
        status: validatedData.status || ProjectStatus.INQUIRY,
        totalPrice: validatedData.totalPrice,
        deposit: validatedData.deposit,
        paidAmount: validatedData.paidAmount || 0,
        source: validatedData.source,
        notes: validatedData.notes,
        tags: validatedData.tags || [],
        // CRM Lead Fields
        budgetMin: validatedData.budgetMin,
        budgetMax: validatedData.budgetMax,
        leadTemperature: validatedData.leadTemperature,
        nextFollowUpDate: validatedData.nextFollowUpDate,
        lastContactDate: validatedData.lastContactDate,
        expectedCloseDate: validatedData.expectedCloseDate,
        closeProbability: validatedData.closeProbability,
        eventDate: validatedData.eventDate,
      },
      include: {
        contact: true,
        organization: true,
      },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath("/dashboard/leads")
    revalidatePath("/dashboard/contacts")

    return { success: true, project }
  } catch (error) {
    console.error("Error creating project:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to create project" }
  }
}

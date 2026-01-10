"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function deleteOrganization(organizationId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Check if organization exists and belongs to user
    const existingOrganization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        contacts: true,
        projects: true,
      },
    })

    if (!existingOrganization) {
      return { error: "Organization not found" }
    }

    if (existingOrganization.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Check if organization has contacts or projects
    if (existingOrganization.contacts.length > 0) {
      return {
        error: `Cannot delete organization with ${existingOrganization.contacts.length} associated contact(s). Please remove or reassign the contacts first.`,
      }
    }

    if (existingOrganization.projects.length > 0) {
      return {
        error: `Cannot delete organization with ${existingOrganization.projects.length} associated project(s). Please remove or reassign the projects first.`,
      }
    }

    // Delete the organization
    await prisma.organization.delete({
      where: { id: organizationId },
    })

    revalidatePath("/dashboard/organizations")

    return { success: true }
  } catch (error) {
    console.error("Error deleting organization:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to delete organization" }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function deleteContact(contactId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Check if contact exists and belongs to user
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        projects: true,
        galleries: true,
      },
    })

    if (!existingContact) {
      return { error: "Contact not found" }
    }

    if (existingContact.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Check if contact has active projects
    const activeProjects = existingContact.projects.filter(
      (project) => project.status !== "COMPLETED" && project.status !== "CANCELLED" && project.status !== "ARCHIVED"
    )

    if (activeProjects.length > 0) {
      return {
        error: `Cannot delete contact with ${activeProjects.length} active project(s). Please complete or cancel the projects first.`,
      }
    }

    // Delete the contact (cascading will handle related records)
    await prisma.contact.delete({
      where: { id: contactId },
    })

    revalidatePath("/dashboard/contacts")

    return { success: true }
  } catch (error) {
    console.error("Error deleting contact:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to delete contact" }
  }
}

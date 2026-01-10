"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updateContactSchema } from "@/lib/validations/contact.schema"

export async function updateContact(contactId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updateContactSchema.parse(data)

    // Check if contact exists and belongs to user
    const existingContact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!existingContact) {
      return { error: "Contact not found" }
    }

    if (existingContact.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // If email is being changed, check for duplicates
    if (validatedData.email && validatedData.email !== existingContact.email) {
      const duplicateContact = await prisma.contact.findUnique({
        where: {
          userId_email: {
            userId: user.id,
            email: validatedData.email,
          },
        },
      })

      if (duplicateContact) {
        return { error: "A contact with this email already exists" }
      }
    }

    // Update the contact
    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...validatedData,
        tags: validatedData.tags !== undefined ? validatedData.tags : undefined,
      },
      include: {
        organization: true,
        projects: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    revalidatePath("/dashboard/contacts")
    revalidatePath(`/dashboard/contacts/${contactId}`)

    return { success: true, contact }
  } catch (error) {
    console.error("Error updating contact:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update contact" }
  }
}

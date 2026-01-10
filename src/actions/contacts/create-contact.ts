"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { createContactSchema } from "@/lib/validations/contact.schema"
import { ContactType, ContactStatus } from "@prisma/client"

export async function createContact(data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = createContactSchema.parse(data)

    // Check if contact with same email already exists for this user
    const existingContact = await prisma.contact.findUnique({
      where: {
        userId_email: {
          userId: user.id,
          email: validatedData.email,
        },
      },
    })

    if (existingContact) {
      return { error: "A contact with this email already exists" }
    }

    // Create the contact
    const contact = await prisma.contact.create({
      data: {
        userId: user.id,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        organizationId: validatedData.organizationId,
        jobTitle: validatedData.jobTitle,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        website: validatedData.website,
        type: validatedData.type || ContactType.LEAD,
        source: validatedData.source,
        tags: validatedData.tags || [],
        status: validatedData.status || ContactStatus.ACTIVE,
        notes: validatedData.notes,
      },
      include: {
        organization: true,
      },
    })

    revalidatePath("/dashboard/contacts")

    return { success: true, contact }
  } catch (error) {
    console.error("Error creating contact:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to create contact" }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { createOrganizationSchema } from "@/lib/validations/organization.schema"

export async function createOrganization(data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = createOrganizationSchema.parse(data)

    // Check if organization with same name already exists for this user
    const existingOrganization = await prisma.organization.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: validatedData.name,
        },
      },
    })

    if (existingOrganization) {
      return { error: "An organization with this name already exists" }
    }

    // Create the organization
    const organization = await prisma.organization.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        type: validatedData.type,
        website: validatedData.website,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        notes: validatedData.notes,
        tags: validatedData.tags || [],
      },
    })

    revalidatePath("/dashboard/organizations")

    return { success: true, organization }
  } catch (error) {
    console.error("Error creating organization:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to create organization" }
  }
}

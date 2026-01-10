"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updateOrganizationSchema } from "@/lib/validations/organization.schema"

export async function updateOrganization(organizationId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updateOrganizationSchema.parse(data)

    // Check if organization exists and belongs to user
    const existingOrganization = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!existingOrganization) {
      return { error: "Organization not found" }
    }

    if (existingOrganization.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // If name is being changed, check for duplicates
    if (validatedData.name && validatedData.name !== existingOrganization.name) {
      const duplicateOrganization = await prisma.organization.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name: validatedData.name,
          },
        },
      })

      if (duplicateOrganization) {
        return { error: "An organization with this name already exists" }
      }
    }

    // Update the organization
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...validatedData,
        tags: validatedData.tags !== undefined ? validatedData.tags : undefined,
      },
      include: {
        _count: {
          select: {
            contacts: true,
            projects: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/organizations")
    revalidatePath(`/dashboard/organizations/${organizationId}`)

    return { success: true, organization }
  } catch (error) {
    console.error("Error updating organization:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update organization" }
  }
}

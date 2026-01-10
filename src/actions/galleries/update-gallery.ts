"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updateGallerySchema } from "@/lib/validations/gallery.schema"
import bcrypt from "bcryptjs"

export async function updateGallery(galleryId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updateGallerySchema.parse(data)

    // Check if gallery exists and belongs to user
    const existingGallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
    })

    if (!existingGallery) {
      return { error: "Gallery not found" }
    }

    if (existingGallery.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // If projectId is being changed, verify the new project belongs to the user
    if (validatedData.projectId && validatedData.projectId !== existingGallery.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      })

      if (!project || project.userId !== user.id) {
        return { error: "Project not found or unauthorized" }
      }
    }

    // If contactId is being changed, verify the new contact belongs to the user
    if (validatedData.contactId && validatedData.contactId !== existingGallery.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: validatedData.contactId },
      })

      if (!contact || contact.userId !== user.id) {
        return { error: "Contact not found or unauthorized" }
      }
    }

    // Hash password if provided
    const updateData: any = { ...validatedData }
    if (validatedData.password !== undefined) {
      if (validatedData.password) {
        updateData.password = await bcrypt.hash(validatedData.password, 10)
      } else {
        updateData.password = null
      }
    }

    // Update the gallery
    const gallery = await prisma.gallery.update({
      where: { id: galleryId },
      data: updateData,
      include: {
        project: {
          include: {
            contact: true,
          },
        },
        contact: true,
        _count: {
          select: {
            photos: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/galleries")
    revalidatePath(`/dashboard/galleries/${galleryId}`)
    revalidatePath(`/dashboard/projects/${existingGallery.projectId}`)

    return { success: true, gallery }
  } catch (error) {
    console.error("Error updating gallery:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update gallery" }
  }
}

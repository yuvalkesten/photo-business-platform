"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { createGallerySchema } from "@/lib/validations/gallery.schema"
import bcrypt from "bcryptjs"

export async function createGallery(data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = createGallerySchema.parse(data)

    // Verify the project belongs to the user
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      include: {
        contact: true,
      },
    })

    if (!project || project.userId !== user.id) {
      return { error: "Project not found or unauthorized" }
    }

    // Verify the contact belongs to the user
    const contact = await prisma.contact.findUnique({
      where: { id: validatedData.contactId },
    })

    if (!contact || contact.userId !== user.id) {
      return { error: "Contact not found or unauthorized" }
    }

    // Hash password if provided
    let hashedPassword: string | undefined
    if (validatedData.password) {
      hashedPassword = await bcrypt.hash(validatedData.password, 10)
    }

    // Create the gallery
    const gallery = await prisma.gallery.create({
      data: {
        userId: user.id,
        projectId: validatedData.projectId,
        contactId: validatedData.contactId,
        title: validatedData.title,
        description: validatedData.description,
        coverImage: validatedData.coverImage,
        isPublic: validatedData.isPublic,
        password: hashedPassword,
        expiresAt: validatedData.expiresAt,
        allowDownload: validatedData.allowDownload,
        watermark: validatedData.watermark,
        requireEmail: validatedData.requireEmail,
        theme: validatedData.theme,
        gridStyle: validatedData.gridStyle,
        fontFamily: validatedData.fontFamily,
        primaryColor: validatedData.primaryColor,
        accentColor: validatedData.accentColor,
        downloadResolution: validatedData.downloadResolution,
        favoriteLimit: validatedData.favoriteLimit ?? null,
      },
      include: {
        project: {
          include: {
            contact: true,
          },
        },
        contact: true,
      },
    })

    revalidatePath("/dashboard/galleries")
    revalidatePath(`/dashboard/projects/${validatedData.projectId}`)

    return { success: true, gallery }
  } catch (error) {
    console.error("Error creating gallery:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to create gallery" }
  }
}

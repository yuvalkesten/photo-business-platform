"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getGallery(galleryId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: {
        project: {
          include: {
            contact: true,
          },
        },
        contact: true,
        photos: {
          orderBy: [
            { order: "asc" },
            { uploadedAt: "desc" },
          ],
        },
        photoSets: {
          orderBy: { order: "asc" },
          include: {
            _count: {
              select: { photos: true },
            },
          },
        },
      },
    })

    if (!gallery) {
      return { error: "Gallery not found" }
    }

    if (gallery.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    return { success: true, gallery }
  } catch (error) {
    console.error("Error fetching gallery:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch gallery" }
  }
}

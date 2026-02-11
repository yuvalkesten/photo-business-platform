"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { deleteCollection } from "@/lib/aws/rekognition"

export async function deleteGallery(galleryId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Check if gallery exists and belongs to user
    const existingGallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    })

    if (!existingGallery) {
      return { error: "Gallery not found" }
    }

    if (existingGallery.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Check if gallery has photos
    if (existingGallery._count.photos > 0) {
      return {
        error: `Cannot delete gallery with ${existingGallery._count.photos} photo(s). Please delete the photos first.`,
      }
    }

    // Clean up Rekognition collection if it exists
    if (existingGallery.rekognitionCollectionId) {
      try {
        await deleteCollection(existingGallery.rekognitionCollectionId)
      } catch (error) {
        console.warn("Failed to delete Rekognition collection:", error)
      }
    }

    // Delete the gallery
    await prisma.gallery.delete({
      where: { id: galleryId },
    })

    revalidatePath("/dashboard/galleries")
    revalidatePath(`/dashboard/projects/${existingGallery.projectId}`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting gallery:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to delete gallery" }
  }
}

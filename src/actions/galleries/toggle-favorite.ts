"use server"

import { prisma } from "@/lib/db"

export async function toggleFavorite(data: {
  galleryId: string
  photoId: string
  listId: string
}) {
  try {
    const { galleryId, photoId, listId } = data

    // Verify photo belongs to gallery
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, galleryId },
    })
    if (!photo) return { error: "Photo not found" }

    // Check if already favorited
    const existing = await prisma.favoritePhoto.findUnique({
      where: {
        favoriteListId_photoId: {
          favoriteListId: listId,
          photoId,
        },
      },
    })

    if (existing) {
      // Remove from favorites
      await prisma.favoritePhoto.delete({
        where: { id: existing.id },
      })
      return { success: true, favorited: false }
    } else {
      // Add to favorites
      await prisma.favoritePhoto.create({
        data: {
          favoriteListId: listId,
          photoId,
        },
      })
      return { success: true, favorited: true }
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return { error: "Failed to update favorite" }
  }
}

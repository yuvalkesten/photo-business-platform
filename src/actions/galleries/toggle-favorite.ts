"use server"

import { prisma } from "@/lib/db"

export async function toggleFavorite(data: {
  galleryId: string
  photoId: string
  listId: string
  comment?: string
}) {
  try {
    const { galleryId, photoId, listId, comment } = data

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
      // Check favorite limit before adding
      const gallery = await prisma.gallery.findUnique({
        where: { id: galleryId },
        select: { favoriteLimit: true },
      })

      if (gallery?.favoriteLimit) {
        const currentCount = await prisma.favoritePhoto.count({
          where: { favoriteListId: listId },
        })
        if (currentCount >= gallery.favoriteLimit) {
          return { error: `Selection limit of ${gallery.favoriteLimit} reached` }
        }
      }

      // Add to favorites
      await prisma.favoritePhoto.create({
        data: {
          favoriteListId: listId,
          photoId,
          comment: comment || null,
        },
      })
      return { success: true, favorited: true }
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return { error: "Failed to update favorite" }
  }
}

export async function updateFavoriteComment(data: {
  galleryId: string
  photoId: string
  listId: string
  comment: string
}) {
  try {
    const { galleryId, photoId, listId, comment } = data

    // Verify photo belongs to gallery
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, galleryId },
    })
    if (!photo) return { error: "Photo not found" }

    await prisma.favoritePhoto.update({
      where: {
        favoriteListId_photoId: {
          favoriteListId: listId,
          photoId,
        },
      },
      data: { comment },
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating favorite comment:", error)
    return { error: "Failed to update comment" }
  }
}

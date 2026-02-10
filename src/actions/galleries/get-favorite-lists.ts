"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getFavoriteLists(galleryId: string) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true },
    })

    if (!gallery || gallery.userId !== user.id) {
      return { error: "Gallery not found" }
    }

    const lists = await prisma.favoriteList.findMany({
      where: {
        galleryId,
        submittedAt: { not: null },
      },
      include: {
        photos: {
          include: {
            photo: {
              select: {
                id: true,
                filename: true,
                thumbnailUrl: true,
                s3Url: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    })

    return { success: true, lists }
  } catch (error) {
    console.error("Error fetching favorite lists:", error)
    return { error: "Failed to fetch favorites" }
  }
}

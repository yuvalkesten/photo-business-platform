"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function setCoverImage(galleryId: string, photoId: string) {
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

    // Get the photo
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, galleryId },
      select: { thumbnailUrl: true, s3Url: true },
    })

    if (!photo) {
      return { error: "Photo not found" }
    }

    await prisma.gallery.update({
      where: { id: galleryId },
      data: { coverImage: photo.thumbnailUrl || photo.s3Url },
    })

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error setting cover image:", error)
    return { error: "Failed to set cover image" }
  }
}

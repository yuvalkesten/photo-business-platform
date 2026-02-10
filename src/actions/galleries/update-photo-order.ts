"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function updatePhotoOrder(
  galleryId: string,
  photoIds: string[]
) {
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

    // Update order for each photo
    await prisma.$transaction(
      photoIds.map((photoId, index) =>
        prisma.photo.update({
          where: { id: photoId },
          data: { order: index },
        })
      )
    )

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating photo order:", error)
    return { error: "Failed to update photo order" }
  }
}

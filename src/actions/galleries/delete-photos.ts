"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { deleteS3Objects } from "@/lib/s3"

export async function deletePhotos(galleryId: string, photoIds: string[]) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    if (!photoIds || photoIds.length === 0) {
      return { error: "No photos selected" }
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true, coverImage: true },
    })

    if (!gallery || gallery.userId !== user.id) {
      return { error: "Gallery not found" }
    }

    // Get photos to delete (verify they belong to this gallery)
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        galleryId,
      },
      select: { id: true, s3Key: true, thumbnailUrl: true, s3Url: true },
    })

    if (photos.length === 0) {
      return { error: "No matching photos found" }
    }

    // Collect S3 keys to delete (original + thumbnails)
    const s3Keys: string[] = []
    for (const photo of photos) {
      s3Keys.push(photo.s3Key)
      // Thumbnail has a different key pattern
      const thumbnailKey = photo.s3Key.replace(/^galleries\//, "galleries/thumbnails/")
      s3Keys.push(thumbnailKey)
    }

    // Delete from S3
    await deleteS3Objects(s3Keys)

    // Delete from database
    await prisma.photo.deleteMany({
      where: {
        id: { in: photos.map((p) => p.id) },
        galleryId,
      },
    })

    // If cover image was one of the deleted photos, clear it
    const deletedUrls = photos.flatMap((p) => [p.s3Url, p.thumbnailUrl].filter(Boolean))
    if (gallery.coverImage && deletedUrls.includes(gallery.coverImage)) {
      const nextPhoto = await prisma.photo.findFirst({
        where: { galleryId },
        orderBy: { order: "asc" },
        select: { thumbnailUrl: true, s3Url: true },
      })
      await prisma.gallery.update({
        where: { id: galleryId },
        data: { coverImage: nextPhoto?.thumbnailUrl || nextPhoto?.s3Url || null },
      })
    }

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true, deletedCount: photos.length }
  } catch (error) {
    console.error("Error deleting photos:", error)
    return { error: "Failed to delete photos" }
  }
}

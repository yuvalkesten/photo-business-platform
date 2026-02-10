"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function createPhotoSet(galleryId: string, name: string) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true },
    })
    if (!gallery || gallery.userId !== user.id) return { error: "Gallery not found" }

    // Get max order
    const maxOrder = await prisma.photoSet.findFirst({
      where: { galleryId },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const set = await prisma.photoSet.create({
      data: {
        galleryId,
        name,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true, set }
  } catch (error) {
    console.error("Error creating photo set:", error)
    return { error: "Failed to create photo set" }
  }
}

export async function updatePhotoSet(
  setId: string,
  data: { name?: string; description?: string | null }
) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    const existing = await prisma.photoSet.findUnique({
      where: { id: setId },
      include: { gallery: { select: { userId: true, id: true } } },
    })
    if (!existing || existing.gallery.userId !== user.id) return { error: "Not found" }

    const set = await prisma.photoSet.update({
      where: { id: setId },
      data,
    })

    revalidatePath(`/dashboard/galleries/${existing.galleryId}`)
    return { success: true, set }
  } catch (error) {
    console.error("Error updating photo set:", error)
    return { error: "Failed to update photo set" }
  }
}

export async function deletePhotoSet(setId: string) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    const existing = await prisma.photoSet.findUnique({
      where: { id: setId },
      include: { gallery: { select: { userId: true, id: true } } },
    })
    if (!existing || existing.gallery.userId !== user.id) return { error: "Not found" }

    // Photos with this setId will have setId set to null (onDelete: SetNull)
    await prisma.photoSet.delete({ where: { id: setId } })

    revalidatePath(`/dashboard/galleries/${existing.galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting photo set:", error)
    return { error: "Failed to delete photo set" }
  }
}

export async function reorderPhotoSets(galleryId: string, setIds: string[]) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true },
    })
    if (!gallery || gallery.userId !== user.id) return { error: "Gallery not found" }

    await prisma.$transaction(
      setIds.map((id, index) =>
        prisma.photoSet.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error reordering photo sets:", error)
    return { error: "Failed to reorder photo sets" }
  }
}

export async function assignPhotosToSet(
  galleryId: string,
  photoIds: string[],
  setId: string | null
) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true },
    })
    if (!gallery || gallery.userId !== user.id) return { error: "Gallery not found" }

    await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
        galleryId,
      },
      data: { setId },
    })

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error assigning photos to set:", error)
    return { error: "Failed to assign photos" }
  }
}

"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getGalleryVisitors(galleryId: string) {
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

    const visitors = await prisma.galleryVisitor.findMany({
      where: { galleryId },
      orderBy: { visitedAt: "desc" },
    })

    return { success: true, visitors }
  } catch (error) {
    console.error("Error fetching visitors:", error)
    return { error: "Failed to fetch visitors" }
  }
}

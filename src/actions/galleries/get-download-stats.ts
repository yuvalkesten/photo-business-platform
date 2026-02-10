"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getDownloadStats(galleryId: string) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true },
    })
    if (!gallery || gallery.userId !== user.id) return { error: "Gallery not found" }

    const [totalDownloads, downloadsByType, recentDownloads, topPhotos] = await Promise.all([
      // Total downloads
      prisma.downloadEvent.count({
        where: { galleryId },
      }),

      // Downloads by type
      prisma.downloadEvent.groupBy({
        by: ["type"],
        where: { galleryId },
        _count: true,
      }),

      // Recent downloads
      prisma.downloadEvent.findMany({
        where: { galleryId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          photoId: true,
          visitorEmail: true,
          resolution: true,
          type: true,
          createdAt: true,
        },
      }),

      // Top downloaded photos
      prisma.downloadEvent.groupBy({
        by: ["photoId"],
        where: {
          galleryId,
          photoId: { not: null },
        },
        _count: true,
        orderBy: { _count: { photoId: "desc" } },
        take: 5,
      }),
    ])

    return {
      success: true,
      stats: {
        totalDownloads,
        downloadsByType: downloadsByType.map((d) => ({
          type: d.type,
          count: d._count,
        })),
        recentDownloads: recentDownloads.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        })),
        topPhotos: topPhotos.map((d) => ({
          photoId: d.photoId,
          count: d._count,
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching download stats:", error)
    return { error: "Failed to fetch download stats" }
  }
}

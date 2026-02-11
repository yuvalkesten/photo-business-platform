import { prisma } from "@/lib/db"
import { analyzePhoto } from "./analyze-photo"
import { clusterPersons } from "./person-clustering"

const BATCH_SIZE = 5
const BATCH_DELAY_MS = 1000

export async function analyzeGallery(galleryId: string): Promise<void> {
  // Get all photos that don't have a COMPLETED analysis
  const photos = await prisma.photo.findMany({
    where: {
      galleryId,
      OR: [
        { analysis: null },
        { analysis: { status: { not: "COMPLETED" } } },
      ],
    },
    select: { id: true },
    orderBy: { order: "asc" },
  })

  if (photos.length === 0) {
    // All photos already analyzed — ensure gallery is marked ready
    await prisma.gallery.update({
      where: { id: galleryId },
      data: { analysisProgress: 100, aiSearchEnabled: true },
    })
    return
  }

  const totalPhotos = await prisma.photo.count({ where: { galleryId } })
  const alreadyCompleted = totalPhotos - photos.length
  let completed = alreadyCompleted

  // Create PENDING records for photos without analysis
  const existingAnalyses = await prisma.photoAnalysis.findMany({
    where: { galleryId },
    select: { photoId: true },
  })
  const existingPhotoIds = new Set(existingAnalyses.map((a) => a.photoId))

  const newPhotos = photos.filter((p) => !existingPhotoIds.has(p.id))
  if (newPhotos.length > 0) {
    await prisma.photoAnalysis.createMany({
      data: newPhotos.map((p) => ({
        photoId: p.id,
        galleryId,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    })
  }

  // Process in batches
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(
      batch.map((photo) => analyzePhoto(photo.id, galleryId))
    )

    completed += batch.length
    const progress = Math.round((completed / totalPhotos) * 100)

    await prisma.gallery.update({
      where: { id: galleryId },
      data: { analysisProgress: Math.min(progress, 99) },
    })

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < photos.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  // Run person clustering
  try {
    await clusterPersons(galleryId)
  } catch (error) {
    console.error(`Person clustering failed for gallery ${galleryId}:`, error)
  }

  // Mark gallery as complete
  await prisma.gallery.update({
    where: { id: galleryId },
    data: { analysisProgress: 100, aiSearchEnabled: true },
  })
}

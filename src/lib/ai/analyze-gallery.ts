import { prisma } from "@/lib/db"
import { analyzePhoto } from "./analyze-photo"
import { clusterPersons } from "./person-clustering"
import { ensureCollection } from "./index-faces"

const BATCH_SIZE = 3
const BATCH_DELAY_MS = 2000
const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [2000, 4000, 8000]
const RATE_LIMIT_DELAY_MS = 30000

// Error codes that are worth retrying (transient failures)
const RETRYABLE_ERROR_PREFIXES = ["[TIMEOUT]", "[RATE_LIMIT]", "[API_ERROR]"]

export async function analyzeGallery(galleryId: string): Promise<void> {
  const galleryStartTime = Date.now()

  console.log(JSON.stringify({
    event: "gallery_analysis_start",
    galleryId,
  }))

  // Step 0: Ensure Rekognition collection exists
  let collectionId: string | undefined
  try {
    collectionId = await ensureCollection(galleryId)
  } catch (error) {
    // Non-fatal: analysis will proceed without face indexing
    console.warn(`Failed to create Rekognition collection for ${galleryId}:`,
      error instanceof Error ? error.message : error)
  }

  // Step 1: Clean up stale PROCESSING records (orphans from crashed runs)
  await resetStaleProcessingRecords(galleryId)

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
  const totalBatches = Math.ceil(photos.length / BATCH_SIZE)
  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE)

    console.log(JSON.stringify({
      event: "batch_start",
      galleryId,
      batchIndex,
      batchSize: batch.length,
      totalBatches,
    }))

    const batchStartTime = Date.now()

    await Promise.allSettled(
      batch.map((photo) => analyzePhoto(photo.id, galleryId, collectionId))
    )

    console.log(JSON.stringify({
      event: "batch_complete",
      galleryId,
      batchIndex,
      durationMs: Date.now() - batchStartTime,
    }))

    // Update progress from actual DB state
    await updateProgressFromDb(galleryId, totalPhotos)

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < photos.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  // Step 3: Automatic retry loop for transient failures
  await retryFailedPhotos(galleryId, totalPhotos, collectionId)

  // Run person clustering
  try {
    await clusterPersons(galleryId)
  } catch (error) {
    console.error(`Person clustering failed for gallery ${galleryId}:`, error)
  }

  // Final progress update from DB and mark complete
  const finalStats = await prisma.photoAnalysis.groupBy({
    by: ["status"],
    where: { galleryId },
    _count: true,
  })
  const completedCount = finalStats.find((s) => s.status === "COMPLETED")?._count || 0
  const failedCount = finalStats.find((s) => s.status === "FAILED")?._count || 0

  await prisma.gallery.update({
    where: { id: galleryId },
    data: { analysisProgress: 100, aiSearchEnabled: completedCount > 0 },
  })

  console.log(JSON.stringify({
    event: "gallery_analysis_complete",
    galleryId,
    completed: completedCount,
    failed: failedCount,
    totalPhotos,
    totalDurationMs: Date.now() - galleryStartTime,
  }))
}

async function updateProgressFromDb(galleryId: string, totalPhotos: number): Promise<void> {
  const doneCount = await prisma.photoAnalysis.count({
    where: {
      galleryId,
      status: { in: ["COMPLETED", "FAILED"] },
    },
  })
  const progress = Math.min(Math.round((doneCount / totalPhotos) * 100), 99)

  await prisma.gallery.update({
    where: { id: galleryId },
    data: { analysisProgress: progress },
  })
}

export async function resetStaleProcessingRecords(galleryId: string): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS)

  const result = await prisma.photoAnalysis.updateMany({
    where: {
      galleryId,
      status: "PROCESSING",
      updatedAt: { lt: staleThreshold },
    },
    data: {
      status: "PENDING",
      errorMessage: "Reset from stale PROCESSING state",
    },
  })

  if (result.count > 0) {
    console.log(JSON.stringify({
      event: "stale_records_reset",
      galleryId,
      count: result.count,
    }))
  }

  return result.count
}

async function retryFailedPhotos(
  galleryId: string,
  totalPhotos: number,
  collectionId?: string
): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Find retryable failures
    const retryable = await prisma.photoAnalysis.findMany({
      where: {
        galleryId,
        status: "FAILED",
        retryCount: { lte: attempt + 1 },
        OR: RETRYABLE_ERROR_PREFIXES.map((prefix) => ({
          errorMessage: { startsWith: prefix },
        })),
      },
      select: { photoId: true, errorMessage: true },
    })

    if (retryable.length === 0) break

    console.log(JSON.stringify({
      event: "retry_start",
      galleryId,
      attempt: attempt + 1,
      retryableCount: retryable.length,
    }))

    // Extra delay for rate limit errors
    const hasRateLimitErrors = retryable.some(
      (r) => r.errorMessage?.startsWith("[RATE_LIMIT]")
    )
    if (hasRateLimitErrors) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
    }

    // Exponential backoff delay
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))

    // Reset retryable records to PENDING so analyzePhoto will process them
    await prisma.photoAnalysis.updateMany({
      where: {
        photoId: { in: retryable.map((r) => r.photoId) },
      },
      data: { status: "PENDING", errorMessage: null },
    })

    // Process in batches
    for (let i = 0; i < retryable.length; i += BATCH_SIZE) {
      const batch = retryable.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map((r) => analyzePhoto(r.photoId, galleryId, collectionId))
      )

      await updateProgressFromDb(galleryId, totalPhotos)

      if (i + BATCH_SIZE < retryable.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }
  }
}

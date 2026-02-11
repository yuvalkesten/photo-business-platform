import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { analyzeGallery, resetStaleProcessingRecords } from "@/lib/ai/analyze-gallery"
import { deleteCollection } from "@/lib/aws/rekognition"

const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const RETRYABLE_ERROR_PREFIXES = ["[TIMEOUT]", "[RATE_LIMIT]", "[API_ERROR]"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      reanalyze?: boolean
      retryFailed?: boolean
      toggleEnabled?: boolean
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      select: { userId: true, analysisProgress: true, rekognitionCollectionId: true },
    })

    if (!gallery || gallery.userId !== session.user.id) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    // Handle toggle AI search
    if (body.toggleEnabled !== undefined) {
      await prisma.gallery.update({
        where: { id },
        data: { aiSearchEnabled: body.toggleEnabled },
      })
      return NextResponse.json({ success: true, aiSearchEnabled: body.toggleEnabled })
    }

    // Handle retry failed photos
    if (body.retryFailed) {
      // Reset stale PROCESSING → PENDING
      await resetStaleProcessingRecords(id)

      // Reset retryable FAILED → PENDING
      await prisma.photoAnalysis.updateMany({
        where: {
          galleryId: id,
          status: "FAILED",
          OR: RETRYABLE_ERROR_PREFIXES.map((prefix) => ({
            errorMessage: { startsWith: prefix },
          })),
        },
        data: { status: "PENDING", errorMessage: null, retryCount: 0 },
      })

      // Recalculate progress
      const totalPhotos = await prisma.photo.count({ where: { galleryId: id } })
      const doneCount = await prisma.photoAnalysis.count({
        where: { galleryId: id, status: { in: ["COMPLETED", "FAILED"] } },
      })
      const progress = totalPhotos > 0 ? Math.min(Math.round((doneCount / totalPhotos) * 100), 99) : 0

      await prisma.gallery.update({
        where: { id },
        data: { analysisProgress: progress },
      })

      // Fire-and-forget analysis
      analyzeGallery(id).catch((error) => {
        console.error(`Gallery retry analysis failed for ${id}:`, error)
      })

      return NextResponse.json({
        success: true,
        message: "Retry started",
      })
    }

    // If reanalyze, reset all analyses and Rekognition collection
    if (body.reanalyze) {
      // Delete Rekognition collection (will be recreated during analysis)
      if (gallery.rekognitionCollectionId) {
        try {
          await deleteCollection(gallery.rekognitionCollectionId)
        } catch (error) {
          console.warn("Failed to delete Rekognition collection:", error)
        }
      }

      await prisma.photoAnalysis.deleteMany({ where: { galleryId: id } })
      await prisma.personCluster.deleteMany({ where: { galleryId: id } })
      await prisma.gallery.update({
        where: { id },
        data: {
          analysisProgress: 0,
          aiSearchEnabled: false,
          rekognitionCollectionId: null,
        },
      })
    }

    // Reset stale PROCESSING records before starting
    await resetStaleProcessingRecords(id)

    // Fire-and-forget analysis
    analyzeGallery(id).catch((error) => {
      console.error(`Gallery analysis failed for ${id}:`, error)
    })

    return NextResponse.json({
      success: true,
      message: "Analysis started",
    })
  } catch (error) {
    console.error("Error starting gallery analysis:", error)
    return NextResponse.json({ error: "Failed to start analysis" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const includeErrors = request.nextUrl.searchParams.get("includeErrors") === "true"

    const gallery = await prisma.gallery.findUnique({
      where: { id },
      select: {
        userId: true,
        analysisProgress: true,
        aiSearchEnabled: true,
      },
    })

    if (!gallery || gallery.userId !== session.user.id) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    const [stats, totalPhotos, lastActivityResult] = await Promise.all([
      prisma.photoAnalysis.groupBy({
        by: ["status"],
        where: { galleryId: id },
        _count: true,
      }),
      prisma.photo.count({ where: { galleryId: id } }),
      prisma.photoAnalysis.findFirst({
        where: { galleryId: id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ])

    // Compute progress live from DB stats (not stale stored value)
    const processingCount = stats.find((s) => s.status === "PROCESSING")?._count || 0
    const pendingCount = stats.find((s) => s.status === "PENDING")?._count || 0
    const completedCount = stats.find((s) => s.status === "COMPLETED")?._count || 0
    const failedCount = stats.find((s) => s.status === "FAILED")?._count || 0
    const doneCount = completedCount + failedCount
    const hasActiveWork = processingCount > 0 || pendingCount > 0

    // Progress: if no active work, 100%. Otherwise compute from done/total, capped at 99%.
    const liveProgress = totalPhotos === 0
      ? 0
      : hasActiveWork
        ? Math.min(Math.round((doneCount / totalPhotos) * 100), 99)
        : 100

    // Detect stall: PROCESSING records exist AND last activity was >5 minutes ago
    const lastActivity = lastActivityResult?.updatedAt || null
    const isStalled = processingCount > 0 &&
      lastActivity !== null &&
      Date.now() - lastActivity.getTime() > STALE_THRESHOLD_MS

    const responseData: Record<string, unknown> = {
      success: true,
      progress: liveProgress,
      aiSearchEnabled: gallery.aiSearchEnabled,
      totalPhotos,
      isStalled,
      lastActivity: lastActivity?.toISOString() || null,
      stats: stats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>
      ),
    }

    // Include error details if requested
    if (includeErrors) {
      const errors = await prisma.photoAnalysis.findMany({
        where: { galleryId: id, status: "FAILED" },
        select: { photoId: true, errorMessage: true, retryCount: true },
        take: 20,
        orderBy: { updatedAt: "desc" },
      })
      responseData.errors = errors.map((e) => ({
        photoId: e.photoId,
        error: e.errorMessage,
        retryCount: e.retryCount,
      }))
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching analysis status:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}

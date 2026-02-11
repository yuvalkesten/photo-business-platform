import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { analyzeGallery } from "@/lib/ai/analyze-gallery"

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
      toggleEnabled?: boolean
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id },
      select: { userId: true, analysisProgress: true },
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

    // If reanalyze, reset all analyses
    if (body.reanalyze) {
      await prisma.photoAnalysis.deleteMany({ where: { galleryId: id } })
      await prisma.personCluster.deleteMany({ where: { galleryId: id } })
      await prisma.gallery.update({
        where: { id },
        data: { analysisProgress: 0, aiSearchEnabled: false },
      })
    }

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

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

    const stats = await prisma.photoAnalysis.groupBy({
      by: ["status"],
      where: { galleryId: id },
      _count: true,
    })

    const totalPhotos = await prisma.photo.count({ where: { galleryId: id } })

    return NextResponse.json({
      success: true,
      progress: gallery.analysisProgress,
      aiSearchEnabled: gallery.aiSearchEnabled,
      totalPhotos,
      stats: stats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>
      ),
    })
  } catch (error) {
    console.error("Error fetching analysis status:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}

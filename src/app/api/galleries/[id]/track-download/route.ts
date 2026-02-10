import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galleryId } = await params
    const body = await request.json()
    const { photoId, visitorEmail, resolution, type } = body as {
      photoId?: string
      visitorEmail?: string
      resolution?: string
      type?: string
    }

    // Verify gallery exists
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { id: true },
    })

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    await prisma.downloadEvent.create({
      data: {
        galleryId,
        photoId: photoId || null,
        visitorEmail: visitorEmail || null,
        resolution: resolution || "original",
        type: type || "single",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}

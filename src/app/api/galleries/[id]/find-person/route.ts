import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { PersonFace } from "@/lib/ai/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galleryId } = await params
    const { searchParams } = request.nextUrl
    const photoId = searchParams.get("photoId")
    const faceId = searchParams.get("faceId")

    if (!photoId || !faceId) {
      return NextResponse.json(
        { error: "photoId and faceId are required" },
        { status: 400 }
      )
    }

    // Verify gallery exists
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { id: true, aiSearchEnabled: true },
    })

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    // Look up the face data for this photo
    const analysis = await prisma.photoAnalysis.findUnique({
      where: { photoId },
      select: { faceData: true },
    })

    if (!analysis?.faceData) {
      return NextResponse.json({ error: "No face data for this photo" }, { status: 404 })
    }

    const faces = analysis.faceData as unknown as PersonFace[]
    const targetFace = faces.find((f) => f.faceId === faceId)

    if (!targetFace) {
      return NextResponse.json({ error: "Face not found" }, { status: 404 })
    }

    // If face has a cluster ID, return all photos from that cluster
    if (targetFace.personClusterId) {
      const cluster = await prisma.personCluster.findUnique({
        where: { id: targetFace.personClusterId },
        select: { id: true, name: true, photoIds: true, description: true, role: true },
      })

      if (cluster) {
        return NextResponse.json({
          success: true,
          clusterId: cluster.id,
          personName: cluster.name,
          photoIds: cluster.photoIds,
          personDescription: cluster.description,
          personRole: cluster.role,
        })
      }
    }

    // Fallback: search all analyses for faces with matching role/appearance
    const matchingPhotoIds = [photoId]

    if (targetFace.role) {
      const matchingAnalyses = await prisma.photoAnalysis.findMany({
        where: {
          galleryId,
          status: "COMPLETED",
          faceCount: { gt: 0 },
        },
        select: { photoId: true, faceData: true },
      })

      for (const a of matchingAnalyses) {
        if (a.photoId === photoId) continue
        const otherFaces = a.faceData as unknown as PersonFace[]
        if (otherFaces?.some((f) => f.role === targetFace.role)) {
          matchingPhotoIds.push(a.photoId)
        }
      }
    }

    return NextResponse.json({
      success: true,
      photoIds: matchingPhotoIds,
      personDescription: targetFace.appearance,
      personRole: targetFace.role,
    })
  } catch (error) {
    console.error("Error finding person:", error)
    return NextResponse.json({ error: "Failed to find person" }, { status: 500 })
  }
}

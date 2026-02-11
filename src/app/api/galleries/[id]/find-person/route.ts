import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { searchFacesById } from "@/lib/aws/rekognition"
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
      select: { id: true, aiSearchEnabled: true, rekognitionCollectionId: true },
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

    // Strategy 1: If face has a cluster ID, return all photos from that cluster
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

    // Strategy 2: Rekognition face search (real-time visual similarity)
    if (targetFace.rekognitionFaceId && gallery.rekognitionCollectionId) {
      try {
        const matches = await searchFacesById(
          gallery.rekognitionCollectionId,
          targetFace.rekognitionFaceId,
          80
        )

        if (matches.length > 0) {
          // Map rekognition faceIds back to photo IDs
          const allRekFaceIds = [targetFace.rekognitionFaceId, ...matches.map((m) => m.faceId)]
          const matchingPhotoIds = await findPhotosByRekognitionFaceIds(galleryId, allRekFaceIds)

          // Ensure source photo is included
          if (!matchingPhotoIds.includes(photoId)) {
            matchingPhotoIds.unshift(photoId)
          }

          return NextResponse.json({
            success: true,
            photoIds: matchingPhotoIds,
            personDescription: targetFace.appearance,
            personRole: targetFace.role,
            matchMethod: "rekognition",
          })
        }
      } catch (error) {
        console.warn("Rekognition search failed, falling back:", error)
      }
    }

    // Strategy 3: Fallback role-name matching (for legacy data)
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
      matchMethod: "role_fallback",
    })
  } catch (error) {
    console.error("Error finding person:", error)
    return NextResponse.json({ error: "Failed to find person" }, { status: 500 })
  }
}

async function findPhotosByRekognitionFaceIds(
  galleryId: string,
  rekFaceIds: string[]
): Promise<string[]> {
  const analyses = await prisma.photoAnalysis.findMany({
    where: {
      galleryId,
      status: "COMPLETED",
      faceCount: { gt: 0 },
    },
    select: { photoId: true, faceData: true },
  })

  const photoIds = new Set<string>()

  for (const analysis of analyses) {
    const faces = analysis.faceData as unknown as PersonFace[]
    if (!faces) continue

    for (const face of faces) {
      if (face.rekognitionFaceId && rekFaceIds.includes(face.rekognitionFaceId)) {
        photoIds.add(analysis.photoId)
        break
      }
    }
  }

  return [...photoIds]
}

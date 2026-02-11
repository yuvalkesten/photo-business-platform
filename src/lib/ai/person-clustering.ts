import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { searchFacesById } from "@/lib/aws/rekognition"
import type { PersonFace } from "./types"

interface FaceEntry {
  photoId: string
  face: PersonFace
  faceIndex: number
}

export async function clusterPersons(galleryId: string): Promise<void> {
  // Delete existing clusters for this gallery
  await prisma.personCluster.deleteMany({ where: { galleryId } })

  // Get gallery's Rekognition collection ID
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { rekognitionCollectionId: true },
  })

  // Gather all face data from completed analyses
  const analyses = await prisma.photoAnalysis.findMany({
    where: { galleryId, status: "COMPLETED", faceCount: { gt: 0 } },
    select: { photoId: true, faceData: true },
  })

  const allFaces: FaceEntry[] = []
  for (const analysis of analyses) {
    const faces = analysis.faceData as unknown as PersonFace[] | null
    if (!faces) continue
    for (let i = 0; i < faces.length; i++) {
      allFaces.push({ photoId: analysis.photoId, face: faces[i], faceIndex: i })
    }
  }

  if (allFaces.length === 0) return

  // Use Rekognition-based clustering if collection exists and faces have rekognitionFaceIds
  const hasRekognitionFaces = allFaces.some((e) => e.face.rekognitionFaceId)

  if (gallery?.rekognitionCollectionId && hasRekognitionFaces) {
    await clusterWithRekognition(galleryId, gallery.rekognitionCollectionId, allFaces)
  } else {
    // Fallback: role-based clustering for legacy data
    await clusterByRole(galleryId, allFaces)
  }

  // Update face data with cluster IDs
  await assignClusterIdsToFaces(galleryId)
}

async function clusterWithRekognition(
  galleryId: string,
  collectionId: string,
  allFaces: FaceEntry[]
): Promise<void> {
  // Build a map from rekognitionFaceId → FaceEntry
  const rekIdToEntry = new Map<string, FaceEntry>()
  for (const entry of allFaces) {
    if (entry.face.rekognitionFaceId) {
      rekIdToEntry.set(entry.face.rekognitionFaceId, entry)
    }
  }

  const visited = new Set<string>()
  const clusters: Array<{
    entries: FaceEntry[]
    rekFaceIds: string[]
    representativeFaceId: string
  }> = []

  // For each unvisited face with a rekognitionFaceId, search for matches
  for (const entry of allFaces) {
    const rekFaceId = entry.face.rekognitionFaceId
    if (!rekFaceId || visited.has(rekFaceId)) continue

    visited.add(rekFaceId)

    let matches: Array<{ faceId: string; similarity: number }> = []
    try {
      matches = await searchFacesById(collectionId, rekFaceId, 80)
    } catch (error) {
      console.warn(`SearchFaces failed for ${rekFaceId}:`,
        error instanceof Error ? error.message : error)
      continue
    }

    // Build cluster from this face + all matches
    const clusterEntries: FaceEntry[] = [entry]
    const clusterRekIds: string[] = [rekFaceId]

    for (const match of matches) {
      if (visited.has(match.faceId)) continue
      visited.add(match.faceId)

      const matchEntry = rekIdToEntry.get(match.faceId)
      if (matchEntry) {
        clusterEntries.push(matchEntry)
        clusterRekIds.push(match.faceId)
      }
    }

    clusters.push({
      entries: clusterEntries,
      rekFaceIds: clusterRekIds,
      representativeFaceId: rekFaceId,
    })
  }

  // Create PersonCluster records
  for (const cluster of clusters) {
    if (cluster.entries.length < 1) continue

    const photoIds = [...new Set(cluster.entries.map((e) => e.photoId))]

    // Determine role from most common LLM-assigned role
    const roleCounts = new Map<string, number>()
    for (const e of cluster.entries) {
      const role = e.face.role?.toLowerCase()
      if (role) {
        roleCounts.set(role, (roleCounts.get(role) || 0) + 1)
      }
    }
    const topRole = roleCounts.size > 0
      ? [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null

    const representative = cluster.entries[0].face

    await prisma.personCluster.create({
      data: {
        galleryId,
        description: representative.appearance,
        role: topRole,
        photoIds,
        faceDescription: representative.appearance,
        rekognitionFaceIds: cluster.rekFaceIds,
        representativeFaceId: cluster.representativeFaceId,
      },
    })
  }

  // Also cluster faces without rekognitionFaceIds by role (legacy faces)
  const unindexedFaces = allFaces.filter((e) => !e.face.rekognitionFaceId)
  if (unindexedFaces.length > 0) {
    await clusterByRole(galleryId, unindexedFaces)
  }
}

async function clusterByRole(
  galleryId: string,
  faces: FaceEntry[]
): Promise<void> {
  const roleClusters = new Map<string, FaceEntry[]>()
  const keyRoles = new Set(["bride", "groom", "officiant"])

  for (const entry of faces) {
    const role = entry.face.role?.toLowerCase()
    if (role && keyRoles.has(role)) {
      const existing = roleClusters.get(role) || []
      existing.push(entry)
      roleClusters.set(role, existing)
    }
  }

  for (const [role, entries] of roleClusters) {
    const photoIds = [...new Set(entries.map((e) => e.photoId))]
    const representative = entries[0].face

    await prisma.personCluster.create({
      data: {
        galleryId,
        description: representative.appearance,
        role,
        photoIds,
        faceDescription: representative.appearance,
      },
    })
  }
}

async function assignClusterIdsToFaces(galleryId: string): Promise<void> {
  const clusters = await prisma.personCluster.findMany({
    where: { galleryId },
    select: {
      id: true,
      photoIds: true,
      rekognitionFaceIds: true,
      role: true,
    },
  })

  // Build a map from rekognitionFaceId → clusterId for fast lookup
  const rekIdToCluster = new Map<string, string>()
  for (const cluster of clusters) {
    for (const rekId of cluster.rekognitionFaceIds) {
      rekIdToCluster.set(rekId, cluster.id)
    }
  }

  // Get all analyses with faces
  const analyses = await prisma.photoAnalysis.findMany({
    where: { galleryId, status: "COMPLETED", faceCount: { gt: 0 } },
    select: { photoId: true, faceData: true },
  })

  for (const analysis of analyses) {
    const faces = analysis.faceData as unknown as PersonFace[]
    if (!faces) continue

    let updated = false

    for (const face of faces) {
      // Primary: match by rekognitionFaceId
      if (face.rekognitionFaceId && rekIdToCluster.has(face.rekognitionFaceId)) {
        const clusterId = rekIdToCluster.get(face.rekognitionFaceId)!
        if (face.personClusterId !== clusterId) {
          face.personClusterId = clusterId
          updated = true
        }
        continue
      }

      // Fallback: match by role for faces without rekognitionFaceId
      for (const cluster of clusters) {
        if (!cluster.role) continue
        if (
          face.role?.toLowerCase() === cluster.role.toLowerCase() &&
          cluster.photoIds.includes(analysis.photoId) &&
          !face.personClusterId
        ) {
          face.personClusterId = cluster.id
          updated = true
          break
        }
      }
    }

    if (updated) {
      await prisma.photoAnalysis.update({
        where: { photoId: analysis.photoId },
        data: { faceData: JSON.parse(JSON.stringify(faces)) as Prisma.InputJsonValue },
      })
    }
  }
}

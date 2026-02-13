import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { searchFacesById } from "@/lib/aws/rekognition"
import type { PersonFace } from "./types"

interface FaceEntry {
  photoId: string
  face: PersonFace
  faceIndex: number
}

// Similarity threshold for Rekognition face matching.
// Higher = fewer false positives (better for events with similar-looking people).
const FACE_MATCH_THRESHOLD = 90

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

// ---------------------------------------------------------------------------
// Union-Find data structure for identity-based clustering
// ---------------------------------------------------------------------------
function createUnionFind() {
  const parent = new Map<string, string>()

  function find(id: string): string {
    if (!parent.has(id)) parent.set(id, id)
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!))
    return parent.get(id)!
  }

  function union(a: string, b: string) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  return { find, union }
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

  // Use Union-Find to build connected components from Rekognition matches.
  // Unlike greedy single-pass, every face searches independently so we get
  // the full match graph before grouping.
  const uf = createUnionFind()
  const indexedFaceIds = [...rekIdToEntry.keys()]

  for (const rekFaceId of indexedFaceIds) {
    try {
      const matches = await searchFacesById(collectionId, rekFaceId, FACE_MATCH_THRESHOLD)
      for (const match of matches) {
        // Only union with faces we know about (in our gallery's analysis data)
        if (rekIdToEntry.has(match.faceId)) {
          uf.union(rekFaceId, match.faceId)
        }
      }
    } catch (error) {
      console.warn(`SearchFaces failed for ${rekFaceId}:`,
        error instanceof Error ? error.message : error)
    }
  }

  // Group faces by their cluster root
  const clusterMap = new Map<string, FaceEntry[]>()
  const clusterRekIds = new Map<string, string[]>()

  for (const rekFaceId of indexedFaceIds) {
    const root = uf.find(rekFaceId)
    const entry = rekIdToEntry.get(rekFaceId)!

    if (!clusterMap.has(root)) {
      clusterMap.set(root, [])
      clusterRekIds.set(root, [])
    }
    clusterMap.get(root)!.push(entry)
    clusterRekIds.get(root)!.push(rekFaceId)
  }

  // Create PersonCluster records
  for (const [root, entries] of clusterMap) {
    const photoIds = [...new Set(entries.map((e) => e.photoId))]
    const rekFaceIds = clusterRekIds.get(root) || []

    // Determine role from most common LLM-assigned role
    const roleCounts = new Map<string, number>()
    for (const e of entries) {
      const role = e.face.role?.toLowerCase()
      if (role) {
        roleCounts.set(role, (roleCounts.get(role) || 0) + 1)
      }
    }
    const topRole = roleCounts.size > 0
      ? [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null

    const representative = entries[0].face

    await prisma.personCluster.create({
      data: {
        galleryId,
        description: representative.appearance,
        role: topRole,
        photoIds,
        faceDescription: representative.appearance,
        rekognitionFaceIds: rekFaceIds,
        representativeFaceId: root,
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
  // Group all faces by their LLM-assigned role
  const roleClusters = new Map<string, FaceEntry[]>()

  for (const entry of faces) {
    const role = entry.face.role?.toLowerCase()
    if (!role) continue
    const existing = roleClusters.get(role) || []
    existing.push(entry)
    roleClusters.set(role, existing)
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

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { rankWithGemini } from "./gemini-vision"
import type { PersonFace } from "./types"

interface FaceEntry {
  photoId: string
  face: PersonFace
}

export async function clusterPersons(galleryId: string): Promise<void> {
  // Delete existing clusters for this gallery
  await prisma.personCluster.deleteMany({ where: { galleryId } })

  // Gather all face data from completed analyses
  const analyses = await prisma.photoAnalysis.findMany({
    where: { galleryId, status: "COMPLETED", faceCount: { gt: 0 } },
    select: { photoId: true, faceData: true },
  })

  const allFaces: FaceEntry[] = []
  for (const analysis of analyses) {
    const faces = analysis.faceData as unknown as PersonFace[] | null
    if (!faces) continue
    for (const face of faces) {
      allFaces.push({ photoId: analysis.photoId, face })
    }
  }

  if (allFaces.length === 0) return

  // Step 1: Group by clear roles (bride, groom, etc.)
  const roleClusters = new Map<string, FaceEntry[]>()
  const unassigned: FaceEntry[] = []

  const keyRoles = new Set(["bride", "groom", "officiant"])
  for (const entry of allFaces) {
    const role = entry.face.role?.toLowerCase()
    if (role && keyRoles.has(role)) {
      const existing = roleClusters.get(role) || []
      existing.push(entry)
      roleClusters.set(role, existing)
    } else {
      unassigned.push(entry)
    }
  }

  // Create clusters for key roles
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

  // Step 2: For remaining faces, use LLM to group by appearance similarity
  if (unassigned.length > 0 && unassigned.length <= 200) {
    try {
      await clusterByAppearance(galleryId, unassigned)
    } catch (error) {
      console.error("Appearance-based clustering failed:", error)
      // Non-fatal: role-based clusters still work
    }
  }

  // Step 3: Update face data with cluster IDs
  await assignClusterIdsToFaces(galleryId)
}

async function clusterByAppearance(
  galleryId: string,
  faces: FaceEntry[]
): Promise<void> {
  // Build description list for LLM
  const faceDescriptions = faces.map(
    (f, i) =>
      `[${i}] Photo ${f.photoId}, face ${f.face.faceId}: ${f.face.appearance}, ${f.face.ageRange}, ${f.face.expression}, role: ${f.face.role || "unknown"}`
  )

  const prompt = `These are descriptions of people's faces from different photos in the same event gallery. Group the faces that belong to the SAME person. People may appear in different expressions/angles but their physical features (hair, build, distinctive features) should match.

Faces:
${faceDescriptions.join("\n")}

Return ONLY a JSON array (no markdown fencing) of person groups:
[
  {
    "personDescription": "Brief canonical description of this person",
    "role": "guest|parent|child|bridesmaid|groomsman|etc or null",
    "faceIndices": [0, 3, 7]
  }
]

Rules:
- Only group faces that are VERY likely the same person
- If unsure, keep faces in separate groups
- Single appearances (only 1 face) can be omitted from the output`

  const rawResponse = await rankWithGemini(prompt, 60000)
  const jsonStr = rawResponse
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim()

  const groups = JSON.parse(jsonStr) as Array<{
    personDescription: string
    role: string | null
    faceIndices: number[]
  }>

  for (const group of groups) {
    if (!group.faceIndices || group.faceIndices.length < 2) continue

    const photoIds = [
      ...new Set(
        group.faceIndices
          .filter((i) => i >= 0 && i < faces.length)
          .map((i) => faces[i].photoId)
      ),
    ]

    if (photoIds.length === 0) continue

    await prisma.personCluster.create({
      data: {
        galleryId,
        description: group.personDescription,
        role: group.role,
        photoIds,
        faceDescription: group.personDescription,
      },
    })
  }
}

async function assignClusterIdsToFaces(galleryId: string): Promise<void> {
  const clusters = await prisma.personCluster.findMany({
    where: { galleryId },
    select: { id: true, photoIds: true, faceDescription: true, role: true },
  })

  // For each cluster, update the faceData of relevant photos to include the clusterId
  for (const cluster of clusters) {
    for (const photoId of cluster.photoIds) {
      const analysis = await prisma.photoAnalysis.findUnique({
        where: { photoId },
        select: { faceData: true },
      })

      if (!analysis?.faceData) continue

      const faces = analysis.faceData as unknown as PersonFace[]
      let updated = false

      for (const face of faces) {
        // Match by role first, then by description similarity
        const roleMatch = cluster.role && face.role?.toLowerCase() === cluster.role.toLowerCase()
        if (roleMatch && !face.personClusterId) {
          face.personClusterId = cluster.id
          updated = true
          break
        }
      }

      // If no role match, assign to first unassigned face
      if (!updated) {
        for (const face of faces) {
          if (!face.personClusterId) {
            face.personClusterId = cluster.id
            updated = true
            break
          }
        }
      }

      if (updated) {
        await prisma.photoAnalysis.update({
          where: { photoId },
          data: { faceData: JSON.parse(JSON.stringify(faces)) as Prisma.InputJsonValue },
        })
      }
    }
  }
}

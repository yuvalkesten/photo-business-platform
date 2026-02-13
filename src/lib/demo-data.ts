import crypto from "crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { copyS3Object, getS3Url } from "@/lib/s3"

import fixtureData from "../../prisma/fixtures/demo-gallery.json"

const fixture = fixtureData as DemoFixture

// ---------------------------------------------------------------------------
// Fixture types (mirrors the JSON structure)
// ---------------------------------------------------------------------------
interface DemoFixture {
  contact: {
    firstName: string
    lastName: string
    email: string
    type: string
    tags: string[]
  }
  project: {
    name: string
    projectType: string
    status: string
    totalPrice: string
    tags: string[]
    eventDateOffsetDays: number
    bookedAtOffsetDays: number
  }
  gallery: {
    title: string
    theme: string
    gridStyle: string
    aiSearchEnabled: boolean
    analysisProgress: number
    isPublic: boolean
    allowDownload: boolean
  }
  photos: Array<{
    templateId: string
    seedS3Key: string
    seedThumbnailKey: string
    filename: string
    width: number
    height: number
    fileSize: number
    mimeType: string
    order: number
    analysis: {
      description: string
      analysisData: Record<string, unknown>
      searchTags: string[]
      faceData: unknown[]
      faceCount: number
    }
  }>
  personClusters: Array<{
    fixtureClusterId: string
    templatePhotoIds: string[]
    name: string | null
    role: string | null
    description: string
    faceDescription: string
  }>
}

// ---------------------------------------------------------------------------
// Main entry point — awaited from auth hooks
// ---------------------------------------------------------------------------
export async function seedDemoData(userId: string): Promise<void> {
  // Idempotency: skip if demo project with photos already exists
  const existing = await prisma.project.findFirst({
    where: { userId, name: fixture.project.name, tags: { has: "demo" } },
    include: {
      galleries: { include: { _count: { select: { photos: true } } } },
    },
  })

  if (existing) {
    const hasPhotos = existing.galleries.some((g) => g._count.photos > 0)
    if (hasPhotos) return

    // Broken demo data (project exists but gallery has no photos) — clean up and re-seed
    for (const gallery of existing.galleries) {
      await prisma.photoAnalysis.deleteMany({ where: { galleryId: gallery.id } })
      await prisma.personCluster.deleteMany({ where: { galleryId: gallery.id } })
      await prisma.photo.deleteMany({ where: { galleryId: gallery.id } })
      await prisma.gallery.delete({ where: { id: gallery.id } })
    }
    await prisma.project.delete({ where: { id: existing.id } })
    if (existing.contactId) {
      await prisma.contact.delete({ where: { id: existing.contactId } }).catch(() => {
        // Contact may be referenced elsewhere
      })
    }
  }

  // 1. Create Contact
  const contact = await prisma.contact.create({
    data: {
      userId,
      firstName: fixture.contact.firstName,
      lastName: fixture.contact.lastName,
      email: fixture.contact.email,
      type: fixture.contact.type as Prisma.EnumContactTypeFieldUpdateOperationsInput["set"] & string,
      tags: fixture.contact.tags,
    },
  })

  // 2. Create Project (dates relative to now)
  const now = new Date()
  const eventDate = new Date(now)
  eventDate.setDate(eventDate.getDate() + fixture.project.eventDateOffsetDays)
  const bookedAt = new Date(now)
  bookedAt.setDate(bookedAt.getDate() + fixture.project.bookedAtOffsetDays)

  const project = await prisma.project.create({
    data: {
      userId,
      contactId: contact.id,
      name: fixture.project.name,
      projectType: fixture.project.projectType as "CORPORATE",
      status: fixture.project.status as "DELIVERED",
      totalPrice: new Prisma.Decimal(fixture.project.totalPrice),
      tags: fixture.project.tags,
      eventDate,
      bookedAt,
    },
  })

  // 3. Create Gallery
  const gallery = await prisma.gallery.create({
    data: {
      userId,
      contactId: contact.id,
      projectId: project.id,
      title: fixture.gallery.title,
      theme: fixture.gallery.theme,
      gridStyle: fixture.gallery.gridStyle,
      aiSearchEnabled: fixture.gallery.aiSearchEnabled,
      analysisProgress: fixture.gallery.analysisProgress,
      isPublic: fixture.gallery.isPublic,
      allowDownload: fixture.gallery.allowDownload,
    },
  })

  // 4. Copy S3 objects and create Photo records
  const templateIdToPhotoId = new Map<string, string>()
  const photoRecords: Array<{
    templateId: string
    photoId: string
    thumbnailUrl: string
  }> = []

  // Process in batches of 10 for S3 copy parallelism
  const S3_BATCH_SIZE = 10
  for (
    let i = 0;
    i < fixture.photos.length;
    i += S3_BATCH_SIZE
  ) {
    const batch = fixture.photos.slice(i, i + S3_BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async (photoFixture) => {
        const uuid = crypto.randomUUID()
        const ext = photoFixture.filename.split(".").pop() || "jpg"
        const newS3Key = `galleries/${gallery.id}/${uuid}.${ext}`
        const newThumbnailKey = `galleries/thumbnails/${gallery.id}/${uuid}.${ext}`

        // Copy original + thumbnail from seed location
        await copyS3Object(photoFixture.seedS3Key, newS3Key)
        await copyS3Object(photoFixture.seedThumbnailKey, newThumbnailKey)

        const s3Url = getS3Url(newS3Key)
        const thumbnailUrl = getS3Url(newThumbnailKey)

        // Create Photo record
        const photo = await prisma.photo.create({
          data: {
            galleryId: gallery.id,
            filename: photoFixture.filename,
            s3Key: newS3Key,
            s3Url,
            thumbnailUrl,
            fileSize: photoFixture.fileSize,
            width: photoFixture.width,
            height: photoFixture.height,
            mimeType: photoFixture.mimeType,
            order: photoFixture.order,
          },
        })

        return {
          templateId: photoFixture.templateId,
          photoId: photo.id,
          thumbnailUrl,
        }
      })
    )

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { templateId, photoId, thumbnailUrl } = result.value
        templateIdToPhotoId.set(templateId, photoId)
        photoRecords.push({ templateId, photoId, thumbnailUrl })
      }
      // Skip failed copies silently — partial demo data is fine
    }
  }

  // If zero photos succeeded, clean up and bail
  if (photoRecords.length === 0) {
    await prisma.gallery.delete({ where: { id: gallery.id } })
    await prisma.project.delete({ where: { id: project.id } })
    await prisma.contact.delete({ where: { id: contact.id } })
    throw new Error("Demo seeding failed: no photos could be copied")
  }

  // 5. Create PhotoAnalysis records
  try {
    const analysisData = fixture.photos
      .filter((p) => templateIdToPhotoId.has(p.templateId))
      .map((p) => ({
        photoId: templateIdToPhotoId.get(p.templateId)!,
        galleryId: gallery.id,
        status: "COMPLETED" as const,
        description: p.analysis.description,
        analysisData: JSON.parse(
          JSON.stringify(p.analysis.analysisData)
        ) as Prisma.InputJsonValue,
        searchTags: p.analysis.searchTags,
        faceData: JSON.parse(
          JSON.stringify(p.analysis.faceData)
        ) as Prisma.InputJsonValue,
        faceCount: p.analysis.faceCount,
        analyzedAt: new Date(),
      }))

    await prisma.photoAnalysis.createMany({ data: analysisData })
  } catch (error) {
    // Non-fatal: gallery works without AI search
    console.error("Demo seeding: PhotoAnalysis creation failed:", error)
  }

  // 6. Create PersonCluster records and build fixtureClusterId → real ID map
  const fixtureClusterToRealId = new Map<string, string>()
  try {
    for (const cluster of fixture.personClusters) {
      const photoIds = cluster.templatePhotoIds
        .map((tid) => templateIdToPhotoId.get(tid))
        .filter(Boolean) as string[]

      if (photoIds.length === 0) continue

      const created = await prisma.personCluster.create({
        data: {
          galleryId: gallery.id,
          name: cluster.name,
          role: cluster.role,
          description: cluster.description,
          faceDescription: cluster.faceDescription,
          photoIds,
        },
      })
      fixtureClusterToRealId.set(cluster.fixtureClusterId, created.id)
    }
  } catch (error) {
    // Non-fatal
    console.error("Demo seeding: PersonCluster creation failed:", error)
  }

  // 6b. Assign personClusterId on faceData so PeopleRow can match faces to clusters
  if (fixtureClusterToRealId.size > 0) {
    try {
      const analyses = await prisma.photoAnalysis.findMany({
        where: { galleryId: gallery.id },
        select: { photoId: true, faceData: true },
      })

      for (const analysis of analyses) {
        const faces = analysis.faceData as unknown as Array<{
          personClusterId?: string
          [key: string]: unknown
        }> | null
        if (!faces) continue

        let updated = false
        for (const face of faces) {
          if (
            face.personClusterId &&
            fixtureClusterToRealId.has(face.personClusterId)
          ) {
            face.personClusterId = fixtureClusterToRealId.get(
              face.personClusterId
            )!
            updated = true
          }
        }

        if (updated) {
          await prisma.photoAnalysis.update({
            where: { photoId: analysis.photoId },
            data: {
              faceData: JSON.parse(
                JSON.stringify(faces)
              ) as Prisma.InputJsonValue,
            },
          })
        }
      }
    } catch (error) {
      console.error("Demo seeding: faceData cluster assignment failed:", error)
    }
  }

  // 7. Set gallery cover image from first photo
  if (photoRecords.length > 0) {
    await prisma.gallery.update({
      where: { id: gallery.id },
      data: { coverImage: photoRecords[0].thumbnailUrl },
    })
  }
}

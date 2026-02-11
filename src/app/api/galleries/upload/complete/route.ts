import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getS3Url, uploadBufferToS3 } from "@/lib/s3"
import sharp from "sharp"
import { applyWatermark, type WatermarkPosition } from "@/lib/watermark"
import { analyzeGallery } from "@/lib/ai/analyze-gallery"

const THUMBNAIL_WIDTH = 600
const THUMBNAIL_QUALITY = 80
const WEB_DISPLAY_WIDTH = 2000

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { galleryId, photos } = body as {
      galleryId: string
      photos: Array<{
        filename: string
        s3Key: string
        contentType: string
        fileSize: number
        width: number
        height: number
      }>
    }

    if (!galleryId || !photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: "Missing galleryId or photos" }, { status: 400 })
    }

    // Verify gallery ownership and get watermark settings
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: {
        userId: true,
        watermark: true,
        user: {
          select: {
            watermarkUrl: true,
            watermarkPosition: true,
            watermarkOpacity: true,
          },
        },
      },
    })

    if (!gallery || gallery.userId !== session.user.id) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    // Load watermark image if watermarking is enabled
    let watermarkBuffer: Buffer | null = null
    if (gallery.watermark && gallery.user.watermarkUrl) {
      try {
        const wmResponse = await fetch(gallery.user.watermarkUrl)
        watermarkBuffer = Buffer.from(await wmResponse.arrayBuffer())
      } catch (err) {
        console.error("Failed to load watermark image:", err)
      }
    }

    // Get current max order
    const maxOrderPhoto = await prisma.photo.findFirst({
      where: { galleryId },
      orderBy: { order: "desc" },
      select: { order: true },
    })
    let nextOrder = (maxOrderPhoto?.order ?? -1) + 1

    // Generate thumbnails, watermarks, and create photo records
    const createdPhotos = await Promise.all(
      photos.map(async (photo) => {
        let thumbnailUrl: string | null = null
        let watermarkedUrl: string | null = null

        try {
          // Fetch original from S3
          const s3Url = getS3Url(photo.s3Key)
          const response = await fetch(s3Url)
          const buffer = Buffer.from(await response.arrayBuffer())

          // Generate thumbnail
          const thumbnailBuffer = await sharp(buffer)
            .resize(THUMBNAIL_WIDTH, undefined, { withoutEnlargement: true })
            .jpeg({ quality: THUMBNAIL_QUALITY })
            .toBuffer()

          const thumbnailKey = photo.s3Key.replace(
            /^galleries\//,
            "galleries/thumbnails/"
          )
          await uploadBufferToS3(thumbnailKey, thumbnailBuffer, "image/jpeg")
          thumbnailUrl = getS3Url(thumbnailKey)

          // Generate watermarked version if enabled
          if (watermarkBuffer) {
            try {
              // Create web-display-sized version for watermarking
              const webBuffer = await sharp(buffer)
                .resize(WEB_DISPLAY_WIDTH, undefined, { withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer()

              const watermarkedBuffer = await applyWatermark({
                imageBuffer: webBuffer,
                watermarkBuffer,
                position: (gallery.user.watermarkPosition || "center") as WatermarkPosition,
                opacity: gallery.user.watermarkOpacity ?? 50,
              })

              const watermarkedKey = photo.s3Key.replace(
                /^galleries\//,
                "galleries/watermarked/"
              )
              await uploadBufferToS3(watermarkedKey, watermarkedBuffer, "image/jpeg")
              watermarkedUrl = getS3Url(watermarkedKey)
            } catch (wmErr) {
              console.error(`Failed to watermark ${photo.filename}:`, wmErr)
            }
          }
        } catch (err) {
          console.error(`Failed to process ${photo.filename}:`, err)
        }

        const order = nextOrder++

        return prisma.photo.create({
          data: {
            galleryId,
            filename: photo.filename,
            s3Key: photo.s3Key,
            s3Url: getS3Url(photo.s3Key),
            thumbnailUrl,
            watermarkedUrl,
            fileSize: photo.fileSize,
            width: photo.width,
            height: photo.height,
            mimeType: photo.contentType,
            order,
          },
        })
      })
    )

    // Set cover image if gallery doesn't have one
    const currentGallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { coverImage: true },
    })

    if (!currentGallery?.coverImage && createdPhotos.length > 0) {
      await prisma.gallery.update({
        where: { id: galleryId },
        data: { coverImage: createdPhotos[0].thumbnailUrl || createdPhotos[0].s3Url },
      })
    }

    // Auto-trigger AI analysis (throttled to once per hour)
    try {
      const galleryForAnalysis = await prisma.gallery.findUnique({
        where: { id: galleryId },
        select: { lastAnalysisTriggeredAt: true },
      })

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const shouldTrigger =
        !galleryForAnalysis?.lastAnalysisTriggeredAt ||
        galleryForAnalysis.lastAnalysisTriggeredAt < oneHourAgo

      if (shouldTrigger) {
        await prisma.gallery.update({
          where: { id: galleryId },
          data: { lastAnalysisTriggeredAt: new Date() },
        })

        // Fire-and-forget
        analyzeGallery(galleryId).catch((err) => {
          console.error(`Auto-analysis failed for gallery ${galleryId}:`, err)
        })
      }
    } catch (err) {
      console.error("Failed to trigger auto-analysis:", err)
    }

    return NextResponse.json({
      success: true,
      photos: createdPhotos,
    })
  } catch (error) {
    console.error("Error completing upload:", error)
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import sharp from "sharp"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!

const RESOLUTION_MAP: Record<string, number> = {
  high_3600: 3600,
  web_2048: 2048,
  web_1024: 1024,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galleryId } = await params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get("photoId")
    const resolution = searchParams.get("resolution") || "original"

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 })
    }

    // Verify photo belongs to gallery
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, galleryId },
      select: { s3Key: true, filename: true, width: true, height: true },
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Check gallery allows downloads
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { allowDownload: true, downloadResolution: true },
    })

    if (!gallery?.allowDownload) {
      return NextResponse.json({ error: "Downloads not allowed" }, { status: 403 })
    }

    // Use gallery's configured resolution if not overridden
    const effectiveResolution = resolution !== "original" ? resolution : gallery.downloadResolution

    // Fetch from S3
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: photo.s3Key,
    })

    const s3Response = await s3Client.send(command)
    const bodyStream = s3Response.Body
    if (!bodyStream) {
      return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 })
    }

    const chunks: Uint8Array[] = []
    const reader = bodyStream.transformToWebStream().getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    let buffer: Buffer<ArrayBuffer> = Buffer.concat(chunks) as Buffer<ArrayBuffer>

    // Resize if needed
    const maxDim = RESOLUTION_MAP[effectiveResolution]
    if (maxDim && (photo.width > maxDim || photo.height > maxDim)) {
      buffer = await sharp(buffer)
        .resize(maxDim, maxDim, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer() as Buffer<ArrayBuffer>
    }

    // Track download
    prisma.downloadEvent.create({
      data: {
        galleryId,
        photoId,
        resolution: effectiveResolution,
        type: "single",
      },
    }).catch(() => {})

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${photo.filename}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    console.error("Error downloading photo:", error)
    return NextResponse.json({ error: "Failed to download" }, { status: 500 })
  }
}

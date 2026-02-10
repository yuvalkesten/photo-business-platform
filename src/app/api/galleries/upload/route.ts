import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generatePresignedUploadUrl } from "@/lib/s3"
import { randomUUID } from "crypto"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/heic",
  "image/heif",
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { galleryId, files } = body as {
      galleryId: string
      files: Array<{ filename: string; contentType: string; fileSize: number }>
    }

    if (!galleryId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "Missing galleryId or files" }, { status: 400 })
    }

    if (files.length > 100) {
      return NextResponse.json({ error: "Maximum 100 files per upload batch" }, { status: 400 })
    }

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true },
    })

    if (!gallery || gallery.userId !== session.user.id) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    // Validate files and generate presigned URLs
    const uploadUrls = await Promise.all(
      files.map(async (file) => {
        if (!ALLOWED_TYPES.includes(file.contentType)) {
          throw new Error(`Unsupported file type: ${file.contentType}`)
        }

        if (file.fileSize > MAX_FILE_SIZE) {
          throw new Error(`File too large: ${file.filename} (max 50MB)`)
        }

        const fileId = randomUUID()
        const ext = file.filename.split(".").pop() || "jpg"
        const s3Key = `galleries/${galleryId}/${fileId}.${ext}`

        const uploadUrl = await generatePresignedUploadUrl(s3Key, file.contentType)

        return {
          filename: file.filename,
          s3Key,
          uploadUrl,
          fileId,
        }
      })
    )

    return NextResponse.json({ uploadUrls })
  } catch (error) {
    console.error("Error generating upload URLs:", error)
    const message = error instanceof Error ? error.message : "Failed to generate upload URLs"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

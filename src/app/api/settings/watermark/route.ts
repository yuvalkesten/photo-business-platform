import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generatePresignedUploadUrl, getS3Url } from "@/lib/s3"
import { randomUUID } from "crypto"

// GET: Get current watermark settings
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        watermarkUrl: true,
        watermarkPosition: true,
        watermarkOpacity: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching watermark settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// POST: Generate presigned URL for watermark upload
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contentType } = body as { contentType: string }

    if (!contentType || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid content type. Must be an image." }, { status: 400 })
    }

    const ext = contentType.split("/")[1] || "png"
    const s3Key = `watermarks/${session.user.id}/${randomUUID()}.${ext}`
    const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType)

    return NextResponse.json({ uploadUrl, s3Key, s3Url: getS3Url(s3Key) })
  } catch (error) {
    console.error("Error generating watermark upload URL:", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}

// PUT: Update watermark settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { watermarkUrl, watermarkPosition, watermarkOpacity } = body as {
      watermarkUrl?: string | null
      watermarkPosition?: string
      watermarkOpacity?: number
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(watermarkUrl !== undefined && { watermarkUrl }),
        ...(watermarkPosition && { watermarkPosition }),
        ...(watermarkOpacity !== undefined && { watermarkOpacity: Math.min(100, Math.max(0, watermarkOpacity)) }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating watermark settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

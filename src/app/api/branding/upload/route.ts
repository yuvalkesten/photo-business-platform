import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadBufferToS3, getS3Url } from "@/lib/s3"
import { randomUUID } from "crypto"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/x-icon"]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null

    if (!file || !type) {
      return NextResponse.json({ error: "Missing file or type" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || "png"
    const key = `branding/${session.user.id}/${type}-${randomUUID()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadBufferToS3(key, buffer, file.type)

    const url = getS3Url(key)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error uploading branding asset:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

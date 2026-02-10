import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: galleryId } = await params

    // Verify gallery ownership
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { userId: true, title: true },
    })

    if (!gallery || gallery.userId !== session.user.id) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 })
    }

    // Fetch all favorite lists with photos
    const favoriteLists = await prisma.favoriteList.findMany({
      where: { galleryId },
      include: {
        photos: {
          include: {
            photo: {
              select: { filename: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Build CSV
    const rows: string[] = [
      "List Name,Email,Submitted At,Photo Filename,Comment",
    ]

    for (const list of favoriteLists) {
      for (const fp of list.photos) {
        const name = csvEscape(list.name || "Anonymous")
        const email = csvEscape(list.email)
        const submittedAt = list.submittedAt
          ? new Date(list.submittedAt).toISOString().split("T")[0]
          : ""
        const filename = csvEscape(fp.photo.filename)
        const comment = csvEscape(fp.comment || "")
        rows.push(`${name},${email},${submittedAt},${filename},${comment}`)
      }
    }

    const csv = rows.join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${gallery.title.replace(/[^a-zA-Z0-9 _-]/g, "")}-favorites.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting favorites:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

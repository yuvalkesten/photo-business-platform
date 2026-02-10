"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"

const submitSchema = z.object({
  listId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  note: z.string().optional(),
})

export async function submitFavorites(data: {
  listId: string
  name: string
  email: string
  note?: string
}) {
  try {
    const validated = submitSchema.parse(data)

    // Get the favorite list with its photos
    const list = await prisma.favoriteList.findUnique({
      where: { id: validated.listId },
      include: {
        photos: true,
        gallery: {
          select: {
            title: true,
            userId: true,
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    })

    if (!list) return { error: "Favorites list not found" }
    if (list.photos.length === 0) return { error: "No photos selected" }
    if (list.submittedAt) return { error: "This list has already been submitted" }

    // Update the list with contact info and mark as submitted
    await prisma.favoriteList.update({
      where: { id: validated.listId },
      data: {
        name: validated.name,
        email: validated.email,
        note: validated.note,
        submittedAt: new Date(),
      },
    })

    // TODO: Send email notification to photographer
    // This would use the existing email infrastructure
    // For now, the photographer can see submitted lists in the admin dashboard

    return {
      success: true,
      photoCount: list.photos.length,
    }
  } catch (error) {
    console.error("Error submitting favorites:", error)
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message }
    }
    return { error: "Failed to submit favorites" }
  }
}

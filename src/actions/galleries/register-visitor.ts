"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"

const visitorSchema = z.object({
  galleryId: z.string().min(1),
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
})

export async function registerVisitor(data: {
  galleryId: string
  email: string
  name?: string
}) {
  try {
    const validated = visitorSchema.parse(data)

    // Upsert visitor (don't create duplicates)
    await prisma.galleryVisitor.upsert({
      where: {
        galleryId_email: {
          galleryId: validated.galleryId,
          email: validated.email,
        },
      },
      update: {
        visitedAt: new Date(),
        name: validated.name || undefined,
      },
      create: {
        galleryId: validated.galleryId,
        email: validated.email,
        name: validated.name,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error registering visitor:", error)
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message }
    }
    return { error: "Failed to register" }
  }
}

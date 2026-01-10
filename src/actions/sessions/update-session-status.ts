"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updateSessionStatusSchema } from "@/lib/validations/session.schema"

export async function updateSessionStatus(sessionId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updateSessionStatusSchema.parse(data)

    // Check if session exists and belongs to user
    const existingSession = await prisma.photoSession.findUnique({
      where: { id: sessionId },
      include: {
        project: true,
      },
    })

    if (!existingSession) {
      return { error: "Session not found" }
    }

    if (existingSession.project.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Update the session status
    const session = await prisma.photoSession.update({
      where: { id: sessionId },
      data: {
        status: validatedData.status,
      },
      include: {
        project: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath(`/dashboard/projects/${existingSession.projectId}`)

    return { success: true, session }
  } catch (error) {
    console.error("Error updating session status:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update session status" }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { updatePhotoSessionSchema } from "@/lib/validations/session.schema"
import { updateCalendarEvent } from "@/lib/google/calendar"

export async function updateSession(sessionId: string, data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = updatePhotoSessionSchema.parse(data)

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

    // Try to update Google Calendar event if it exists
    if (existingSession.googleEventId) {
      try {
        await updateCalendarEvent(user.id, {
          eventId: existingSession.googleEventId,
          summary: validatedData.title,
          description: validatedData.description,
          location: validatedData.location,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          timezone: validatedData.timezone,
        })
      } catch (calendarError) {
        console.error("Error updating calendar event:", calendarError)
        // Continue without calendar sync if it fails
      }
    }

    // Update the session
    const session = await prisma.photoSession.update({
      where: { id: sessionId },
      data: validatedData,
      include: {
        project: {
          include: {
            contact: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath(`/dashboard/projects/${existingSession.projectId}`)

    return { success: true, session }
  } catch (error) {
    console.error("Error updating session:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to update session" }
  }
}

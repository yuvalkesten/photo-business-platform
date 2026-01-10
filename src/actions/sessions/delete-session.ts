"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { deleteCalendarEvent } from "@/lib/google/calendar"

export async function deleteSession(sessionId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

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

    // Try to delete from Google Calendar if event exists
    if (existingSession.googleEventId) {
      try {
        await deleteCalendarEvent(user.id, existingSession.googleEventId)
      } catch (calendarError) {
        console.error("Error deleting calendar event:", calendarError)
        // Continue with deletion even if calendar sync fails
      }
    }

    // Delete the session
    await prisma.photoSession.delete({
      where: { id: sessionId },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath(`/dashboard/projects/${existingSession.projectId}`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting session:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to delete session" }
  }
}

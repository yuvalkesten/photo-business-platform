"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { createPhotoSessionSchema } from "@/lib/validations/session.schema"
import { createCalendarEvent } from "@/lib/google/calendar"
import { PhotoSessionStatus } from "@prisma/client"

export async function createSession(data: unknown) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Validate the input data
    const validatedData = createPhotoSessionSchema.parse(data)

    // Verify the project belongs to the user
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
      include: {
        contact: true,
      },
    })

    if (!project || project.userId !== user.id) {
      return { error: "Project not found or unauthorized" }
    }

    // Try to create Google Calendar event
    let googleEventId: string | undefined
    let googleCalendarId: string | undefined

    try {
      const calendarEvent = await createCalendarEvent(user.id, {
        summary: `${validatedData.title} - ${project.contact.firstName} ${project.contact.lastName}`,
        description: validatedData.description || `Project: ${project.name}`,
        location: validatedData.location,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        timezone: validatedData.timezone,
      })

      googleEventId = calendarEvent.eventId
      googleCalendarId = calendarEvent.calendarId
    } catch (calendarError) {
      console.error("Error creating calendar event:", calendarError)
      // Continue without calendar sync if it fails
    }

    // Create the session
    const session = await prisma.photoSession.create({
      data: {
        projectId: validatedData.projectId,
        title: validatedData.title,
        description: validatedData.description,
        scheduledAt: validatedData.scheduledAt,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        timezone: validatedData.timezone,
        location: validatedData.location,
        locationNotes: validatedData.locationNotes,
        status: validatedData.status || PhotoSessionStatus.SCHEDULED,
        googleEventId,
        googleCalendarId,
      },
      include: {
        project: {
          include: {
            contact: true,
          },
        },
      },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath(`/dashboard/projects/${validatedData.projectId}`)

    return {
      success: true,
      session,
      calendarSynced: !!googleEventId,
    }
  } catch (error) {
    console.error("Error creating session:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to create session" }
  }
}

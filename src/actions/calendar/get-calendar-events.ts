"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { listCalendarEvents } from "@/lib/google/calendar"
import type { PhotoSessionStatus } from "@prisma/client"

export interface CalendarEvent {
  id: string
  googleEventId?: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  description?: string
  // Local session data if matched
  sessionId?: string
  projectId?: string
  projectName?: string
  contactName?: string
  status?: PhotoSessionStatus
  // For styling
  color?: string
}

export interface GetCalendarEventsParams {
  startDate: Date
  endDate: Date
}

const statusColors: Record<PhotoSessionStatus, string> = {
  SCHEDULED: "hsl(var(--primary))",
  COMPLETED: "hsl(var(--muted-foreground))",
  RESCHEDULED: "hsl(48 96% 53%)", // yellow
  CANCELLED: "hsl(var(--destructive))",
}

export async function getCalendarEvents(params: GetCalendarEventsParams) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const { startDate, endDate } = params

    // Fetch events from Google Calendar
    let googleEvents: any[] = []
    try {
      googleEvents = await listCalendarEvents(user.id, {
        timeMin: startDate,
        timeMax: endDate,
      })
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error)
      // Continue without Google events if there's an error (e.g., no Google account)
    }

    // Get local sessions for this time range to match with Google events
    const localSessions = await prisma.photoSession.findMany({
      where: {
        project: {
          userId: user.id,
        },
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            contact: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Create a map of googleEventId to local session
    const sessionByGoogleEventId = new Map(
      localSessions
        .filter((s) => s.googleEventId)
        .map((s) => [s.googleEventId, s])
    )

    // Transform Google events to CalendarEvent format
    const events: CalendarEvent[] = googleEvents.map((event) => {
      const localSession = event.id ? sessionByGoogleEventId.get(event.id) : undefined

      const startDateTime = event.start?.dateTime || event.start?.date
      const endDateTime = event.end?.dateTime || event.end?.date
      const isAllDay = !event.start?.dateTime

      return {
        id: event.id || crypto.randomUUID(),
        googleEventId: event.id,
        title: event.summary || "Untitled Event",
        start: startDateTime,
        end: endDateTime,
        allDay: isAllDay,
        location: event.location,
        description: event.description,
        // Add local session data if matched
        sessionId: localSession?.id,
        projectId: localSession?.project.id,
        projectName: localSession?.project.name,
        contactName: localSession
          ? `${localSession.project.contact.firstName} ${localSession.project.contact.lastName}`
          : undefined,
        status: localSession?.status,
        color: localSession ? statusColors[localSession.status] : undefined,
      }
    })

    // Add local sessions that don't have Google events (shouldn't happen normally)
    const googleEventIds = new Set(googleEvents.map((e) => e.id))
    for (const session of localSessions) {
      if (!session.googleEventId || !googleEventIds.has(session.googleEventId)) {
        events.push({
          id: session.id,
          title: session.title,
          start: session.startTime.toISOString(),
          end: session.endTime.toISOString(),
          allDay: false,
          location: session.location || undefined,
          description: session.description || undefined,
          sessionId: session.id,
          projectId: session.project.id,
          projectName: session.project.name,
          contactName: `${session.project.contact.firstName} ${session.project.contact.lastName}`,
          status: session.status,
          color: statusColors[session.status],
        })
      }
    }

    return {
      success: true,
      events,
    }
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch calendar events" }
  }
}

export interface ProjectForSelect {
  id: string
  name: string
  contactName: string
}

export async function getProjectsForCalendar(): Promise<{ projects?: ProjectForSelect[]; error?: string }> {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
        status: {
          notIn: ["CANCELLED", "COMPLETED"],
        },
      },
      select: {
        id: true,
        name: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        contactName: `${p.contact.firstName} ${p.contact.lastName}`,
      })),
    }
  } catch (error) {
    console.error("Error fetching projects for calendar:", error)
    return { error: "Failed to fetch projects" }
  }
}

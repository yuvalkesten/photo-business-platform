import { google } from "googleapis"
import { prisma } from "@/lib/db"

export async function getCalendarClient(userId: string) {
  // Get user's Google account with tokens
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  })

  if (!account || !account.access_token) {
    throw new Error("No Google account connected or access token missing")
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          refresh_token: tokens.refresh_token || account.refresh_token,
        },
      })
    }
  })

  return google.calendar({ version: "v3", auth: oauth2Client })
}

export interface CreateCalendarEventParams {
  summary: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  timezone: string
}

export async function createCalendarEvent(
  userId: string,
  params: CreateCalendarEventParams
) {
  const calendar = await getCalendarClient(userId)

  const event = {
    summary: params.summary,
    description: params.description,
    location: params.location,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: params.timezone,
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: params.timezone,
    },
    reminders: {
      useDefault: true,
    },
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  })

  return {
    eventId: response.data.id!,
    calendarId: "primary",
  }
}

export interface UpdateCalendarEventParams {
  eventId: string
  summary?: string
  description?: string
  location?: string
  startTime?: Date
  endTime?: Date
  timezone?: string
}

export async function updateCalendarEvent(
  userId: string,
  params: UpdateCalendarEventParams
) {
  const calendar = await getCalendarClient(userId)

  const event: any = {}

  if (params.summary !== undefined) event.summary = params.summary
  if (params.description !== undefined) event.description = params.description
  if (params.location !== undefined) event.location = params.location

  if (params.startTime && params.timezone) {
    event.start = {
      dateTime: params.startTime.toISOString(),
      timeZone: params.timezone,
    }
  }

  if (params.endTime && params.timezone) {
    event.end = {
      dateTime: params.endTime.toISOString(),
      timeZone: params.timezone,
    }
  }

  await calendar.events.patch({
    calendarId: "primary",
    eventId: params.eventId,
    requestBody: event,
  })

  return {
    eventId: params.eventId,
    calendarId: "primary",
  }
}

export async function deleteCalendarEvent(userId: string, eventId: string) {
  const calendar = await getCalendarClient(userId)

  await calendar.events.delete({
    calendarId: "primary",
    eventId: eventId,
  })

  return { success: true }
}

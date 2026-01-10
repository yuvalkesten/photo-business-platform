import { z } from "zod"
import { PhotoSessionStatus } from "@prisma/client"

export const photoSessionSchema = z.object({
  // Relations
  projectId: z.string().min(1, "Project is required"),

  // Session Details
  title: z.string().min(1, "Session title is required").max(200),
  description: z.string().optional(),

  // Date & Time
  scheduledAt: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  timezone: z.string().default("America/New_York"),

  // Location
  location: z.string().max(500).optional(),
  locationNotes: z.string().optional(),

  // Status
  status: z.nativeEnum(PhotoSessionStatus).default(PhotoSessionStatus.SCHEDULED),

  // Google Calendar Integration (handled by server, not form input)
  googleEventId: z.string().optional(),
  googleCalendarId: z.string().optional(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
)

export const createPhotoSessionSchema = photoSessionSchema.omit({
  googleEventId: true,
  googleCalendarId: true,
})

export const updatePhotoSessionSchema = photoSessionSchema.partial().omit({
  googleEventId: true,
  googleCalendarId: true,
})

export const updateSessionStatusSchema = z.object({
  status: z.nativeEnum(PhotoSessionStatus),
})

// Form data type with optional defaults
export type PhotoSessionFormData = z.input<typeof photoSessionSchema>
export type CreatePhotoSessionData = z.infer<typeof createPhotoSessionSchema>
export type UpdatePhotoSessionData = z.infer<typeof updatePhotoSessionSchema>
export type UpdateSessionStatusData = z.infer<typeof updateSessionStatusSchema>

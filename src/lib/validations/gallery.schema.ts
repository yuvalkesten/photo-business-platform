import { z } from "zod"

export const gallerySchema = z.object({
  // Relations
  projectId: z.string().min(1, "Project is required"),
  contactId: z.string().min(1, "Contact is required"),

  // Details
  title: z.string().min(1, "Gallery title is required").max(200),
  description: z.string().optional(),
  coverImage: z.string().url("Invalid URL").optional().or(z.literal("")),

  // Access Control
  isPublic: z.boolean().default(false),
  password: z.string().optional(),
  expiresAt: z.coerce.date().optional(),

  // Settings
  allowDownload: z.boolean().default(true),
  watermark: z.boolean().default(false),
  requireEmail: z.boolean().default(false),
})

export const createGallerySchema = gallerySchema

export const updateGallerySchema = gallerySchema.partial()

// Form data type with optional defaults
export type GalleryFormData = z.input<typeof gallerySchema>
export type CreateGalleryData = z.infer<typeof createGallerySchema>
export type UpdateGalleryData = z.infer<typeof updateGallerySchema>

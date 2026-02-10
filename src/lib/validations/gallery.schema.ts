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

  // Theming
  theme: z.enum(["classic", "modern", "editorial", "dark", "minimal"]).default("classic"),
  gridStyle: z.enum(["grid", "masonry", "column", "row"]).default("grid"),
  fontFamily: z.enum(["inter", "playfair", "cormorant", "lora", "montserrat"]).default("inter"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").default("#000000"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").default("#8b5cf6"),

  // Download options
  downloadResolution: z.enum(["original", "high_3600", "web_2048", "web_1024"]).default("original"),
  favoriteLimit: z.coerce.number().int().min(1).optional().nullable(),
})

export const createGallerySchema = gallerySchema

export const updateGallerySchema = gallerySchema.partial()

// Form data type with optional defaults
export type GalleryFormData = z.input<typeof gallerySchema>
export type CreateGalleryData = z.infer<typeof createGallerySchema>
export type UpdateGalleryData = z.infer<typeof updateGallerySchema>

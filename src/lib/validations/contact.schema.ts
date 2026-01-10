import { z } from "zod"
import { ContactType, ContactStatus } from "@prisma/client"

export const contactSchema = z.object({
  // Basic Info
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),

  // Organization
  organizationId: z.string().optional(),
  jobTitle: z.string().max(200).optional(),

  // Additional Info
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),

  // Categorization
  type: z.nativeEnum(ContactType).default(ContactType.LEAD),
  source: z.string().max(200).optional(),
  tags: z.array(z.string()).default([]),

  // Status & Notes
  status: z.nativeEnum(ContactStatus).default(ContactStatus.ACTIVE),
  notes: z.string().optional(),
})

export const createContactSchema = contactSchema

export const updateContactSchema = contactSchema.partial()

export type ContactFormData = z.infer<typeof contactSchema>
export type CreateContactData = z.infer<typeof createContactSchema>
export type UpdateContactData = z.infer<typeof updateContactSchema>

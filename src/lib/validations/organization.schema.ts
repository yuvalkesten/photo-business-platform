import { z } from "zod"
import { OrgType } from "@prisma/client"

export const organizationSchema = z.object({
  // Basic Info
  name: z.string().min(1, "Organization name is required").max(200),
  type: z.nativeEnum(OrgType).optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),

  // Address
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),

  // Additional
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export const createOrganizationSchema = organizationSchema

export const updateOrganizationSchema = organizationSchema.partial()

export type OrganizationFormData = z.infer<typeof organizationSchema>
export type CreateOrganizationData = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationData = z.infer<typeof updateOrganizationSchema>

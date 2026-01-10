import { z } from "zod"
import { ProjectType, ProjectStatus, LeadTemperature, LostReason } from "@prisma/client"

// Base schema without refinements (for partial/extend usage)
const projectBaseSchema = z.object({
  // Project Details
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().optional(),
  projectType: z.nativeEnum(ProjectType),

  // Relations
  contactId: z.string().min(1, "Contact is required"),
  organizationId: z.string().optional(),

  // Workflow Stage
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.INQUIRY),

  // Financial
  totalPrice: z.coerce.number().nonnegative().optional(),
  deposit: z.coerce.number().nonnegative().optional(),
  paidAmount: z.coerce.number().nonnegative().optional(),

  // Additional Info
  source: z.string().max(200).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // CRM Lead Fields
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().nonnegative().optional(),
  leadTemperature: z.nativeEnum(LeadTemperature).optional().nullable(),
  nextFollowUpDate: z.coerce.date().optional().nullable(),
  lastContactDate: z.coerce.date().optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  closeProbability: z.coerce.number().min(0).max(100).optional().nullable(),
  eventDate: z.coerce.date().optional().nullable(),
  lostReason: z.nativeEnum(LostReason).optional().nullable(),
  lostNotes: z.string().optional().nullable(),
  bookedAt: z.coerce.date().optional().nullable(),
})

// Budget refinement function
const budgetRefinement = (data: { budgetMin?: number; budgetMax?: number }) => {
  if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
    return data.budgetMax >= data.budgetMin
  }
  return true
}

const budgetRefinementConfig = {
  message: "Maximum budget must be greater than or equal to minimum budget",
  path: ["budgetMax"] as const,
}

// Full schema with refinements (for create)
export const projectSchema = projectBaseSchema.refine(budgetRefinement, budgetRefinementConfig)

export const createProjectSchema = projectSchema

// Update schema - partial without refinement issue
export const updateProjectSchema = projectBaseSchema.partial().extend({
  // Ensure status updates are intentional
  status: z.nativeEnum(ProjectStatus).optional(),
  // Allow marking as completed
  completedAt: z.date().optional(),
}).refine(budgetRefinement, budgetRefinementConfig)

export const updateProjectStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
})

// Convert lead to booked project
export const convertToBookedSchema = z.object({
  totalPrice: z.coerce.number().nonnegative().optional(),
  deposit: z.coerce.number().nonnegative().optional(),
})

// Mark lead as lost
export const markAsLostSchema = z.object({
  lostReason: z.nativeEnum(LostReason),
  lostNotes: z.string().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>
export type CreateProjectData = z.infer<typeof createProjectSchema>
export type UpdateProjectData = z.infer<typeof updateProjectSchema>
export type UpdateProjectStatusData = z.infer<typeof updateProjectStatusSchema>
export type ConvertToBookedData = z.infer<typeof convertToBookedSchema>
export type MarkAsLostData = z.infer<typeof markAsLostSchema>

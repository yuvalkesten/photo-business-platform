import { type Project, type Contact, type Organization, type PhotoSession } from "@prisma/client"

// Serialized project type where Decimal fields are converted to number
export type SerializedProject = Omit<Project, "budgetMin" | "budgetMax" | "totalPrice" | "deposit" | "paidAmount"> & {
  budgetMin: number | null
  budgetMax: number | null
  totalPrice: number | null
  deposit: number | null
  paidAmount: number | null
}

// Project with relations (serialized)
export type SerializedProjectWithRelations = SerializedProject & {
  contact: Pick<Contact, "id" | "firstName" | "lastName" | "email" | "phone"> & { type?: string }
  organization?: Pick<Organization, "id" | "name"> | null
  sessions?: Array<{ id: string; title: string; scheduledAt: Date }>
  _count?: {
    sessions: number
    galleries: number
  }
}

// Lead with relations (serialized) - used in LeadKanban and LeadCard
export type SerializedLeadWithRelations = SerializedProject & {
  contact: Pick<Contact, "id" | "firstName" | "lastName" | "email" | "phone" | "type">
  organization: Pick<Organization, "id" | "name"> | null
  sessions: Array<{ id: string; title: string; scheduledAt: Date }>
  _count: { sessions: number; galleries: number }
}

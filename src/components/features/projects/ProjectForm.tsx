"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ProjectType, ProjectStatus, type Project, type Contact, type Organization } from "@prisma/client"
import { projectSchema, type ProjectFormData } from "@/lib/validations/project.schema"
import { createProject } from "@/actions/projects/create-project"
import { updateProject } from "@/actions/projects/update-project"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface ProjectFormProps {
  project?: Project & { contact?: Contact | null; organization?: Organization | null }
  contacts: Contact[]
  organizations: Organization[]
  defaultContactId?: string
}

const projectTypeLabels: Record<ProjectType, string> = {
  WEDDING: "Wedding",
  ENGAGEMENT: "Engagement",
  PORTRAIT: "Portrait",
  FAMILY: "Family",
  NEWBORN: "Newborn",
  CORPORATE: "Corporate",
  EVENT: "Event",
  COMMERCIAL: "Commercial",
  REAL_ESTATE: "Real Estate",
  OTHER: "Other",
}

const projectStatusLabels: Record<ProjectStatus, string> = {
  INQUIRY: "Inquiry",
  PROPOSAL_SENT: "Proposal Sent",
  BOOKED: "Booked",
  IN_PROGRESS: "In Progress",
  POST_PRODUCTION: "Post-Production",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
}

export function ProjectForm({ project, contacts, organizations, defaultContactId }: ProjectFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      projectType: project?.projectType || ProjectType.WEDDING,
      contactId: project?.contactId || defaultContactId || "",
      organizationId: project?.organizationId || undefined,
      status: project?.status || ProjectStatus.INQUIRY,
      totalPrice: project?.totalPrice ? Number(project.totalPrice) : undefined,
      deposit: project?.deposit ? Number(project.deposit) : undefined,
      paidAmount: project?.paidAmount ? Number(project.paidAmount) : undefined,
      source: project?.source || "",
      notes: project?.notes || "",
      tags: project?.tags || [],
    },
  })

  const onSubmit = (data: ProjectFormData) => {
    startTransition(async () => {
      const result = project
        ? await updateProject(project.id, data)
        : await createProject(data)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: project ? "Project updated" : "Project created",
        description: project
          ? "The project has been updated successfully."
          : "The project has been created successfully.",
      })

      router.push("/dashboard/projects")
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Basic information about this project</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Sarah & Mike's Wedding"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectType">Project Type *</Label>
            <Select
              value={form.watch("projectType")}
              onValueChange={(value) => form.setValue("projectType", value as ProjectType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(projectTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as ProjectStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(projectStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Project details and notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Client & Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Who is this project for?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactId">Primary Contact *</Label>
            <Select
              value={form.watch("contactId")}
              onValueChange={(value) => form.setValue("contactId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName} ({contact.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.contactId && (
              <p className="text-sm text-destructive">{form.formState.errors.contactId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationId">Organization</Label>
            <Select
              value={form.watch("organizationId") || "none"}
              onValueChange={(value) => form.setValue("organizationId", value === "none" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No organization</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              {...form.register("source")}
              placeholder="How did they find you?"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Financial details for this project</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalPrice">Total Price ($)</Label>
            <Input
              id="totalPrice"
              type="number"
              step="0.01"
              {...form.register("totalPrice", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit">Deposit ($)</Label>
            <Input
              id="deposit"
              type="number"
              step="0.01"
              {...form.register("deposit", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">Amount Paid ($)</Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              {...form.register("paidAmount", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Additional information about this project</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...form.register("notes")}
            placeholder="Any additional notes about this project..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : project ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  )
}

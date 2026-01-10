"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { z } from "zod"
import { createSession } from "@/actions/sessions/create-session"
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
import { useToast } from "@/hooks/use-toast"
import type { ProjectForSelect } from "@/actions/calendar"

interface QuickAddSessionFormProps {
  projects: ProjectForSelect[]
  selectedDate: Date | null
  selectedEndDate: Date | null
  onSuccess: () => void
  onCancel: () => void
}

const quickSessionSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  timezone: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
})

type QuickSessionFormData = z.infer<typeof quickSessionSchema>

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0]
}

function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

export function QuickAddSessionForm({
  projects,
  selectedDate,
  selectedEndDate,
  onSuccess,
  onCancel,
}: QuickAddSessionFormProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const defaultDate = selectedDate ? formatDateForInput(selectedDate) : ""
  const defaultStartTime = selectedDate ? formatTimeForInput(selectedDate) : "09:00"
  const defaultEndTime = selectedEndDate ? formatTimeForInput(selectedEndDate) : "10:00"

  const form = useForm<QuickSessionFormData>({
    resolver: zodResolver(quickSessionSchema),
    defaultValues: {
      projectId: "",
      title: "",
      date: defaultDate,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      timezone: "America/New_York",
      location: "",
      description: "",
    },
  })

  const onSubmit = (data: QuickSessionFormData) => {
    startTransition(async () => {
      const scheduledAt = new Date(`${data.date}T${data.startTime}`)
      const startTime = new Date(`${data.date}T${data.startTime}`)
      const endTime = new Date(`${data.date}T${data.endTime}`)

      const result = await createSession({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        scheduledAt,
        startTime,
        endTime,
        timezone: data.timezone,
        location: data.location,
      })

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Session created",
        description: "The session has been created and synced to your Google Calendar.",
      })

      onSuccess()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="projectId">Project *</Label>
        <Select
          value={form.watch("projectId")}
          onValueChange={(value) => form.setValue("projectId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div>
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted-foreground ml-2">({project.contactName})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.projectId && (
          <p className="text-sm text-destructive">{form.formState.errors.projectId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Session Title *</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="e.g., Engagement Shoot, Wedding Day"
        />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            {...form.register("date")}
          />
          {form.formState.errors.date && (
            <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Start *</Label>
          <Input
            id="startTime"
            type="time"
            {...form.register("startTime")}
          />
          {form.formState.errors.startTime && (
            <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End *</Label>
          <Input
            id="endTime"
            type="time"
            {...form.register("endTime")}
          />
          {form.formState.errors.endTime && (
            <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select
          value={form.watch("timezone")}
          onValueChange={(value) => form.setValue("timezone", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="America/New_York">Eastern Time</SelectItem>
            <SelectItem value="America/Chicago">Central Time</SelectItem>
            <SelectItem value="America/Denver">Mountain Time</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            <SelectItem value="America/Phoenix">Arizona Time</SelectItem>
            <SelectItem value="Pacific/Honolulu">Hawaii Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          {...form.register("location")}
          placeholder="Venue or address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Notes</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Any additional details..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Session"}
        </Button>
      </div>
    </form>
  )
}

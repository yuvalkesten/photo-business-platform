"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { PhotoSessionStatus, type PhotoSession } from "@prisma/client"
import { photoSessionSchema } from "@/lib/validations/session.schema"
import { createSession } from "@/actions/sessions/create-session"
import { updateSession } from "@/actions/sessions/update-session"
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
import { z } from "zod"

interface SessionFormProps {
  session?: PhotoSession
  projectId: string
  projectName: string
}

const sessionStatusLabels: Record<PhotoSessionStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
}

// Create a form-specific schema that handles date strings
const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  timezone: z.string().default("America/New_York"),
  location: z.string().optional(),
  locationNotes: z.string().optional(),
  status: z.nativeEnum(PhotoSessionStatus).default(PhotoSessionStatus.SCHEDULED),
})

type SessionFormData = z.input<typeof sessionFormSchema>

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0]
}

function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

export function SessionForm({ session, projectId, projectName }: SessionFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: session?.title || "",
      description: session?.description || "",
      date: session ? formatDateForInput(new Date(session.scheduledAt)) : "",
      startTime: session ? formatTimeForInput(new Date(session.startTime)) : "",
      endTime: session ? formatTimeForInput(new Date(session.endTime)) : "",
      timezone: session?.timezone || "America/New_York",
      location: session?.location || "",
      locationNotes: session?.locationNotes || "",
      status: session?.status || PhotoSessionStatus.SCHEDULED,
    },
  })

  const onSubmit = (data: SessionFormData) => {
    startTransition(async () => {
      // Convert form data to API format
      const scheduledAt = new Date(`${data.date}T${data.startTime}`)
      const startTime = new Date(`${data.date}T${data.startTime}`)
      const endTime = new Date(`${data.date}T${data.endTime}`)

      const apiData = {
        projectId,
        title: data.title,
        description: data.description,
        scheduledAt,
        startTime,
        endTime,
        timezone: data.timezone,
        location: data.location,
        locationNotes: data.locationNotes,
        status: data.status,
      }

      const result = session
        ? await updateSession(session.id, apiData)
        : await createSession(apiData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: session ? "Session updated" : "Session created",
        description: session
          ? "The session has been updated successfully."
          : "The session has been created and synced to your Google Calendar.",
      })

      router.push(`/dashboard/projects/${projectId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>For project: {projectName}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Session Title *</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Wedding Day, Engagement Shoot, etc."
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as PhotoSessionStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sessionStatusLabels).map(([value, label]) => (
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
              placeholder="Session details, special requests, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
          <CardDescription>When is this session scheduled?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label htmlFor="startTime">Start Time *</Label>
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
            <Label htmlFor="endTime">End Time *</Label>
            <Input
              id="endTime"
              type="time"
              {...form.register("endTime")}
            />
            {form.formState.errors.endTime && (
              <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
            )}
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
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Where is this session taking place?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...form.register("location")}
              placeholder="Venue name or address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationNotes">Location Notes</Label>
            <Textarea
              id="locationNotes"
              {...form.register("locationNotes")}
              placeholder="Parking info, entrance details, etc."
              rows={3}
            />
          </div>
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
          {isPending ? "Saving..." : session ? "Update Session" : "Create Session"}
        </Button>
      </div>
    </form>
  )
}

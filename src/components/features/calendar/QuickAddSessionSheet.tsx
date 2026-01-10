"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { QuickAddSessionForm } from "./QuickAddSessionForm"
import type { ProjectForSelect } from "@/actions/calendar"
import { Calendar } from "lucide-react"

interface QuickAddSessionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: ProjectForSelect[]
  selectedDate: Date | null
  selectedEndDate: Date | null
  onSuccess: () => void
}

export function QuickAddSessionSheet({
  open,
  onOpenChange,
  projects,
  selectedDate,
  selectedEndDate,
  onSuccess,
}: QuickAddSessionSheetProps) {
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Add Session
          </SheetTitle>
          <SheetDescription>
            {formattedDate
              ? `Schedule a photo session for ${formattedDate}`
              : "Schedule a new photo session"}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active projects found.</p>
              <p className="text-sm mt-2">
                Create a project first to schedule sessions.
              </p>
            </div>
          ) : (
            <QuickAddSessionForm
              projects={projects}
              selectedDate={selectedDate}
              selectedEndDate={selectedEndDate}
              onSuccess={onSuccess}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

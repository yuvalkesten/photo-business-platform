import { Suspense } from "react"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth/utils"
import { getCalendarEvents, getProjectsForCalendar } from "@/actions/calendar"
import { CalendarView } from "@/components/features/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, AlertCircle } from "lucide-react"

function CalendarLoading() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Calendar skeleton */}
      <Card>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-7 border-b">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="p-3 border-r last:border-r-0">
                <Skeleton className="h-4 w-8 mx-auto" />
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          {Array.from({ length: 5 }).map((_, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div key={dayIndex} className="h-24 p-2 border-r last:border-r-0">
                  <Skeleton className="h-5 w-5 mb-2" />
                  {weekIndex % 2 === 0 && dayIndex % 3 === 0 && (
                    <Skeleton className="h-4 w-full" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

async function CalendarContent() {
  // Get current month's date range (with buffer for prev/next month views)
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  const [eventsResult, projectsResult] = await Promise.all([
    getCalendarEvents({ startDate, endDate }),
    getProjectsForCalendar(),
  ])

  if (eventsResult.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading calendar</h3>
          <p className="text-muted-foreground text-center">
            {eventsResult.error}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <CalendarView
      initialEvents={eventsResult.events || []}
      projects={projectsResult.projects || []}
    />
  )
}

export default async function CalendarPage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            View and manage your photo sessions synced with Google Calendar
          </p>
        </div>
      </div>

      {/* Calendar */}
      <Suspense fallback={<CalendarLoading />}>
        <CalendarContent />
      </Suspense>
    </div>
  )
}

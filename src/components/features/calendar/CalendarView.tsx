"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg, EventClickArg, DatesSetArg } from "@fullcalendar/core"
import type { CalendarEvent, ProjectForSelect } from "@/actions/calendar"
import { getCalendarEvents } from "@/actions/calendar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { QuickAddSessionSheet } from "./QuickAddSessionSheet"

interface CalendarViewProps {
  initialEvents: CalendarEvent[]
  projects: ProjectForSelect[]
  userTimezone?: string
}

type ViewType = "dayGridMonth" | "timeGridWeek" | "timeGridDay"

export function CalendarView({ initialEvents, projects, userTimezone = "America/New_York" }: CalendarViewProps) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [currentView, setCurrentView] = useState<ViewType>("dayGridMonth")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  // Quick add state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.start)
    setSelectedEndDate(selectInfo.end)
    setQuickAddOpen(true)
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event
    const projectId = event.extendedProps.projectId

    if (projectId) {
      router.push(`/dashboard/projects/${projectId}`)
    }
  }

  const handleDatesSet = async (dateInfo: DatesSetArg) => {
    setCurrentDate(dateInfo.start)
    setIsLoading(true)

    try {
      const result = await getCalendarEvents({
        startDate: dateInfo.start,
        endDate: dateInfo.end,
      })

      if (result.events) {
        setEvents(result.events)
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    calendarRef.current?.getApi().changeView(view)
  }

  const handleToday = () => {
    calendarRef.current?.getApi().today()
  }

  const handlePrev = () => {
    calendarRef.current?.getApi().prev()
  }

  const handleNext = () => {
    calendarRef.current?.getApi().next()
  }

  const handleSessionCreated = () => {
    setQuickAddOpen(false)
    // Refresh events
    const api = calendarRef.current?.getApi()
    if (api) {
      handleDatesSet({
        start: api.view.activeStart,
        end: api.view.activeEnd,
        startStr: api.view.activeStart.toISOString(),
        endStr: api.view.activeEnd.toISOString(),
        timeZone: userTimezone,
        view: api.view,
      })
    }
    router.refresh()
  }

  const formatTitle = () => {
    const api = calendarRef.current?.getApi()
    if (!api) return ""

    const date = api.getDate()
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long" }

    if (currentView === "timeGridDay") {
      options.day = "numeric"
    }

    return date.toLocaleDateString("en-US", options)
  }

  // Transform events to FullCalendar format
  const fullCalendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color,
    borderColor: event.color,
    extendedProps: {
      sessionId: event.sessionId,
      projectId: event.projectId,
      projectName: event.projectName,
      contactName: event.contactName,
      status: event.status,
      location: event.location,
    },
  }))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold min-w-[200px]">
            {formatTitle()}
          </h2>
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        <Tabs value={currentView} onValueChange={(v) => handleViewChange(v as ViewType)}>
          <TabsList>
            <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
            <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
            <TabsTrigger value="timeGridDay">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar */}
      <div className="fc-wrapper rounded-lg border bg-card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          headerToolbar={false}
          events={fullCalendarEvents}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          weekends={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          timeZone={userTimezone}
          height="auto"
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={true}
          nowIndicator={true}
          eventContent={(eventInfo) => (
            <div className="fc-event-main-content overflow-hidden px-1">
              <div className="font-medium text-xs truncate">{eventInfo.event.title}</div>
              {eventInfo.event.extendedProps.projectName && (
                <div className="text-[10px] opacity-80 truncate">
                  {eventInfo.event.extendedProps.projectName}
                </div>
              )}
            </div>
          )}
        />
      </div>

      {/* Quick Add Sheet */}
      <QuickAddSessionSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        projects={projects}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        onSuccess={handleSessionCreated}
      />

      {/* Custom Styles */}
      <style jsx global>{`
        .fc-wrapper {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-today-bg-color: hsl(var(--accent) / 0.5);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: hsl(var(--muted));
          --fc-list-event-hover-bg-color: hsl(var(--accent));
          --fc-event-text-color: white;
        }

        .fc-wrapper .fc {
          font-family: inherit;
        }

        .fc-wrapper .fc-theme-standard td,
        .fc-wrapper .fc-theme-standard th {
          border-color: hsl(var(--border));
        }

        .fc-wrapper .fc-theme-standard .fc-scrollgrid {
          border-color: hsl(var(--border));
        }

        .fc-wrapper .fc-col-header-cell {
          background: hsl(var(--muted));
          padding: 8px 0;
        }

        .fc-wrapper .fc-col-header-cell-cushion {
          font-weight: 500;
          color: hsl(var(--foreground));
          text-decoration: none;
        }

        .fc-wrapper .fc-daygrid-day-number {
          color: hsl(var(--foreground));
          text-decoration: none;
          padding: 4px 8px;
        }

        .fc-wrapper .fc-daygrid-day.fc-day-today {
          background: hsl(var(--accent) / 0.3);
        }

        .fc-wrapper .fc-daygrid-day:hover {
          background: hsl(var(--accent) / 0.2);
        }

        .fc-wrapper .fc-highlight {
          background: hsl(var(--primary) / 0.1);
        }

        .fc-wrapper .fc-event {
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .fc-wrapper .fc-daygrid-event {
          margin: 1px 2px;
        }

        .fc-wrapper .fc-timegrid-slot {
          height: 40px;
        }

        .fc-wrapper .fc-timegrid-slot-label {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        .fc-wrapper .fc-timegrid-now-indicator-line {
          border-color: hsl(var(--destructive));
        }

        .fc-wrapper .fc-timegrid-now-indicator-arrow {
          border-color: hsl(var(--destructive));
          border-top-color: transparent;
          border-bottom-color: transparent;
        }

        .fc-wrapper .fc-more-link {
          color: hsl(var(--primary));
          font-weight: 500;
        }

        .fc-wrapper .fc-popover {
          background: hsl(var(--popover));
          border-color: hsl(var(--border));
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        .fc-wrapper .fc-popover-header {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  )
}

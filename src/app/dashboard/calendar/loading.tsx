import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
      </div>

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

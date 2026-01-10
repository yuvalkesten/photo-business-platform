"use client"

import { LeadTemperature, ProjectType } from "@prisma/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  DollarSign,
  Flame,
  Thermometer,
  Snowflake,
  Clock,
  AlertCircle,
} from "lucide-react"
import { type SerializedLeadWithRelations } from "@/types/serialized"

interface LeadCardProps {
  lead: SerializedLeadWithRelations
  onDragStart?: (e: React.DragEvent) => void
  draggable?: boolean
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

const temperatureConfig: Record<LeadTemperature, { icon: React.ReactNode; color: string; label: string }> = {
  HOT: {
    icon: <Flame className="h-3 w-3" />,
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Hot",
  },
  WARM: {
    icon: <Thermometer className="h-3 w-3" />,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Warm",
  },
  COLD: {
    icon: <Snowflake className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Cold",
  },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getDaysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function isOverdue(date: Date | null): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

export function LeadCard({ lead, onDragStart, draggable = true }: LeadCardProps) {
  const hasFollowUp = lead.nextFollowUpDate !== null
  const isFollowUpOverdue = isOverdue(lead.nextFollowUpDate)
  const hasBudget = lead.budgetMin !== null || lead.budgetMax !== null
  const hasEventDate = lead.eventDate !== null
  const daysUntilEvent = hasEventDate ? getDaysUntil(lead.eventDate!) : null

  // Calculate probability bar width
  const probability = lead.closeProbability ?? 50

  return (
    <Card
      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isFollowUpOverdue ? "border-red-300 bg-red-50/50" : ""
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Name + Temperature */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate">{lead.name}</h4>
            <p className="text-xs text-muted-foreground truncate">
              {lead.contact.firstName} {lead.contact.lastName}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.leadTemperature && (
              <Badge
                variant="outline"
                className={`text-xs px-1.5 py-0 ${temperatureConfig[lead.leadTemperature].color}`}
              >
                {temperatureConfig[lead.leadTemperature].icon}
              </Badge>
            )}
          </div>
        </div>

        {/* Project Type Badge */}
        <Badge variant="secondary" className="text-xs">
          {projectTypeLabels[lead.projectType]}
        </Badge>

        {/* Event Date */}
        {hasEventDate && (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatDate(lead.eventDate!)}
              {daysUntilEvent !== null && daysUntilEvent >= 0 && (
                <span className="ml-1 text-muted-foreground/70">
                  ({daysUntilEvent === 0 ? "Today" : `${daysUntilEvent}d`})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Budget */}
        {hasBudget && (
          <div className="flex items-center gap-1.5 text-xs">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {lead.budgetMin && lead.budgetMax
                ? `${formatCurrency(Number(lead.budgetMin))} - ${formatCurrency(Number(lead.budgetMax))}`
                : lead.budgetMin
                  ? `From ${formatCurrency(Number(lead.budgetMin))}`
                  : lead.budgetMax
                    ? `Up to ${formatCurrency(Number(lead.budgetMax))}`
                    : ""}
            </span>
          </div>
        )}

        {/* Follow-up Date */}
        {hasFollowUp && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              isFollowUpOverdue ? "text-red-600 font-medium" : ""
            }`}
          >
            {isFollowUpOverdue ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={isFollowUpOverdue ? "" : "text-muted-foreground"}>
              {isFollowUpOverdue ? "Overdue: " : "Follow up: "}
              {formatDate(lead.nextFollowUpDate!)}
            </span>
          </div>
        )}

        {/* Probability Bar */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Likelihood</span>
            <span className="font-medium">{probability}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                probability >= 70
                  ? "bg-green-500"
                  : probability >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${probability}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

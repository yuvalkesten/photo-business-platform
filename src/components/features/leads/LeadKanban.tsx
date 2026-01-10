"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ProjectStatus, LeadTemperature } from "@prisma/client"
import { updateProjectStatus } from "@/actions/projects/update-project-status"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { LeadCard } from "./LeadCard"
import { type SerializedSerializedLeadWithRelations } from "@/types/serialized"

interface LeadKanbanProps {
  leads: SerializedSerializedLeadWithRelations[]
  onConvertToBooked?: (leadId: string) => void
}

const kanbanColumns: { status: ProjectStatus; label: string; color: string }[] = [
  { status: "INQUIRY", label: "New Inquiries", color: "bg-yellow-500" },
  { status: "PROPOSAL_SENT", label: "Proposal Sent", color: "bg-orange-500" },
]

function KanbanColumn({
  status,
  label,
  color,
  leads,
  onDrop,
}: {
  status: ProjectStatus
  label: string
  color: string
  leads: SerializedLeadWithRelations[]
  onDrop: (leadId: string, newStatus: ProjectStatus) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const leadId = e.dataTransfer.getData("leadId")
    if (leadId) {
      onDrop(leadId, status)
    }
  }

  return (
    <div
      className={`flex flex-col flex-1 min-w-[300px] max-w-[400px] rounded-lg border ${
        isDragOver ? "border-primary bg-primary/5" : "bg-muted/30"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h3 className="font-semibold text-sm">{label}</h3>
          <Badge variant="outline" className="ml-auto text-xs">
            {leads.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-3" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="space-y-3">
          {leads.map((lead) => (
            <Link key={lead.id} href={`/dashboard/projects/${lead.id}`}>
              <div
                onDragStart={(e) => {
                  e.dataTransfer.setData("leadId", lead.id)
                }}
              >
                <LeadCard lead={lead} />
              </div>
            </Link>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No leads
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function ConvertDropZone({
  onDrop,
  isDragOver,
  setIsDragOver,
}: {
  onDrop: (leadId: string) => void
  isDragOver: boolean
  setIsDragOver: (value: boolean) => void
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const leadId = e.dataTransfer.getData("leadId")
    if (leadId) {
      onDrop(leadId)
    }
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-w-[200px] rounded-lg border-2 border-dashed transition-all ${
        isDragOver
          ? "border-green-500 bg-green-50 text-green-700"
          : "border-muted-foreground/30 text-muted-foreground"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-6 text-center">
        <div className="text-2xl mb-2">🎉</div>
        <p className="font-medium text-sm">Convert to Booked</p>
        <p className="text-xs mt-1">Drop here to book this lead</p>
      </div>
    </div>
  )
}

export function LeadKanban({ leads, onConvertToBooked }: LeadKanbanProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [localLeads, setLocalLeads] = useState(leads)
  const [isConvertDragOver, setIsConvertDragOver] = useState(false)

  const handleStatusChange = (leadId: string, newStatus: ProjectStatus) => {
    // Don't process if it's the same status
    const lead = localLeads.find((l) => l.id === leadId)
    if (!lead || lead.status === newStatus) return

    // Optimistic update
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    )

    startTransition(async () => {
      const result = await updateProjectStatus(leadId, { status: newStatus })

      if (result.error) {
        // Revert on error
        setLocalLeads(leads)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Lead updated",
          description: `Lead moved to ${newStatus.replace("_", " ").toLowerCase()}`,
        })
      }
    })
  }

  const handleConvertToBooked = (leadId: string) => {
    if (onConvertToBooked) {
      onConvertToBooked(leadId)
    }
  }

  // Group leads by status
  const leadsByStatus = kanbanColumns.reduce(
    (acc, col) => {
      acc[col.status] = localLeads.filter((l) => l.status === col.status)
      return acc
    },
    {} as Record<ProjectStatus, SerializedLeadWithRelations[]>
  )

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {kanbanColumns.map((col) => (
        <KanbanColumn
          key={col.status}
          status={col.status}
          label={col.label}
          color={col.color}
          leads={leadsByStatus[col.status] || []}
          onDrop={handleStatusChange}
        />
      ))}

      {/* Convert to Booked drop zone */}
      {onConvertToBooked && (
        <ConvertDropZone
          onDrop={handleConvertToBooked}
          isDragOver={isConvertDragOver}
          setIsDragOver={setIsConvertDragOver}
        />
      )}
    </div>
  )
}

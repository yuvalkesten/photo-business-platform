"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ProjectStatus, type Project, type Contact, type Organization, type PhotoSession } from "@prisma/client"
import { updateProjectStatus } from "@/actions/projects/update-project-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Calendar, DollarSign, User } from "lucide-react"

type ProjectWithRelations = Project & {
  contact: Pick<Contact, "id" | "firstName" | "lastName" | "email" | "phone">
  organization?: Pick<Organization, "id" | "name"> | null
  sessions?: PhotoSession[]
  _count?: {
    sessions: number
    galleries: number
  }
}

interface ProjectKanbanProps {
  projects: ProjectWithRelations[]
}

// Project statuses only - leads (INQUIRY, PROPOSAL_SENT) are shown in the Leads page
const kanbanColumns: { status: ProjectStatus; label: string; color: string }[] = [
  { status: "BOOKED", label: "Booked", color: "bg-blue-500" },
  { status: "IN_PROGRESS", label: "In Progress", color: "bg-indigo-500" },
  { status: "POST_PRODUCTION", label: "Post-Production", color: "bg-purple-500" },
  { status: "DELIVERED", label: "Delivered", color: "bg-teal-500" },
  { status: "COMPLETED", label: "Completed", color: "bg-green-500" },
]

const projectTypeColors: Record<string, string> = {
  WEDDING: "bg-pink-100 text-pink-800",
  ENGAGEMENT: "bg-rose-100 text-rose-800",
  PORTRAIT: "bg-blue-100 text-blue-800",
  FAMILY: "bg-green-100 text-green-800",
  NEWBORN: "bg-purple-100 text-purple-800",
  CORPORATE: "bg-gray-100 text-gray-800",
  EVENT: "bg-orange-100 text-orange-800",
  COMMERCIAL: "bg-indigo-100 text-indigo-800",
  REAL_ESTATE: "bg-teal-100 text-teal-800",
  OTHER: "bg-slate-100 text-slate-800",
}

function ProjectCard({ project }: { project: ProjectWithRelations }) {
  const nextSession = project.sessions?.[0]

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer mb-3">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2">{project.name}</h4>
              <Badge variant="secondary" className={`text-xs flex-shrink-0 ${projectTypeColors[project.projectType]}`}>
                {project.projectType}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate">
                {project.contact.firstName} {project.contact.lastName}
              </span>
            </div>

            {nextSession && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(nextSession.scheduledAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {project.totalPrice && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>${Number(project.totalPrice).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function KanbanColumn({
  status,
  label,
  color,
  projects,
  onDrop,
}: {
  status: ProjectStatus
  label: string
  color: string
  projects: ProjectWithRelations[]
  onDrop: (projectId: string, newStatus: ProjectStatus) => void
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
    const projectId = e.dataTransfer.getData("projectId")
    if (projectId) {
      onDrop(projectId, status)
    }
  }

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[280px] rounded-lg border ${
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
            {projects.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-3" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {projects.map((project) => (
          <div
            key={project.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("projectId", project.id)
            }}
          >
            <ProjectCard project={project} />
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No projects
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export function ProjectKanban({ projects }: ProjectKanbanProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [localProjects, setLocalProjects] = useState(projects)

  const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
    // Optimistic update
    setLocalProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    )

    startTransition(async () => {
      const result = await updateProjectStatus(projectId, { status: newStatus })

      if (result.error) {
        // Revert on error
        setLocalProjects(projects)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Status updated",
          description: `Project moved to ${newStatus.replace("_", " ").toLowerCase()}`,
        })
      }
    })
  }

  // Group projects by status
  const projectsByStatus = kanbanColumns.reduce((acc, col) => {
    acc[col.status] = localProjects.filter((p) => p.status === col.status)
    return acc
  }, {} as Record<ProjectStatus, ProjectWithRelations[]>)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {kanbanColumns.map((col) => (
        <KanbanColumn
          key={col.status}
          status={col.status}
          label={col.label}
          color={col.color}
          projects={projectsByStatus[col.status] || []}
          onDrop={handleStatusChange}
        />
      ))}
    </div>
  )
}

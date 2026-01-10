import { Suspense } from "react"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { getProjects } from "@/actions/projects"
import { ProjectStatus, ProjectType } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ProjectKanban } from "@/components/features/projects/ProjectKanban"
import { Plus, FolderKanban, Search, LayoutGrid, List, Calendar, DollarSign, User, Target } from "lucide-react"

interface ProjectsPageProps {
  searchParams: Promise<{
    status?: ProjectStatus
    type?: ProjectType
    search?: string
    view?: "kanban" | "list"
    page?: string
  }>
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

const projectStatusColors: Record<ProjectStatus, string> = {
  INQUIRY: "bg-yellow-100 text-yellow-800",
  PROPOSAL_SENT: "bg-orange-100 text-orange-800",
  BOOKED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  POST_PRODUCTION: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
}

function ProjectsLoading() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col min-w-[280px] max-w-[280px] rounded-lg border bg-muted/30">
          <div className="p-3 border-b">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-3 space-y-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <Card key={j}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

async function ProjectsKanbanView({ search, projectType }: { search?: string; projectType?: ProjectType }) {
  const result = await getProjects({ search, projectType, limit: 200 })

  if (result.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    )
  }

  const { projects } = result

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {search
              ? "No projects match your search criteria."
              : "Get started by creating your first project."}
          </p>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <ProjectKanban projects={projects} />
}

async function ProjectsListView({
  search,
  projectType,
  status,
  page,
}: {
  search?: string
  projectType?: ProjectType
  status?: ProjectStatus
  page: number
}) {
  const result = await getProjects({ search, projectType, status, page, limit: 20 })

  if (result.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    )
  }

  const { projects, pagination } = result

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {search
              ? "No projects match your search criteria."
              : "Get started by creating your first project."}
          </p>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        {projects.map((project, index) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className={`flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors ${
              index !== projects.length - 1 ? "border-b" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{project.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {projectTypeLabels[project.projectType]}
                </Badge>
                <Badge className={`text-xs ${projectStatusColors[project.status]}`}>
                  {projectStatusLabels[project.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>
                    {project.contact.firstName} {project.contact.lastName}
                  </span>
                </div>
                {project.sessions?.[0] && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(project.sessions[0].scheduledAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {project.totalPrice && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>${Number(project.totalPrice).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={`/dashboard/projects?view=list&page=${pageNum}${projectType ? `&type=${projectType}` : ""}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
            >
              <Button
                variant={pageNum === page ? "default" : "outline"}
                size="sm"
              >
                {pageNum}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const params = await searchParams
  const status = params.status
  const projectType = params.type
  const search = params.search
  const view = params.view || "kanban"
  const page = parseInt(params.page || "1")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your booked projects from start to completion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/leads">
              <Target className="h-4 w-4 mr-2" />
              View Leads
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <Tabs defaultValue={view} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <TabsList>
            <TabsTrigger value="kanban" asChild>
              <Link href={`/dashboard/projects?view=kanban${projectType ? `&type=${projectType}` : ""}${search ? `&search=${search}` : ""}`}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </Link>
            </TabsTrigger>
            <TabsTrigger value="list" asChild>
              <Link href={`/dashboard/projects?view=list${projectType ? `&type=${projectType}` : ""}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}>
                <List className="h-4 w-4 mr-2" />
                List
              </Link>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-1 gap-2">
            <form className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search projects..."
                  defaultValue={search}
                  className="pl-9"
                />
              </div>
              <input type="hidden" name="view" value={view} />
              <Select name="type" defaultValue={projectType || "all"}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(projectTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {view === "list" && (
                <Select name="status" defaultValue={status || "all"}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(projectStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button type="submit">Filter</Button>
            </form>
          </div>
        </div>

        <TabsContent value="kanban" className="mt-0">
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsKanbanView search={search} projectType={projectType} />
          </Suspense>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsListView search={search} projectType={projectType} status={status} page={page} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

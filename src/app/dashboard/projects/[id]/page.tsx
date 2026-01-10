import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getProject } from "@/actions/projects"
import { deleteProject } from "@/actions/projects/delete-project"
import { ProjectStatus, ProjectType, PhotoSessionStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  User,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  ImageIcon,
  Plus,
  Clock,
} from "lucide-react"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
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

const sessionStatusColors: Record<PhotoSessionStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  RESCHEDULED: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getProject(id)

  if (result.error || !result.project) {
    notFound()
  }

  const { project } = result
  const contact = project.contact
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase()

  async function handleDelete() {
    "use server"
    const result = await deleteProject(id)
    if (!result.error) {
      redirect("/dashboard/projects")
    }
  }

  // Calculate financial summary
  const totalPrice = project.totalPrice ? Number(project.totalPrice) : 0
  const deposit = project.deposit ? Number(project.deposit) : 0
  const paidAmount = project.paidAmount ? Number(project.paidAmount) : 0
  const remaining = totalPrice - paidAmount

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{projectTypeLabels[project.projectType]}</Badge>
            <Badge className={projectStatusColors[project.status]}>
              {projectStatusLabels[project.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/projects/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button variant="destructive" type="submit">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Project Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Client Card */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/contacts/${contact.id}`} className="block">
                <div className="flex items-start gap-3 p-3 -m-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Organization Card */}
          {project.organization && (
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/dashboard/organizations/${project.organization.id}`} className="block">
                  <div className="flex items-center gap-3 p-3 -m-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{project.organization.name}</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Price</span>
                <span className="font-medium">${totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Deposit</span>
                <span className="font-medium">${deposit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-green-600">${paidAmount.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-medium">Remaining</span>
                <span className={`font-bold ${remaining > 0 ? "text-orange-600" : "text-green-600"}`}>
                  ${remaining.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(project.notes || project.source) && (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.source && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Source</p>
                    <p className="text-sm">{project.source}</p>
                  </div>
                )}
                {project.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sessions & Galleries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sessions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sessions
                </CardTitle>
                <CardDescription>
                  {project.sessions?.length || 0} photo session(s) scheduled
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/projects/${id}/sessions/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Session
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {project.sessions && project.sessions.length > 0 ? (
                <div className="space-y-3">
                  {project.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{session.title}</h4>
                          <Badge className={sessionStatusColors[session.status]}>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(session.scheduledAt).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(session.startTime).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                              {" - "}
                              {new Date(session.endTime).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {session.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{session.location}</span>
                            </div>
                          )}
                        </div>
                        {session.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions scheduled yet</p>
                  <Button size="sm" variant="outline" className="mt-4" asChild>
                    <Link href={`/dashboard/projects/${id}/sessions/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule a Session
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Galleries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Galleries
                </CardTitle>
                <CardDescription>
                  {project.galleries?.length || 0} gallery/galleries for this project
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/galleries/new?projectId=${id}&contactId=${contact.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Gallery
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {project.galleries && project.galleries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.galleries.map((gallery) => (
                    <Link
                      key={gallery.id}
                      href={`/dashboard/galleries/${gallery.id}`}
                      className="block"
                    >
                      <div className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                        <h4 className="font-medium truncate">{gallery.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          <span>{gallery._count?.photos || 0} photos</span>
                          {gallery.isPublic && (
                            <Badge variant="outline" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                        {gallery.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {gallery.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No galleries created yet</p>
                  <Button size="sm" variant="outline" className="mt-4" asChild>
                    <Link href={`/dashboard/galleries/new?projectId=${id}&contactId=${contact.id}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Gallery
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

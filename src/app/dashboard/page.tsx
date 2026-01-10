import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ProjectStatus, LeadTemperature } from "@prisma/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Users,
  FolderKanban,
  ImageIcon,
  UserPlus,
  FolderPlus,
  ImagePlus,
  Settings,
  Building2,
  Calendar,
  ArrowRight,
  Target,
  Flame,
  AlertCircle,
} from "lucide-react"

async function getDashboardStats(userId: string) {
  const [
    contactsCount,
    organizationsCount,
    leadsCount,
    hotLeadsCount,
    overdueFollowUpsCount,
    projectsCount,
    galleriesCount,
    recentLeads,
    recentProjects,
    upcomingSessions,
  ] = await Promise.all([
    prisma.contact.count({ where: { userId } }),
    prisma.organization.count({ where: { userId } }),
    // Leads count (INQUIRY or PROPOSAL_SENT)
    prisma.project.count({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
      },
    }),
    // Hot leads count
    prisma.project.count({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
        leadTemperature: LeadTemperature.HOT,
      },
    }),
    // Overdue follow-ups count
    prisma.project.count({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
        nextFollowUpDate: { lt: new Date() },
      },
    }),
    // Projects count (BOOKED and beyond, excluding CANCELLED)
    prisma.project.count({
      where: {
        userId,
        status: {
          notIn: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT, ProjectStatus.CANCELLED],
        },
      },
    }),
    prisma.gallery.count({ where: { userId } }),
    // Recent leads with overdue follow-ups first
    prisma.project.findMany({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
      },
      include: { contact: true },
      orderBy: [
        { nextFollowUpDate: "asc" },
        { createdAt: "desc" },
      ],
      take: 5,
    }),
    prisma.project.findMany({
      where: {
        userId,
        status: {
          notIn: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT, ProjectStatus.CANCELLED],
        },
      },
      include: { contact: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.photoSession.findMany({
      where: {
        project: { userId },
        scheduledAt: { gte: new Date() },
        status: "SCHEDULED",
      },
      include: {
        project: {
          include: { contact: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ])

  // Helper to serialize Decimal values
  const serializeProject = (project: typeof recentLeads[0]) => ({
    ...project,
    budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
    budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
    totalPrice: project.totalPrice ? Number(project.totalPrice) : null,
    deposit: project.deposit ? Number(project.deposit) : null,
    paidAmount: project.paidAmount ? Number(project.paidAmount) : null,
  })

  // Serialize sessions with their projects
  const serializedSessions = upcomingSessions.map((session) => ({
    ...session,
    project: {
      ...session.project,
      budgetMin: session.project.budgetMin ? Number(session.project.budgetMin) : null,
      budgetMax: session.project.budgetMax ? Number(session.project.budgetMax) : null,
      totalPrice: session.project.totalPrice ? Number(session.project.totalPrice) : null,
      deposit: session.project.deposit ? Number(session.project.deposit) : null,
      paidAmount: session.project.paidAmount ? Number(session.project.paidAmount) : null,
    },
  }))

  return {
    contactsCount,
    organizationsCount,
    leadsCount,
    hotLeadsCount,
    overdueFollowUpsCount,
    projectsCount,
    galleriesCount,
    recentLeads: recentLeads.map(serializeProject),
    recentProjects: recentProjects.map(serializeProject),
    upcomingSessions: serializedSessions,
  }
}

const projectStatusColors: Record<string, string> = {
  INQUIRY: "bg-yellow-100 text-yellow-800",
  PROPOSAL_SENT: "bg-blue-100 text-blue-800",
  BOOKED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  POST_PRODUCTION: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-gray-100 text-gray-800",
}

export default async function DashboardPage() {
  const user = await requireAuth()

  if (!user) {
    redirect("/auth/signin")
  }

  const stats = await getDashboardStats(user.id)

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.name || user.email}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Leads Card */}
        <Card className={stats.overdueFollowUpsCount > 0 ? "border-red-300" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsCount}</div>
            <div className="flex gap-2 mt-1">
              {stats.hotLeadsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600">
                  <Flame className="h-3 w-3" />
                  {stats.hotLeadsCount} hot
                </span>
              )}
              {stats.overdueFollowUpsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  {stats.overdueFollowUpsCount} overdue
                </span>
              )}
              {stats.hotLeadsCount === 0 && stats.overdueFollowUpsCount === 0 && (
                <span className="text-xs text-muted-foreground">Active leads</span>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/dashboard/leads">
                View all
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Projects Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.projectsCount === 0 ? "No active projects" : "Active projects"}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/dashboard/projects">
                View all
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Contacts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contactsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.contactsCount === 0 ? "Add your first contact" : "Total contacts"}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/dashboard/contacts">
                View all
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Organizations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.organizationsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.organizationsCount === 0 ? "Add first organization" : "Total organizations"}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/dashboard/organizations">
                View all
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Galleries Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Galleries</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.galleriesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.galleriesCount === 0 ? "Create your first gallery" : "Total galleries"}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/dashboard/galleries">
                View all
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/dashboard/contacts/new" className="block">
              <CardHeader className="text-center pb-4">
                <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <CardTitle className="text-base">Add Contact</CardTitle>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/dashboard/projects/new" className="block">
              <CardHeader className="text-center pb-4">
                <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <CardTitle className="text-base">Create Project</CardTitle>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/dashboard/galleries/new" className="block">
              <CardHeader className="text-center pb-4">
                <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <CardTitle className="text-base">New Gallery</CardTitle>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/dashboard/settings" className="block">
              <CardHeader className="text-center pb-4">
                <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <CardTitle className="text-base">Settings</CardTitle>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recent Leads
            </CardTitle>
            <CardDescription>Your latest leads and follow-ups</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentLeads.length > 0 ? (
              <div className="space-y-4">
                {stats.recentLeads.map((lead) => {
                  const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date()
                  return (
                    <Link
                      key={lead.id}
                      href={`/dashboard/projects/${lead.id}`}
                      className={`flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors ${
                        isOverdue ? "bg-red-50" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{lead.name}</p>
                          {lead.leadTemperature === "HOT" && (
                            <Flame className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lead.contact.firstName} {lead.contact.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={projectStatusColors[lead.status] || ""}>
                          {lead.status.replace(/_/g, " ")}
                        </Badge>
                        {isOverdue && (
                          <p className="text-xs text-red-600 mt-1">Follow-up overdue</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No leads yet. Create your first lead to start tracking.
              </p>
            )}
          </CardContent>
          {stats.recentLeads.length > 0 && (
            <CardFooter>
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href="/dashboard/leads">
                  View all leads
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Active Projects
            </CardTitle>
            <CardDescription>Your booked and active projects</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentProjects.length > 0 ? (
              <div className="space-y-4">
                {stats.recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.contact.firstName} {project.contact.lastName}
                      </p>
                    </div>
                    <Badge className={projectStatusColors[project.status] || ""}>
                      {project.status.replace(/_/g, " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active projects. Convert leads to start projects.
              </p>
            )}
          </CardContent>
          {stats.recentProjects.length > 0 && (
            <CardFooter>
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href="/dashboard/projects">
                  View all projects
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>Your scheduled photo sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/projects/${session.projectId}`}
                    className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.project.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(session.scheduledAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming sessions scheduled.
              </p>
            )}
          </CardContent>
          {stats.upcomingSessions.length > 0 && (
            <CardFooter>
              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href="/dashboard/projects">
                  View all sessions
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your current account details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Name</dt>
              <dd className="text-sm">{user.name || "Not set"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">{user.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Role</dt>
              <dd className="text-sm">
                <Badge variant="secondary">{user.role}</Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
              <dd className="text-sm font-mono text-xs">{user.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ProjectStatus, LeadTemperature } from "@prisma/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Target,
  Flame,
  AlertCircle,
  Calendar,
  ArrowRight,
  FolderKanban,
  Info,
  MessageCircle,
} from "lucide-react"

async function getDashboardStats(userId: string) {
  const [
    leadsCount,
    hotLeadsCount,
    overdueFollowUpsCount,
    projectsCount,
    recentLeads,
    upcomingSessions,
  ] = await Promise.all([
    prisma.project.count({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
      },
    }),
    prisma.project.count({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
        leadTemperature: LeadTemperature.HOT,
      },
    }),
    prisma.project.count({
      where: {
        userId,
        status: { in: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT] },
        nextFollowUpDate: { lt: new Date() },
      },
    }),
    prisma.project.count({
      where: {
        userId,
        status: {
          notIn: [ProjectStatus.INQUIRY, ProjectStatus.PROPOSAL_SENT, ProjectStatus.CANCELLED],
        },
      },
    }),
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

  const serializeProject = (project: typeof recentLeads[0]) => ({
    ...project,
    budgetMin: project.budgetMin ? Number(project.budgetMin) : null,
    budgetMax: project.budgetMax ? Number(project.budgetMax) : null,
    totalPrice: project.totalPrice ? Number(project.totalPrice) : null,
    deposit: project.deposit ? Number(project.deposit) : null,
    paidAmount: project.paidAmount ? Number(project.paidAmount) : null,
  })

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
    leadsCount,
    hotLeadsCount,
    overdueFollowUpsCount,
    projectsCount,
    recentLeads: recentLeads.map(serializeProject),
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

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function DashboardPage() {
  const user = await requireAuth()

  if (!user) {
    redirect("/auth/signin")
  }

  const stats = await getDashboardStats(user.id)

  const firstName = user.name?.split(" ")[0] || user.email?.split("@")[0] || "there"

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Greeting Section */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">Photographer</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white text-sm font-medium">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
        </div>
      </div>

      {/* Stats Cards Row - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Leads */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Leads</span>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="text-4xl font-bold">{stats.leadsCount}</div>
            {(stats.hotLeadsCount > 0 || stats.overdueFollowUpsCount > 0) && (
              <div className="flex gap-3 mt-2">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unread Messages (placeholder) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Unread messages</span>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="text-4xl font-bold">0</div>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Upcoming sessions</span>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="text-4xl font-bold">{stats.upcomingSessions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two-Column Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Recent Leads / Messages */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <div className="p-5 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Recent leads</h2>
              </div>
            </div>
            <div className="px-5 pb-5">
              {stats.recentLeads.length > 0 ? (
                <div className="space-y-1">
                  {stats.recentLeads.map((lead, index) => {
                    const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date()
                    const colorClass = avatarColors[index % avatarColors.length]
                    const initials = `${lead.contact.firstName?.charAt(0) || ""}${lead.contact.lastName?.charAt(0) || ""}`.toUpperCase()
                    return (
                      <Link
                        key={lead.id}
                        href={`/dashboard/projects/${lead.id}`}
                        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                          isOverdue ? "bg-red-50/50" : ""
                        }`}
                      >
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-medium ${colorClass}`}>
                          {initials || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {lead.contact.firstName} {lead.contact.lastName}
                            </p>
                            {lead.leadTemperature === "HOT" && (
                              <Flame className="h-3 w-3 flex-shrink-0 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.name}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <Badge variant="secondary" className={`text-[10px] ${projectStatusColors[lead.status] || ""}`}>
                            {lead.status.replace(/_/g, " ")}
                          </Badge>
                          {isOverdue && (
                            <p className="text-[10px] text-red-600 mt-0.5">Overdue</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                  <Link
                    href="/dashboard/leads"
                    className="flex items-center justify-center gap-1 pt-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Show more
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No leads yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Create your first lead to start tracking.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Upcoming Sessions / Quick Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-5 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Upcoming sessions</h2>
              </div>
            </div>
            <div className="px-5 pb-5">
              {stats.upcomingSessions.length > 0 ? (
                <div className="space-y-1">
                  {stats.upcomingSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/dashboard/projects/${session.projectId}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.project.contact.firstName} {session.project.contact.lastName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-medium">
                          {new Date(session.scheduledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Schedule sessions from your projects.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Active Projects mini card */}
          <Card>
            <div className="p-5 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Active projects</h2>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="text-3xl font-bold">{stats.projectsCount}</div>
              <Link
                href="/dashboard/projects"
                className="flex items-center gap-1 mt-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View all projects
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState, useTransition, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LostReason } from "@prisma/client"
import { getLostLeads, reactivateLead } from "@/actions/leads"
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Search,
  Archive,
  RefreshCw,
  MoreHorizontal,
  DollarSign,
  Users,
  Calendar,
  Ban,
  Clock,
  UserX,
  HelpCircle,
  Briefcase,
} from "lucide-react"

// Define the lost lead item type explicitly
interface LostLeadItem {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  lostReason: LostReason | null
  lostNotes: string | null
  eventDate: Date | null
  budgetMin: number | null
  budgetMax: number | null
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  organization: {
    id: string
    name: string
  } | null
  [key: string]: unknown
}

interface LostLeadsStats {
  total: number
  byReason: Record<string, number>
}

const lostReasonLabels: Record<LostReason, { label: string; icon: React.ReactNode; color: string }> = {
  BUDGET: {
    label: "Budget",
    icon: <DollarSign className="h-3 w-3" />,
    color: "bg-yellow-100 text-yellow-800",
  },
  TIMING: {
    label: "Timing",
    icon: <Calendar className="h-3 w-3" />,
    color: "bg-orange-100 text-orange-800",
  },
  COMPETITOR: {
    label: "Competitor",
    icon: <Users className="h-3 w-3" />,
    color: "bg-red-100 text-red-800",
  },
  NO_RESPONSE: {
    label: "No Response",
    icon: <Clock className="h-3 w-3" />,
    color: "bg-gray-100 text-gray-800",
  },
  SCOPE_MISMATCH: {
    label: "Scope Mismatch",
    icon: <Ban className="h-3 w-3" />,
    color: "bg-purple-100 text-purple-800",
  },
  PERSONAL_REASONS: {
    label: "Personal",
    icon: <UserX className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-800",
  },
  OTHER: {
    label: "Other",
    icon: <HelpCircle className="h-3 w-3" />,
    color: "bg-slate-100 text-slate-800",
  },
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ReasonStatsCards({ stats }: { stats: LostLeadsStats }) {
  const topReasons = Object.entries(stats.byReason)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Archive className="h-4 w-4" />
            Total Lost
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      {topReasons.map(([reason, count]) => {
        const config = lostReasonLabels[reason as LostReason]
        return (
          <Card key={reason}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                {config.icon}
                {config.label}
              </div>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function LostLeadsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [lostLeads, setLostLeads] = useState<LostLeadItem[]>([])
  const [stats, setStats] = useState<LostLeadsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const search = searchParams.get("search") || ""
  const reasonFilter = searchParams.get("reason") as LostReason | null

  // Fetch lost leads
  useEffect(() => {
    async function fetchLostLeads() {
      setIsLoading(true)
      const result = await getLostLeads({
        search: search || undefined,
        lostReason: reasonFilter || undefined,
      })

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else if (result.lostLeads) {
        setLostLeads(result.lostLeads)
        setStats(result.stats || null)
      }
      setIsLoading(false)
    }

    fetchLostLeads()
  }, [search, reasonFilter, toast])

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newSearch = formData.get("search") as string
    const newReason = formData.get("reason") as string

    const params = new URLSearchParams()
    if (newSearch) params.set("search", newSearch)
    if (newReason && newReason !== "all") params.set("reason", newReason)

    router.push(`/dashboard/leads/lost?${params.toString()}`)
  }

  const handleReactivate = (leadId: string, leadName: string) => {
    startTransition(async () => {
      const result = await reactivateLead(leadId)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Lead Reactivated",
          description: `"${leadName}" has been restored to your leads pipeline.`,
        })
        // Remove from local state
        setLostLeads((prev) => prev.filter((l) => l.id !== leadId))
        if (stats) {
          setStats({
            ...stats,
            total: stats.total - 1,
          })
        }
      }
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lost Leads</h1>
            <p className="text-muted-foreground">
              Review and analyze leads that didn't convert
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* Stats Cards */}
          {stats && stats.total > 0 && <ReasonStatsCards stats={stats} />}

          {/* Filters */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search lost leads..."
                defaultValue={search}
                className="pl-9"
              />
            </div>
            <Select name="reason" defaultValue={reasonFilter || "all"}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                {Object.entries(lostReasonLabels).map(([value, { label, icon }]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      {icon}
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Filter</Button>
          </form>

          {/* Lost Leads Table */}
          {lostLeads.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No lost leads</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {search || reasonFilter
                    ? "No lost leads match your filter criteria."
                    : "Great news! You haven't lost any leads yet."}
                </p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/leads">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Leads
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Lost Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lostLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/dashboard/projects/${lead.id}`}
                              className="font-medium hover:underline"
                            >
                              {lead.name}
                            </Link>
                            {lead.lostNotes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {lead.lostNotes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {lead.contact?.firstName} {lead.contact?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {lead.contact?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.lostReason && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${lostReasonLabels[lead.lostReason].color}`}
                            >
                              <span className="mr-1">
                                {lostReasonLabels[lead.lostReason].icon}
                              </span>
                              {lostReasonLabels[lead.lostReason].label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(lead.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/projects/${lead.id}`}>
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReactivate(lead.id, lead.name)}
                                disabled={isPending}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reactivate Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default function LostLeadsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LostLeadsContent />
    </Suspense>
  )
}

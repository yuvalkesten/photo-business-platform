"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LeadTemperature } from "@prisma/client"
import { getLeads } from "@/actions/leads"
import { convertToBooked } from "@/actions/leads"
import { type SerializedLeadWithRelations } from "@/types/serialized"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { LeadKanban } from "@/components/features/leads/LeadKanban"
import {
  Plus,
  Target,
  Search,
  Flame,
  Thermometer,
  Snowflake,
  AlertCircle,
  Archive,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Use the serialized type for leads
type LeadItem = SerializedLeadWithRelations

interface LeadsStats {
  total: number
  inquiry: number
  proposalSent: number
  hot: number
  warm: number
  cold: number
  overdueFollowUps: number
}

function LeadsLoading() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col min-w-[300px] max-w-[400px] rounded-lg border bg-muted/30">
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
                  <Skeleton className="h-2 w-full mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatsCards({ stats, isLoading }: { stats: LeadsStats | null; isLoading: boolean }) {
  if (isLoading || !stats) {
    return (
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
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="h-4 w-4" />
            Total Leads
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.inquiry} inquiries, {stats.proposalSent} proposals
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <Flame className="h-4 w-4" />
            Hot Leads
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.hot}</div>
          <div className="text-xs text-muted-foreground mt-1">Ready to close</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
            <Thermometer className="h-4 w-4" />
            Warm Leads
          </div>
          <div className="text-2xl font-bold text-orange-600">{stats.warm}</div>
          <div className="text-xs text-muted-foreground mt-1">Engaged prospects</div>
        </CardContent>
      </Card>

      <Card className={stats.overdueFollowUps > 0 ? "border-red-300 bg-red-50/50" : ""}>
        <CardContent className="p-4">
          <div className={`flex items-center gap-2 text-sm mb-1 ${stats.overdueFollowUps > 0 ? "text-red-600" : "text-muted-foreground"}`}>
            <AlertCircle className="h-4 w-4" />
            Overdue Follow-ups
          </div>
          <div className={`text-2xl font-bold ${stats.overdueFollowUps > 0 ? "text-red-600" : ""}`}>
            {stats.overdueFollowUps}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Need attention</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [leads, setLeads] = useState<LeadItem[]>([])
  const [stats, setStats] = useState<LeadsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)
  const [convertingLeadName, setConvertingLeadName] = useState("")
  const [totalPrice, setTotalPrice] = useState("")
  const [deposit, setDeposit] = useState("")

  const search = searchParams.get("search") || ""
  const temperature = searchParams.get("temperature") as LeadTemperature | null
  const overdueOnly = searchParams.get("overdue") === "true"

  // Fetch leads
  useEffect(() => {
    async function fetchLeads() {
      setIsLoading(true)
      const result = await getLeads({
        search: search || undefined,
        temperature: temperature || undefined,
        overdueFollowUp: overdueOnly || undefined,
      })

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else if (result.leads) {
        setLeads(result.leads)
        setStats(result.stats || null)
      }
      setIsLoading(false)
    }

    fetchLeads()
  }, [search, temperature, overdueOnly, toast])

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newSearch = formData.get("search") as string
    const newTemp = formData.get("temperature") as string
    const newOverdue = formData.get("overdue") as string

    const params = new URLSearchParams()
    if (newSearch) params.set("search", newSearch)
    if (newTemp && newTemp !== "all") params.set("temperature", newTemp)
    if (newOverdue === "true") params.set("overdue", "true")

    router.push(`/dashboard/leads?${params.toString()}`)
  }

  const handleConvertToBooked = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (lead) {
      setConvertingLeadId(leadId)
      setConvertingLeadName(lead.name)
      setConvertDialogOpen(true)
    }
  }

  const handleConfirmConvert = () => {
    if (!convertingLeadId) return

    startTransition(async () => {
      const result = await convertToBooked(convertingLeadId, {
        totalPrice: totalPrice ? parseFloat(totalPrice) : undefined,
        deposit: deposit ? parseFloat(deposit) : undefined,
      })

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Lead Converted",
          description: "Lead has been successfully converted to a booked project!",
        })
        // Remove from local leads list
        setLeads((prev) => prev.filter((l) => l.id !== convertingLeadId))
        // Update stats
        if (stats) {
          setStats({
            ...stats,
            total: stats.total - 1,
            proposalSent: Math.max(0, stats.proposalSent - 1),
          })
        }
      }

      setConvertDialogOpen(false)
      setConvertingLeadId(null)
      setConvertingLeadName("")
      setTotalPrice("")
      setDeposit("")
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage your leads from inquiry to booking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/leads/lost">
              <Archive className="h-4 w-4 mr-2" />
              Lost Leads
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/projects/new?status=INQUIRY">
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search leads..."
            defaultValue={search}
            className="pl-9"
          />
        </div>
        <Select name="temperature" defaultValue={temperature || "all"}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Temps</SelectItem>
            <SelectItem value="HOT">
              <div className="flex items-center gap-2">
                <Flame className="h-3 w-3 text-red-500" />
                Hot
              </div>
            </SelectItem>
            <SelectItem value="WARM">
              <div className="flex items-center gap-2">
                <Thermometer className="h-3 w-3 text-orange-500" />
                Warm
              </div>
            </SelectItem>
            <SelectItem value="COLD">
              <div className="flex items-center gap-2">
                <Snowflake className="h-3 w-3 text-blue-500" />
                Cold
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select name="overdue" defaultValue={overdueOnly ? "true" : "false"}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Follow-up status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">All Leads</SelectItem>
            <SelectItem value="true">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-red-500" />
                Overdue Only
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

      {/* Kanban Board */}
      {isLoading ? (
        <LeadsLoading />
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || temperature || overdueOnly
                ? "No leads match your filter criteria."
                : "Get started by creating your first lead."}
            </p>
            <Button asChild>
              <Link href="/dashboard/projects/new?status=INQUIRY">
                <Plus className="h-4 w-4 mr-2" />
                Create Lead
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <LeadKanban leads={leads} onConvertToBooked={handleConvertToBooked} />
      )}

      {/* Convert to Booked Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Booked Project</DialogTitle>
            <DialogDescription>
              You're about to convert "{convertingLeadName}" into a booked project.
              Optionally, set the final price and deposit amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="totalPrice">Total Price (optional)</Label>
              <Input
                id="totalPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 2500"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit Amount (optional)</Label>
              <Input
                id="deposit"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 500"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmConvert} disabled={isPending}>
              {isPending ? "Converting..." : "Convert to Booked"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

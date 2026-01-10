import { Suspense } from "react"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { getOrganizations } from "@/actions/organizations"
import { OrgType } from "@prisma/client"
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
import { Plus, Building2, Search, Users, FolderKanban, Mail, Phone, Globe, ExternalLink } from "lucide-react"

interface OrganizationsPageProps {
  searchParams: Promise<{
    type?: OrgType
    search?: string
    page?: string
  }>
}

const orgTypeLabels: Record<OrgType, string> = {
  COMPANY: "Company",
  NGO: "NGO",
  VENUE: "Venue",
  VENDOR: "Vendor",
  AGENCY: "Agency",
  OTHER: "Other",
}

const orgTypeColors: Record<OrgType, string> = {
  COMPANY: "bg-blue-100 text-blue-800",
  NGO: "bg-green-100 text-green-800",
  VENUE: "bg-purple-100 text-purple-800",
  VENDOR: "bg-orange-100 text-orange-800",
  AGENCY: "bg-pink-100 text-pink-800",
  OTHER: "bg-gray-100 text-gray-800",
}

function OrganizationsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function OrganizationsList({
  type,
  search,
  page,
}: {
  type?: OrgType
  search?: string
  page: number
}) {
  const result = await getOrganizations({ type, search, page, limit: 50 })

  if (result.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    )
  }

  const { organizations, pagination } = result

  if (!organizations || organizations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No organizations found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {search
              ? "No organizations match your search criteria."
              : "Get started by adding your first organization."}
          </p>
          <Button asChild>
            <Link href="/dashboard/organizations/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((org) => (
          <Link key={org.id} href={`/dashboard/organizations/${org.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{org.name}</CardTitle>
                    {org.type && (
                      <Badge variant="secondary" className={`mt-1 ${orgTypeColors[org.type]}`}>
                        {orgTypeLabels[org.type]}
                      </Badge>
                    )}
                  </div>
                  <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {org.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{org.email}</span>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{org.phone}</span>
                  </div>
                )}
                {org.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span className="truncate">{org.website}</span>
                  </div>
                )}
                {org._count && (
                  <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{org._count.contacts} contacts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span>{org._count.projects} projects</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={`/dashboard/organizations?page=${pageNum}${type ? `&type=${type}` : ""}${search ? `&search=${search}` : ""}`}
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
    </>
  )
}

export default async function OrganizationsPage({ searchParams }: OrganizationsPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const params = await searchParams
  const type = params.type
  const search = params.search
  const page = parseInt(params.page || "1")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Companies, NGOs, venues, and vendors you work with
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/organizations/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search organizations..."
                defaultValue={search}
                className="pl-9"
              />
            </div>
            <Select name="type" defaultValue={type || "all"}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(orgTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Organizations Grid */}
      <Suspense fallback={<OrganizationsLoading />}>
        <OrganizationsList type={type} search={search} page={page} />
      </Suspense>
    </div>
  )
}

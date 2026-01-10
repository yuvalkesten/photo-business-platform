import { Suspense } from "react"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { getContacts } from "@/actions/contacts"
import { ContactType, ContactStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ContactCard } from "@/components/features/contacts/ContactCard"
import { Plus, Users, Search } from "lucide-react"

interface ContactsPageProps {
  searchParams: Promise<{
    type?: ContactType
    status?: ContactStatus
    search?: string
    page?: string
  }>
}

const contactTypeLabels: Record<ContactType, string> = {
  LEAD: "Leads",
  CLIENT: "Clients",
  PAST_CLIENT: "Past Clients",
  COLLABORATOR: "Collaborators",
  SUPPLIER: "Suppliers",
  REFERRAL_SOURCE: "Referral Sources",
}

const contactStatusLabels: Record<ContactStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
}

function ContactsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function ContactsList({
  type,
  status,
  search,
  page,
}: {
  type?: ContactType
  status?: ContactStatus
  search?: string
  page: number
}) {
  const result = await getContacts({ type, status, search, page, limit: 50 })

  if (result.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    )
  }

  const { contacts, pagination } = result

  if (!contacts || contacts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {search
              ? "No contacts match your search criteria."
              : "Get started by adding your first contact."}
          </p>
          <Button asChild>
            <Link href="/dashboard/contacts/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={`/dashboard/contacts?page=${pageNum}${type ? `&type=${type}` : ""}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
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

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const params = await searchParams
  const type = params.type
  const status = params.status
  const search = params.search
  const page = parseInt(params.page || "1")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your clients, leads, and business contacts
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contacts/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
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
                placeholder="Search contacts..."
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
                {Object.entries(contactTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="status" defaultValue={status || "all"}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(contactStatusLabels).map(([value, label]) => (
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

      {/* Contacts Grid */}
      <Suspense fallback={<ContactsLoading />}>
        <ContactsList type={type} status={status} search={search} page={page} />
      </Suspense>
    </div>
  )
}

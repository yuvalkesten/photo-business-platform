import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getOrganization } from "@/actions/organizations"
import { deleteOrganization } from "@/actions/organizations/delete-organization"
import { OrgType, ContactType, ProjectStatus } from "@prisma/client"
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
  MapPin,
  Globe,
  Building2,
  Users,
  FolderKanban,
  ExternalLink,
} from "lucide-react"

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>
}

const orgTypeLabels: Record<OrgType, string> = {
  COMPANY: "Company",
  NGO: "NGO / Non-Profit",
  VENUE: "Venue",
  VENDOR: "Vendor",
  AGENCY: "Agency",
  OTHER: "Other",
}

const contactTypeLabels: Record<ContactType, string> = {
  LEAD: "Lead",
  CLIENT: "Client",
  PAST_CLIENT: "Past Client",
  COLLABORATOR: "Collaborator",
  SUPPLIER: "Supplier",
  REFERRAL_SOURCE: "Referral",
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

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getOrganization(id)

  if (result.error || !result.organization) {
    notFound()
  }

  const { organization } = result

  async function handleDelete() {
    "use server"
    const result = await deleteOrganization(id)
    if (!result.error) {
      redirect("/dashboard/organizations")
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/organizations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
              {organization.type && (
                <Badge variant="secondary" className="mt-1">
                  {orgTypeLabels[organization.type]}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/organizations/${id}/edit`}>
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
        {/* Organization Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${organization.email}`} className="text-sm hover:underline">
                    {organization.email}
                  </a>
                </div>
              )}
              {organization.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${organization.phone}`} className="text-sm hover:underline">
                    {organization.phone}
                  </a>
                </div>
              )}
              {organization.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    {organization.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {(organization.address || organization.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {organization.address && <p>{organization.address}</p>}
                    {organization.city && (
                      <p>
                        {organization.city}
                        {organization.state && `, ${organization.state}`}
                        {organization.zipCode && ` ${organization.zipCode}`}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!organization.email && !organization.phone && !organization.website && !organization.address && (
                <p className="text-sm text-muted-foreground">No contact information added</p>
              )}
            </CardContent>
          </Card>

          {organization.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{organization.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contacts & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contacts
                </CardTitle>
                <CardDescription>
                  {organization.contacts?.length || 0} contact(s) at this organization
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/contacts/new?organizationId=${organization.id}`}>
                  Add Contact
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {organization.contacts && organization.contacts.length > 0 ? (
                <div className="space-y-3">
                  {organization.contacts.map((contact) => {
                    const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase()
                    return (
                      <Link
                        key={contact.id}
                        href={`/dashboard/contacts/${contact.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {contact.firstName} {contact.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.jobTitle || contact.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {contactTypeLabels[contact.type]}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No contacts yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Projects
                </CardTitle>
                <CardDescription>
                  {organization.projects?.length || 0} project(s) with this organization
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {organization.projects && organization.projects.length > 0 ? (
                <div className="space-y-3">
                  {organization.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.projectType} • {project.contact.firstName} {project.contact.lastName}
                          </p>
                        </div>
                        <Badge className={projectStatusColors[project.status]}>
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No projects yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

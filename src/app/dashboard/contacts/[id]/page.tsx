import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getContact } from "@/actions/contacts"
import { deleteContact } from "@/actions/contacts/delete-contact"
import { ContactType, ContactStatus, ProjectStatus } from "@prisma/client"
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
  FolderKanban,
  ImageIcon,
  Calendar,
  ExternalLink,
  Instagram,
  MessageCircle,
} from "lucide-react"

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

const contactTypeLabels: Record<ContactType, string> = {
  LEAD: "Lead",
  CLIENT: "Client",
  PAST_CLIENT: "Past Client",
  COLLABORATOR: "Collaborator",
  SUPPLIER: "Supplier",
  REFERRAL_SOURCE: "Referral Source",
}

const contactTypeColors: Record<ContactType, string> = {
  LEAD: "bg-yellow-100 text-yellow-800",
  CLIENT: "bg-green-100 text-green-800",
  PAST_CLIENT: "bg-gray-100 text-gray-800",
  COLLABORATOR: "bg-blue-100 text-blue-800",
  SUPPLIER: "bg-purple-100 text-purple-800",
  REFERRAL_SOURCE: "bg-orange-100 text-orange-800",
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

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getContact(id)

  if (result.error || !result.contact) {
    notFound()
  }

  const { contact } = result
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase()

  async function handleDelete() {
    "use server"
    const result = await deleteContact(id)
    if (!result.error) {
      redirect("/dashboard/contacts")
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {contact.firstName} {contact.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={contactTypeColors[contact.type]}>
                  {contactTypeLabels[contact.type]}
                </Badge>
                <Badge variant={contact.status === "ACTIVE" ? "default" : "secondary"}>
                  {contact.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/contacts/${id}/edit`}>
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
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                  {contact.email}
                </a>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.instagramHandle && (
                <div className="flex items-center gap-3">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`https://instagram.com/${contact.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    @{contact.instagramHandle}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {contact.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    {contact.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {(contact.address || contact.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {contact.address && <p>{contact.address}</p>}
                    {contact.city && (
                      <p>
                        {contact.city}
                        {contact.state && `, ${contact.state}`}
                        {contact.zipCode && ` ${contact.zipCode}`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization */}
          {contact.organization && (
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{contact.organization.name}</p>
                    {contact.jobTitle && (
                      <p className="text-sm text-muted-foreground">{contact.jobTitle}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.source && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Source</p>
                  <p className="text-sm">{contact.source}</p>
                </div>
              )}
              {contact.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
              {contact.tags && contact.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instagram Messages */}
          {contact.instagramHandle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Instagram Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/messages?handle=${contact.instagramHandle}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Instagram className="h-4 w-4" />
                  View messages from @{contact.instagramHandle}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Projects & Galleries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Projects
                </CardTitle>
                <CardDescription>
                  {contact.projects?.length || 0} project(s) with this contact
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/projects/new?contactId=${contact.id}`}>
                  New Project
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {contact.projects && contact.projects.length > 0 ? (
                <div className="space-y-3">
                  {contact.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.projectType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={projectStatusColors[project.status]}>
                            {project.status.replace("_", " ")}
                          </Badge>
                          {project.sessions && project.sessions[0] && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.sessions[0].scheduledAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
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

          {/* Galleries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Galleries
                </CardTitle>
                <CardDescription>
                  {contact.galleries?.length || 0} gallery/galleries shared with this contact
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {contact.galleries && contact.galleries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contact.galleries.map((gallery) => (
                    <Link
                      key={gallery.id}
                      href={`/dashboard/galleries/${gallery.id}`}
                      className="block"
                    >
                      <div className="p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <p className="font-medium truncate">{gallery.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          <span>{gallery._count?.photos || 0} photos</span>
                          {gallery.isPublic && (
                            <Badge variant="outline" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No galleries yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

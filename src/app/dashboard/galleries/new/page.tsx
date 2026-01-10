import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getProjects } from "@/actions/projects"
import { getContacts } from "@/actions/contacts"
import { GalleryForm } from "@/components/features/galleries/GalleryForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface NewGalleryPageProps {
  searchParams: Promise<{
    projectId?: string
    contactId?: string
  }>
}

export default async function NewGalleryPage({ searchParams }: NewGalleryPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const params = await searchParams

  // Fetch projects and contacts for the form
  const [projectsResult, contactsResult] = await Promise.all([
    getProjects({ limit: 100 }),
    getContacts({ limit: 100 }),
  ])

  const projects = projectsResult.projects || []
  const contacts = contactsResult.contacts || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/galleries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Gallery</h1>
          <p className="text-muted-foreground">
            Create a new photo gallery for your clients
          </p>
        </div>
      </div>

      {/* Form */}
      <GalleryForm
        projects={projects}
        contacts={contacts}
        defaultProjectId={params.projectId}
        defaultContactId={params.contactId}
      />
    </div>
  )
}

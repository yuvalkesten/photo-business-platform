import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getGallery } from "@/actions/galleries"
import { getProjects } from "@/actions/projects"
import { getContacts } from "@/actions/contacts"
import { GalleryForm } from "@/components/features/galleries/GalleryForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface EditGalleryPageProps {
  params: Promise<{ id: string }>
}

export default async function EditGalleryPage({ params }: EditGalleryPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params

  // Fetch gallery, projects, and contacts in parallel
  const [galleryResult, projectsResult, contactsResult] = await Promise.all([
    getGallery(id),
    getProjects({ limit: 100 }),
    getContacts({ limit: 100 }),
  ])

  if (galleryResult.error || !galleryResult.gallery) {
    notFound()
  }

  const { gallery } = galleryResult
  const projects = projectsResult.projects || []
  const contacts = contactsResult.contacts || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/galleries/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Gallery</h1>
          <p className="text-muted-foreground">
            Update gallery settings for {gallery.title}
          </p>
        </div>
      </div>

      {/* Form */}
      <GalleryForm
        gallery={gallery}
        projects={projects}
        contacts={contacts}
      />
    </div>
  )
}

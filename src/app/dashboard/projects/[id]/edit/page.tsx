import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getProject } from "@/actions/projects"
import { getContacts } from "@/actions/contacts"
import { getOrganizations } from "@/actions/organizations"
import { ProjectForm } from "@/components/features/projects/ProjectForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface EditProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const [projectResult, contactsResult, orgsResult] = await Promise.all([
    getProject(id),
    getContacts({ limit: 500 }),
    getOrganizations({ limit: 500 }),
  ])

  if (projectResult.error || !projectResult.project) {
    notFound()
  }

  const contacts = contactsResult.contacts || []
  const organizations = orgsResult.organizations || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-muted-foreground">
            Update {projectResult.project.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <ProjectForm
        project={projectResult.project}
        contacts={contacts}
        organizations={organizations}
      />
    </div>
  )
}

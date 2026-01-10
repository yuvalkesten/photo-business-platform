import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getContacts } from "@/actions/contacts"
import { getOrganizations } from "@/actions/organizations"
import { ProjectForm } from "@/components/features/projects/ProjectForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface NewProjectPageProps {
  searchParams: Promise<{
    contactId?: string
  }>
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const params = await searchParams
  const defaultContactId = params.contactId

  const [contactsResult, orgsResult] = await Promise.all([
    getContacts({ limit: 500 }),
    getOrganizations({ limit: 500 }),
  ])

  const contacts = contactsResult.contacts || []
  const organizations = orgsResult.organizations || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
          <p className="text-muted-foreground">
            Create a new photography project
          </p>
        </div>
      </div>

      {/* Form */}
      <ProjectForm
        contacts={contacts}
        organizations={organizations}
        defaultContactId={defaultContactId}
      />
    </div>
  )
}

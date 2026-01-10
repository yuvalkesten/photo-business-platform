import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getOrganization } from "@/actions/organizations"
import { OrganizationForm } from "@/components/features/organizations/OrganizationForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface EditOrganizationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditOrganizationPage({ params }: EditOrganizationPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getOrganization(id)

  if (result.error || !result.organization) {
    notFound()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/organizations/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Organization</h1>
          <p className="text-muted-foreground">
            Update {result.organization.name}&apos;s information
          </p>
        </div>
      </div>

      {/* Form */}
      <OrganizationForm organization={result.organization} />
    </div>
  )
}

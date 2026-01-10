import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { OrganizationForm } from "@/components/features/organizations/OrganizationForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function NewOrganizationPage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/organizations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Organization</h1>
          <p className="text-muted-foreground">
            Add a new company, NGO, or venue to your network
          </p>
        </div>
      </div>

      {/* Form */}
      <OrganizationForm />
    </div>
  )
}

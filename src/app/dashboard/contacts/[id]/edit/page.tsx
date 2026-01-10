import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getContact } from "@/actions/contacts"
import { getOrganizations } from "@/actions/organizations"
import { ContactForm } from "@/components/features/contacts/ContactForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface EditContactPageProps {
  params: Promise<{ id: string }>
}

export default async function EditContactPage({ params }: EditContactPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const [contactResult, orgResult] = await Promise.all([
    getContact(id),
    getOrganizations(),
  ])

  if (contactResult.error || !contactResult.contact) {
    notFound()
  }

  const organizations = orgResult.organizations || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/contacts/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Contact</h1>
          <p className="text-muted-foreground">
            Update {contactResult.contact.firstName} {contactResult.contact.lastName}&apos;s information
          </p>
        </div>
      </div>

      {/* Form */}
      <ContactForm contact={contactResult.contact} organizations={organizations} />
    </div>
  )
}

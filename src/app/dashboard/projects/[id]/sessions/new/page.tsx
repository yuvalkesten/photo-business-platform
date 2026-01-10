import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getProject } from "@/actions/projects"
import { SessionForm } from "@/components/features/sessions/SessionForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface NewSessionPageProps {
  params: Promise<{ id: string }>
}

export default async function NewSessionPage({ params }: NewSessionPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getProject(id)

  if (result.error || !result.project) {
    notFound()
  }

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
          <h1 className="text-2xl font-bold tracking-tight">New Session</h1>
          <p className="text-muted-foreground">
            Schedule a photo session for {result.project.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <SessionForm projectId={id} projectName={result.project.name} />
    </div>
  )
}

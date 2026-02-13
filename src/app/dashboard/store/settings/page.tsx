import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { StoreSettings } from "@/components/features/store/StoreSettings"

export default async function StoreSettingsPage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { storeEnabled: true, defaultMarkupPercent: true },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/store">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Settings</h1>
          <p className="text-muted-foreground">
            Configure your print store preferences
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <StoreSettings
          storeEnabled={fullUser?.storeEnabled ?? false}
          defaultMarkupPercent={fullUser?.defaultMarkupPercent ?? 50}
        />
      </div>
    </div>
  )
}

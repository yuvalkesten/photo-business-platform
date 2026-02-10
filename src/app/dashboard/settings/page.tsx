import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { WatermarkSettings } from "@/components/features/galleries/WatermarkSettings"

export default async function SettingsPage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and gallery settings</p>
      </div>

      <WatermarkSettings />
    </div>
  )
}

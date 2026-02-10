import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { WatermarkSettings } from "@/components/features/galleries/WatermarkSettings"
import { BrandingSettings } from "@/components/features/settings/BrandingSettings"

export default async function SettingsPage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      brandLogo: true,
      brandFavicon: true,
      brandPrimaryColor: true,
      brandAccentColor: true,
    },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and gallery settings</p>
      </div>

      <BrandingSettings
        currentLogo={userData?.brandLogo ?? null}
        currentFavicon={userData?.brandFavicon ?? null}
        currentPrimaryColor={userData?.brandPrimaryColor ?? "#000000"}
        currentAccentColor={userData?.brandAccentColor ?? "#8b5cf6"}
      />

      <WatermarkSettings />
    </div>
  )
}

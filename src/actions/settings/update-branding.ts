"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

interface UpdateBrandingData {
  brandLogo: string | null
  brandFavicon: string | null
  brandPrimaryColor: string
  brandAccentColor: string
}

export async function updateBranding(data: UpdateBrandingData) {
  try {
    const user = await requireAuth()
    if (!user) return { error: "Unauthorized" }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        brandLogo: data.brandLogo,
        brandFavicon: data.brandFavicon,
        brandPrimaryColor: data.brandPrimaryColor,
        brandAccentColor: data.brandAccentColor,
      },
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error) {
    console.error("Error updating branding:", error)
    return { error: "Failed to update branding" }
  }
}

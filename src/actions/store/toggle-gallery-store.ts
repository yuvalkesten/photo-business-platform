"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function toggleGalleryStore(
  galleryId: string,
  data: { storeEnabled: boolean; priceSheetId?: string | null }
) {
  try {
    const user = await requireAuth()

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, userId: user.id },
    })
    if (!gallery) return { error: "Gallery not found" }

    // If enabling store, verify price sheet belongs to user
    if (data.storeEnabled && data.priceSheetId) {
      const priceSheet = await prisma.priceSheet.findFirst({
        where: { id: data.priceSheetId, userId: user.id, isActive: true },
      })
      if (!priceSheet) return { error: "Price sheet not found" }
    }

    await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        storeEnabled: data.storeEnabled,
        priceSheetId: data.storeEnabled ? (data.priceSheetId ?? null) : null,
      },
    })

    revalidatePath(`/dashboard/galleries/${galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error toggling gallery store:", error)
    return { error: "Failed to update gallery store settings" }
  }
}

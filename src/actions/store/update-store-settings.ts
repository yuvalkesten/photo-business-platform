"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { storeSettingsSchema } from "@/lib/validations/store.schema"

export async function updateStoreSettings(data: unknown) {
  try {
    const user = await requireAuth()
    const validated = storeSettingsSchema.parse(data)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        storeEnabled: validated.storeEnabled,
        defaultMarkupPercent: validated.defaultMarkupPercent,
      },
    })

    revalidatePath("/dashboard/store")
    revalidatePath("/dashboard/store/settings")
    return { success: true }
  } catch (error) {
    console.error("Error updating store settings:", error)
    return { error: "Failed to update store settings" }
  }
}

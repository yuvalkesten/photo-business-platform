"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { priceSheetSchema } from "@/lib/validations/store.schema"

export async function createPriceSheet(data: unknown) {
  try {
    const user = await requireAuth()
    const validated = priceSheetSchema.parse(data)

    // If this is set as default, unset other defaults
    if (validated.isDefault) {
      await prisma.priceSheet.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const priceSheet = await prisma.priceSheet.create({
      data: {
        userId: user.id,
        name: validated.name,
        isDefault: validated.isDefault ?? false,
        isActive: validated.isActive ?? true,
      },
    })

    revalidatePath("/dashboard/store/price-sheets")
    return { success: true, priceSheet }
  } catch (error) {
    console.error("Error creating price sheet:", error)
    return { error: "Failed to create price sheet" }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { storeSettingsSchema } from "@/lib/validations/store.schema"
import type { Prisma } from "@prisma/client"

// Popular products to seed in a default price sheet
const DEFAULT_PRODUCTS = [
  { sku: "GLOBAL-PHO-4x6-PRO", name: "Photo Print 4x6\"", size: "4x6\"", category: "PRINT" as const, cost: 0.85 },
  { sku: "GLOBAL-PHO-5x7-PRO", name: "Photo Print 5x7\"", size: "5x7\"", category: "PRINT" as const, cost: 1.25 },
  { sku: "GLOBAL-PHO-8x10-PRO", name: "Photo Print 8x10\"", size: "8x10\"", category: "PRINT" as const, cost: 2.50 },
  { sku: "GLOBAL-PHO-8x12-PRO", name: "Photo Print 8x12\"", size: "8x12\"", category: "PRINT" as const, cost: 3.00 },
  { sku: "GLOBAL-PHO-16x20-PRO", name: "Photo Print 16x20\"", size: "16x20\"", category: "PRINT" as const, cost: 8.50 },
  { sku: "GLOBAL-CAN-12x16", name: "Canvas Print 12x16\"", size: "12x16\"", category: "CANVAS" as const, cost: 18.00 },
  { sku: "GLOBAL-CAN-16x20", name: "Canvas Print 16x20\"", size: "16x20\"", category: "CANVAS" as const, cost: 24.00 },
  { sku: "GLOBAL-CAN-24x36", name: "Canvas Print 24x36\"", size: "24x36\"", category: "CANVAS" as const, cost: 48.00 },
  { sku: "GLOBAL-CFP-8X10", name: "Framed Print 8x10\"", size: "8x10\"", category: "FRAMED_PRINT" as const, cost: 35.00 },
  { sku: "GLOBAL-CFP-16X20", name: "Framed Print 16x20\"", size: "16x20\"", category: "FRAMED_PRINT" as const, cost: 50.00 },
]

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

    // When store is enabled, auto-create a default price sheet if none exist
    // and assign it to all galleries that don't have one
    if (validated.storeEnabled) {
      const existingSheets = await prisma.priceSheet.count({
        where: { userId: user.id },
      })

      if (existingSheets === 0) {
        const markup = validated.defaultMarkupPercent / 100

        const priceSheet = await prisma.priceSheet.create({
          data: {
            userId: user.id,
            name: "Default Price Sheet",
            isDefault: true,
            isActive: true,
            items: {
              create: DEFAULT_PRODUCTS.map((p) => ({
                prodigiSku: p.sku,
                productCategory: p.category,
                productName: p.name,
                sizeLabel: p.size,
                prodigiCost: p.cost as unknown as Prisma.Decimal,
                retailPrice: Number((p.cost * (1 + markup)).toFixed(2)) as unknown as Prisma.Decimal,
                currency: "USD",
              })),
            },
          },
        })

        // Enable store on all user's galleries and assign the default price sheet
        await prisma.gallery.updateMany({
          where: { userId: user.id, storeEnabled: false },
          data: {
            storeEnabled: true,
            priceSheetId: priceSheet.id,
          },
        })
      }
    }

    revalidatePath("/dashboard/store")
    revalidatePath("/dashboard/store/settings")
    revalidatePath("/dashboard/galleries")
    return { success: true }
  } catch (error) {
    console.error("Error updating store settings:", error)
    return { error: "Failed to update store settings" }
  }
}

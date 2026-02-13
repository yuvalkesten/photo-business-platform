"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { priceSheetSchema, priceSheetItemSchema } from "@/lib/validations/store.schema"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

export async function updatePriceSheet(id: string, data: unknown) {
  try {
    const user = await requireAuth()
    const validated = priceSheetSchema.parse(data)

    const existing = await prisma.priceSheet.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return { error: "Price sheet not found" }

    if (validated.isDefault) {
      await prisma.priceSheet.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const priceSheet = await prisma.priceSheet.update({
      where: { id },
      data: {
        name: validated.name,
        isDefault: validated.isDefault ?? existing.isDefault,
        isActive: validated.isActive ?? existing.isActive,
      },
    })

    revalidatePath("/dashboard/store/price-sheets")
    revalidatePath(`/dashboard/store/price-sheets/${id}`)
    return { success: true, priceSheet }
  } catch (error) {
    console.error("Error updating price sheet:", error)
    return { error: "Failed to update price sheet" }
  }
}

export async function addPriceSheetItem(priceSheetId: string, data: unknown) {
  try {
    const user = await requireAuth()
    const validated = priceSheetItemSchema.parse(data)

    const priceSheet = await prisma.priceSheet.findFirst({
      where: { id: priceSheetId, userId: user.id },
    })
    if (!priceSheet) return { error: "Price sheet not found" }

    const item = await prisma.priceSheetItem.create({
      data: {
        priceSheetId,
        prodigiSku: validated.prodigiSku,
        productCategory: validated.productCategory,
        productName: validated.productName,
        sizeLabel: validated.sizeLabel,
        prodigiCost: validated.prodigiCost as unknown as Prisma.Decimal,
        retailPrice: validated.retailPrice as unknown as Prisma.Decimal,
        currency: validated.currency,
      },
    })

    revalidatePath(`/dashboard/store/price-sheets/${priceSheetId}`)
    return { success: true, item }
  } catch (error) {
    console.error("Error adding price sheet item:", error)
    return { error: "Failed to add item" }
  }
}

export async function updatePriceSheetItem(
  itemId: string,
  data: { retailPrice: number }
) {
  try {
    const user = await requireAuth()
    const validated = z.object({ retailPrice: z.number().min(0.01) }).parse(data)

    const item = await prisma.priceSheetItem.findFirst({
      where: { id: itemId },
      include: { priceSheet: { select: { userId: true, id: true } } },
    })
    if (!item || item.priceSheet.userId !== user.id) {
      return { error: "Item not found" }
    }

    await prisma.priceSheetItem.update({
      where: { id: itemId },
      data: { retailPrice: validated.retailPrice as unknown as Prisma.Decimal },
    })

    revalidatePath(`/dashboard/store/price-sheets/${item.priceSheet.id}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating price sheet item:", error)
    return { error: "Failed to update item" }
  }
}

export async function removePriceSheetItem(itemId: string) {
  try {
    const user = await requireAuth()

    const item = await prisma.priceSheetItem.findFirst({
      where: { id: itemId },
      include: { priceSheet: { select: { userId: true, id: true } } },
    })
    if (!item || item.priceSheet.userId !== user.id) {
      return { error: "Item not found" }
    }

    await prisma.priceSheetItem.delete({ where: { id: itemId } })

    revalidatePath(`/dashboard/store/price-sheets/${item.priceSheet.id}`)
    return { success: true }
  } catch (error) {
    console.error("Error removing price sheet item:", error)
    return { error: "Failed to remove item" }
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function deletePriceSheet(id: string) {
  try {
    const user = await requireAuth()

    const priceSheet = await prisma.priceSheet.findFirst({
      where: { id, userId: user.id },
      include: { _count: { select: { galleries: true } } },
    })

    if (!priceSheet) {
      return { error: "Price sheet not found" }
    }

    if (priceSheet._count.galleries > 0) {
      return { error: "Cannot delete price sheet that is assigned to galleries" }
    }

    await prisma.priceSheet.delete({ where: { id } })

    revalidatePath("/dashboard/store/price-sheets")
    return { success: true }
  } catch (error) {
    console.error("Error deleting price sheet:", error)
    return { error: "Failed to delete price sheet" }
  }
}

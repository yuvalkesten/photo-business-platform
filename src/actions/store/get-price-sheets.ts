"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getPriceSheets() {
  try {
    const user = await requireAuth()

    const priceSheets = await prisma.priceSheet.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { items: true, galleries: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, priceSheets }
  } catch (error) {
    console.error("Error fetching price sheets:", error)
    return { error: "Failed to fetch price sheets" }
  }
}

export async function getPriceSheet(id: string) {
  try {
    const user = await requireAuth()

    const priceSheet = await prisma.priceSheet.findFirst({
      where: { id, userId: user.id },
      include: {
        items: { orderBy: { productCategory: "asc" } },
        _count: { select: { galleries: true } },
      },
    })

    if (!priceSheet) {
      return { error: "Price sheet not found" }
    }

    return { success: true, priceSheet }
  } catch (error) {
    console.error("Error fetching price sheet:", error)
    return { error: "Failed to fetch price sheet" }
  }
}

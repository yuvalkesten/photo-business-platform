"use server"

import { prisma } from "@/lib/db"

export async function getStoreProducts(galleryId: string) {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: {
        storeEnabled: true,
        priceSheetId: true,
        priceSheet: {
          select: {
            id: true,
            isActive: true,
            items: {
              orderBy: [
                { productCategory: "asc" },
                { retailPrice: "asc" },
              ],
              select: {
                id: true,
                prodigiSku: true,
                productCategory: true,
                productName: true,
                sizeLabel: true,
                retailPrice: true,
                currency: true,
              },
            },
          },
        },
      },
    })

    if (!gallery?.storeEnabled || !gallery.priceSheet?.isActive) {
      return { success: true, products: [] }
    }

    // Serialize Decimal fields for client
    const products = gallery.priceSheet.items.map((item) => ({
      ...item,
      retailPrice: Number(item.retailPrice),
    }))

    return { success: true, products }
  } catch (error) {
    console.error("Error fetching store products:", error)
    return { error: "Failed to fetch store products" }
  }
}

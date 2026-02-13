"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getStoreOrder(orderId: string) {
  try {
    const user = await requireAuth()

    const order = await prisma.storeOrder.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        items: {
          include: {
            photo: {
              select: {
                id: true,
                filename: true,
                thumbnailUrl: true,
                s3Url: true,
              },
            },
          },
        },
        gallery: { select: { id: true, title: true, shareToken: true } },
      },
    })

    if (!order) {
      return { error: "Order not found" }
    }

    return {
      success: true,
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        prodigiCostTotal: Number(order.prodigiCostTotal),
        photographerProfit: Number(order.photographerProfit),
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          prodigiUnitCost: Number(item.prodigiUnitCost),
          lineTotal: Number(item.lineTotal),
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching store order:", error)
    return { error: "Failed to fetch order" }
  }
}

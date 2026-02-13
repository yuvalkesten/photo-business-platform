"use server"

import { prisma } from "@/lib/db"

export async function getOrderStatus(orderNumber: string, email: string) {
  try {
    const order = await prisma.storeOrder.findFirst({
      where: {
        orderNumber,
        customerEmail: email.toLowerCase().trim(),
      },
      select: {
        orderNumber: true,
        status: true,
        customerName: true,
        totalAmount: true,
        trackingNumber: true,
        trackingUrl: true,
        createdAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        items: {
          select: {
            productName: true,
            sizeLabel: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    })

    if (!order) {
      return { error: "Order not found. Please check your order number and email." }
    }

    return {
      success: true,
      order: {
        ...order,
        totalAmount: Number(order.totalAmount),
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching order status:", error)
    return { error: "Failed to fetch order status" }
  }
}

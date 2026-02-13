"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import type { StoreOrderStatus } from "@prisma/client"

interface GetStoreOrdersParams {
  status?: StoreOrderStatus
  page?: number
  limit?: number
}

export async function getStoreOrders(params: GetStoreOrdersParams = {}) {
  try {
    const user = await requireAuth()
    const { status, page = 1, limit = 20 } = params

    const where = {
      userId: user.id,
      ...(status ? { status } : {}),
    }

    const [orders, total] = await Promise.all([
      prisma.storeOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          totalAmount: true,
          photographerProfit: true,
          status: true,
          createdAt: true,
          paidAt: true,
          shippedAt: true,
          gallery: { select: { title: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.storeOrder.count({ where }),
    ])

    return {
      success: true,
      orders: orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        photographerProfit: Number(o.photographerProfit),
      })),
      total,
      pages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error("Error fetching store orders:", error)
    return { error: "Failed to fetch orders" }
  }
}

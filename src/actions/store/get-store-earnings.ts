"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getStoreEarnings() {
  try {
    const user = await requireAuth()

    const paidStatuses = ["PAID", "PROCESSING", "PRINTED", "SHIPPED", "DELIVERED"]

    const orders = await prisma.storeOrder.findMany({
      where: {
        userId: user.id,
        status: { in: paidStatuses as never[] },
      },
      select: {
        totalAmount: true,
        prodigiCostTotal: true,
        photographerProfit: true,
        paidAt: true,
      },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const totalCost = orders.reduce((sum, o) => sum + Number(o.prodigiCostTotal), 0)
    const totalProfit = orders.reduce((sum, o) => sum + Number(o.photographerProfit), 0)
    const orderCount = orders.length

    // This month's earnings
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthOrders = orders.filter(
      (o) => o.paidAt && new Date(o.paidAt) >= startOfMonth
    )
    const monthlyRevenue = thisMonthOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0
    )
    const monthlyProfit = thisMonthOrders.reduce(
      (sum, o) => sum + Number(o.photographerProfit),
      0
    )

    return {
      success: true,
      earnings: {
        totalRevenue,
        totalCost,
        totalProfit,
        orderCount,
        monthlyRevenue,
        monthlyProfit,
        monthlyOrderCount: thisMonthOrders.length,
      },
    }
  } catch (error) {
    console.error("Error fetching store earnings:", error)
    return { error: "Failed to fetch earnings" }
  }
}

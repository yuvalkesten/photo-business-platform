"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { cancelProdigiOrder } from "@/lib/prodigi/orders"
import { stripe } from "@/lib/stripe/client"

export async function cancelStoreOrder(orderId: string) {
  try {
    const user = await requireAuth()

    const order = await prisma.storeOrder.findFirst({
      where: { id: orderId, userId: user.id },
    })

    if (!order) {
      return { error: "Order not found" }
    }

    // Only cancel orders that haven't been printed yet
    const cancellableStatuses = ["PENDING_PAYMENT", "PAID", "PROCESSING"]
    if (!cancellableStatuses.includes(order.status)) {
      return { error: "Order cannot be cancelled at this stage" }
    }

    // Cancel Prodigi order if it exists
    if (order.prodigiOrderId) {
      try {
        await cancelProdigiOrder(order.prodigiOrderId)
      } catch (prodigiError) {
        console.error("Failed to cancel Prodigi order:", prodigiError)
        // Continue with our cancellation even if Prodigi fails
      }
    }

    // Refund via Stripe if payment was made
    if (order.stripePaymentIntentId && order.status !== "PENDING_PAYMENT") {
      try {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
        })
      } catch (stripeError) {
        console.error("Failed to create Stripe refund:", stripeError)
        return { error: "Failed to process refund. Please try again or refund manually in Stripe." }
      }
    }

    await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        status: order.stripePaymentIntentId ? "REFUNDED" : "CANCELLED",
        cancelledAt: new Date(),
        ...(order.stripePaymentIntentId ? { refundedAt: new Date() } : {}),
      },
    })

    revalidatePath("/dashboard/store/orders")
    revalidatePath(`/dashboard/store/orders/${orderId}`)
    return { success: true }
  } catch (error) {
    console.error("Error cancelling order:", error)
    return { error: "Failed to cancel order" }
  }
}

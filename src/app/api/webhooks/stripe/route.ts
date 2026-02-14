import { NextRequest, NextResponse } from "next/server"
import { verifyStripeWebhook } from "@/lib/stripe/webhooks"
import { prisma } from "@/lib/db"
import { submitOrderToProdigi } from "@/lib/prodigi/submit-order"
import { stripe } from "@/lib/stripe/client"
import type { Prisma } from "@prisma/client"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = verifyStripeWebhook(body, signature)
  } catch (error) {
    console.error("Stripe webhook verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const orderId = session.metadata?.orderId
        if (!orderId) break

        const order = await prisma.storeOrder.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                photo: { select: { s3Url: true } },
              },
            },
          },
        })

        if (!order || order.status !== "PENDING_PAYMENT") break

        // Update order to PAID
        const totalFromStripe = session.amount_total
          ? session.amount_total / 100
          : Number(order.totalAmount)

        await prisma.storeOrder.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent as string | undefined,
            totalAmount: totalFromStripe as unknown as Prisma.Decimal,
            photographerProfit: (totalFromStripe - Number(order.prodigiCostTotal)) as unknown as Prisma.Decimal,
          },
        })

        // Submit order to Prodigi
        try {
          await submitOrderToProdigi(orderId)
        } catch (prodigiError) {
          const errorMessage = prodigiError instanceof Error
            ? prodigiError.message
            : String(prodigiError)
          console.error("Failed to submit to Prodigi:", errorMessage)

          // Auto-refund the customer since fulfillment failed
          try {
            const paymentIntentId = session.payment_intent as string
            if (paymentIntentId) {
              await stripe.refunds.create({
                payment_intent: paymentIntentId,
              })
              console.log(`Refund issued for order ${orderId} (PI: ${paymentIntentId})`)
            }
          } catch (refundError) {
            console.error("Failed to issue refund for order", orderId, refundError)
          }

          // Mark order as FAILED with reason
          await prisma.storeOrder.update({
            where: { id: orderId },
            data: {
              status: "FAILED",
              failureReason: `Prodigi submission failed: ${errorMessage}`,
            },
          })
        }

        break
      }

      case "checkout.session.expired": {
        const session = event.data.object
        const orderId = session.metadata?.orderId
        if (!orderId) break

        await prisma.storeOrder.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        })
        break
      }

      case "charge.refunded": {
        const charge = event.data.object
        const paymentIntentId = charge.payment_intent as string | undefined
        if (!paymentIntentId) break

        const order = await prisma.storeOrder.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
        })
        if (!order) break

        await prisma.storeOrder.update({
          where: { id: order.id },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
          },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

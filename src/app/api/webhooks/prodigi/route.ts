import { NextRequest, NextResponse } from "next/server"
import { parseProdigiWebhook, verifyProdigiWebhook } from "@/lib/prodigi/webhooks"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-prodigi-signature")

  // Verify webhook if secret is configured
  if (process.env.PRODIGI_WEBHOOK_SECRET) {
    if (!verifyProdigiWebhook(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  }

  try {
    const payload = parseProdigiWebhook(body)
    const prodigiOrder = payload.data.order

    // Find our order by Prodigi order ID
    const order = await prisma.storeOrder.findFirst({
      where: { prodigiOrderId: prodigiOrder.id },
    })

    if (!order) {
      console.warn(`Prodigi webhook: order not found for ${prodigiOrder.id}`)
      return NextResponse.json({ received: true })
    }

    const stage = prodigiOrder.status.stage

    // Extract tracking info from shipments
    const shipment = prodigiOrder.shipments?.[0]
    const trackingNumber = shipment?.tracking?.number || null
    const trackingUrl = shipment?.tracking?.url || null

    switch (stage) {
      case "Complete": {
        await prisma.storeOrder.update({
          where: { id: order.id },
          data: {
            prodigiOrderStatus: stage,
            status: trackingNumber ? "SHIPPED" : "DELIVERED",
            trackingNumber,
            trackingUrl,
            shippedAt: shipment ? new Date(shipment.dispatchDate) : new Date(),
            ...(trackingNumber ? {} : { deliveredAt: new Date() }),
          },
        })
        break
      }

      case "Cancelled": {
        await prisma.storeOrder.update({
          where: { id: order.id },
          data: {
            prodigiOrderStatus: stage,
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        })
        break
      }

      case "InProgress": {
        // Update tracking if available
        const updateData: Record<string, unknown> = {
          prodigiOrderStatus: stage,
        }

        if (trackingNumber) {
          updateData.trackingNumber = trackingNumber
          updateData.trackingUrl = trackingUrl
          updateData.status = "SHIPPED"
          updateData.shippedAt = shipment
            ? new Date(shipment.dispatchDate)
            : new Date()
        }

        await prisma.storeOrder.update({
          where: { id: order.id },
          data: updateData,
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Prodigi webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

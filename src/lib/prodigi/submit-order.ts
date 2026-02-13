import { prisma } from "@/lib/db"
import { createProdigiOrder } from "./orders"
import type { ProdigiAddress, ProdigiOrderItem } from "./types"

export async function submitOrderToProdigi(orderId: string) {
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

  if (!order) throw new Error(`Order ${orderId} not found`)
  if (order.status !== "PAID") throw new Error(`Order ${orderId} is not in PAID status`)

  const shippingAddress = order.shippingAddress as {
    name: string
    line1: string
    line2?: string
    city: string
    state?: string
    postalCode: string
    country: string
  }

  const recipient = {
    name: order.customerName,
    email: order.customerEmail,
    address: {
      line1: shippingAddress.line1,
      line2: shippingAddress.line2,
      townOrCity: shippingAddress.city,
      stateOrCounty: shippingAddress.state,
      postalOrZipCode: shippingAddress.postalCode,
      countryCode: shippingAddress.country,
    } as ProdigiAddress,
  }

  const items: ProdigiOrderItem[] = order.items
    .filter((item) => item.photo?.s3Url)
    .map((item) => ({
      merchantReference: item.id,
      sku: item.prodigiSku,
      copies: item.quantity,
      sizing: "fillPrintArea" as const,
      assets: [
        {
          printArea: "default",
          url: item.photo!.s3Url,
        },
      ],
    }))

  if (items.length === 0) {
    throw new Error("No items with valid photo URLs")
  }

  const prodigiOrder = await createProdigiOrder({
    merchantReference: order.orderNumber,
    shippingMethod: order.shippingMethod || "Standard",
    recipient,
    items,
  })

  await prisma.storeOrder.update({
    where: { id: orderId },
    data: {
      status: "PROCESSING",
      prodigiOrderId: prodigiOrder.id,
      prodigiOrderStatus: prodigiOrder.status.stage,
    },
  })

  return prodigiOrder
}

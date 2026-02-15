"use server"

import { prisma } from "@/lib/db"
import { createCheckoutSession } from "@/lib/stripe/checkout"
import { getProdigiQuote } from "@/lib/prodigi/quotes"
import { checkoutSchema } from "@/lib/validations/store.schema"
import type { Prisma } from "@prisma/client"

function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = "PRT-"
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function createCheckout(data: Record<string, unknown>) {
  try {
    const shareToken = data.shareToken as string | undefined

    const validated = checkoutSchema.parse(data)

    // Validate US-only shipping
    if (validated.shippingAddress.country !== "US") {
      return { error: "Shipping is currently only available within the United States" }
    }

    // Look up gallery and verify store is enabled
    const gallery = await prisma.gallery.findUnique({
      where: { id: validated.galleryId },
      select: {
        id: true,
        userId: true,
        storeEnabled: true,
        shareToken: true,
        priceSheet: {
          select: {
            isActive: true,
            items: {
              select: {
                id: true,
                prodigiSku: true,
                productName: true,
                sizeLabel: true,
                prodigiCost: true,
                retailPrice: true,
              },
            },
          },
        },
      },
    })

    if (!gallery || !gallery.storeEnabled || !gallery.priceSheet?.isActive) {
      return { error: "Store is not available for this gallery" }
    }

    // Validate each cart item against current price sheet
    const priceMap = new Map(
      gallery.priceSheet.items.map((item) => [item.prodigiSku, item])
    )

    let subtotal = 0
    let prodigiCostTotal = 0 // Will be updated by Prodigi quote
    const orderItems: {
      photoId: string
      prodigiSku: string
      productName: string
      sizeLabel: string
      quantity: number
      unitPrice: number
      prodigiUnitCost: number
      lineTotal: number
    }[] = []

    for (const cartItem of validated.items) {
      const priceSheetItem = priceMap.get(cartItem.prodigiSku)
      if (!priceSheetItem) {
        return { error: `Product ${cartItem.productName} is no longer available` }
      }

      // Use current price sheet price (not client-provided price)
      const unitPrice = Number(priceSheetItem.retailPrice)
      const prodigiUnitCost = Number(priceSheetItem.prodigiCost)
      const lineTotal = unitPrice * cartItem.quantity

      subtotal += lineTotal
      prodigiCostTotal += prodigiUnitCost * cartItem.quantity

      orderItems.push({
        photoId: cartItem.photoId,
        prodigiSku: cartItem.prodigiSku,
        productName: priceSheetItem.productName,
        sizeLabel: priceSheetItem.sizeLabel,
        quantity: cartItem.quantity,
        unitPrice,
        prodigiUnitCost,
        lineTotal,
      })
    }

    // Get shipping/tax quote from Prodigi
    let shippingCost = 0
    let taxAmount = 0
    try {
      const quoteResult = await getProdigiQuote({
        shippingMethod: "Standard",
        destinationCountryCode: validated.shippingAddress.country,
        items: orderItems.map((item) => ({
          sku: item.prodigiSku,
          copies: item.quantity,
          attributes: { finish: "lustre" },
          assets: [{ printArea: "default", url: "https://placeholder.com/test.jpg" }],
        })),
      })

      if (quoteResult.quotes.length > 0) {
        const quote = quoteResult.quotes[0]
        shippingCost = Number(quote.costSummary.shipping.amount)
        taxAmount = quote.costSummary.tax ? Number(quote.costSummary.tax.amount) : 0
        prodigiCostTotal = Number(quote.costSummary.total.amount)
      }
    } catch (quoteError) {
      console.error("Failed to get Prodigi quote, proceeding without shipping/tax:", quoteError)
      return { error: "Unable to calculate shipping costs. Please try again." }
    }

    const totalAmount = subtotal + shippingCost + taxAmount
    const photographerProfit = subtotal - (prodigiCostTotal - shippingCost - taxAmount)
    const orderNumber = generateOrderNumber()

    // Create StoreOrder
    const order = await prisma.storeOrder.create({
      data: {
        userId: gallery.userId,
        galleryId: gallery.id,
        orderNumber,
        customerEmail: validated.customerEmail,
        customerName: validated.customerName,
        subtotal: subtotal as unknown as Prisma.Decimal,
        shippingCost: shippingCost as unknown as Prisma.Decimal,
        taxAmount: taxAmount as unknown as Prisma.Decimal,
        totalAmount: totalAmount as unknown as Prisma.Decimal,
        prodigiCostTotal: prodigiCostTotal as unknown as Prisma.Decimal,
        photographerProfit: photographerProfit as unknown as Prisma.Decimal,
        shippingAddress: JSON.parse(JSON.stringify(validated.shippingAddress)) as Prisma.InputJsonValue,
        shippingMethod: "Standard",
        status: "PENDING_PAYMENT",
        items: {
          create: orderItems.map((item) => ({
            photoId: item.photoId,
            prodigiSku: item.prodigiSku,
            productName: item.productName,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            unitPrice: item.unitPrice as unknown as Prisma.Decimal,
            prodigiUnitCost: item.prodigiUnitCost as unknown as Prisma.Decimal,
            lineTotal: item.lineTotal as unknown as Prisma.Decimal,
          })),
        },
      },
    })

    // Build success/cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const galleryPath = shareToken
      ? `/gallery/${shareToken}`
      : `/gallery/${gallery.shareToken}`

    const successUrl = `${baseUrl}${galleryPath}/store/success?order=${orderNumber}`
    const cancelUrl = `${baseUrl}${galleryPath}`

    // Create Stripe Checkout Session
    const session = await createCheckoutSession({
      orderId: order.id,
      orderNumber,
      customerEmail: validated.customerEmail,
      lineItems: orderItems.map((item) => ({
        name: item.productName,
        description: item.sizeLabel,
        unitAmount: Math.round(item.unitPrice * 100), // cents
        quantity: item.quantity,
      })),
      shippingCost: Math.round(shippingCost * 100), // cents
      taxAmount: Math.round(taxAmount * 100), // cents
      successUrl,
      cancelUrl,
      metadata: {
        galleryId: gallery.id,
      },
    })

    // Update order with Stripe session ID
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    })

    return { success: true, checkoutUrl: session.url }
  } catch (error) {
    console.error("Error creating checkout:", error)
    return { error: "Failed to create checkout session" }
  }
}

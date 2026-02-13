import { stripe } from "./client"
import type Stripe from "stripe"

interface CheckoutLineItem {
  name: string
  description?: string
  unitAmount: number // in cents
  quantity: number
  imageUrl?: string
}

interface CreateCheckoutParams {
  orderId: string
  orderNumber: string
  customerEmail: string
  lineItems: CheckoutLineItem[]
  shippingCost: number // in cents
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    params.lineItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: item.description,
          images: item.imageUrl ? [item.imageUrl] : undefined,
        },
        unit_amount: item.unitAmount,
      },
      quantity: item.quantity,
    }))

  // Add shipping as a line item
  if (params.shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Shipping",
        },
        unit_amount: params.shippingCost,
      },
      quantity: 1,
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.customerEmail,
    line_items: lineItems,
    automatic_tax: { enabled: true },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      ...params.metadata,
    },
  })

  return session
}

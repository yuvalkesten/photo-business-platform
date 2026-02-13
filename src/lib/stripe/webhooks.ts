import type Stripe from "stripe"
import { stripe } from "./client"

export function verifyStripeWebhook(
  body: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}

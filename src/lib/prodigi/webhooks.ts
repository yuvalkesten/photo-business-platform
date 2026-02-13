import type { ProdigiWebhookPayload } from "./types"

export function parseProdigiWebhook(body: string): ProdigiWebhookPayload {
  return JSON.parse(body) as ProdigiWebhookPayload
}

export function verifyProdigiWebhook(
  body: string,
  signature: string | null
): boolean {
  // Prodigi webhook verification uses a shared secret
  // The signature header is compared against HMAC-SHA256 of the body
  if (!signature || !process.env.PRODIGI_WEBHOOK_SECRET) {
    return false
  }

  const crypto = require("crypto") as typeof import("crypto")
  const expectedSignature = crypto
    .createHmac("sha256", process.env.PRODIGI_WEBHOOK_SECRET)
    .update(body)
    .digest("hex")

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

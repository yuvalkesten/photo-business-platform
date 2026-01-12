/**
 * Instagram Messaging Webhook
 *
 * Receives push notifications from Meta when new Instagram DMs arrive.
 * Triggers the message processing pipeline for classification and entity creation.
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { InstagramWebhookPayload } from "@/lib/instagram/types";
import { processInstagramMessage } from "@/lib/instagram/processing";

// Environment variables
const INSTAGRAM_WEBHOOK_VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
const META_APP_SECRET = process.env.META_APP_SECRET;

/**
 * GET - Webhook Verification
 *
 * Meta sends a GET request to verify the webhook endpoint.
 * We must respond with the challenge to confirm ownership.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Check if this is a verification request
  if (mode === "subscribe") {
    if (!INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      console.error("INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (token === INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
      console.log("Instagram webhook verified successfully");
      // Must return the challenge as plain text, not JSON
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("Invalid Instagram webhook verification token");
    return new Response("Forbidden", { status: 403 });
  }

  // Not a verification request - return status
  return NextResponse.json({
    status: "active",
    message: "Instagram webhook endpoint is ready",
  });
}

/**
 * POST - Receive Message Notifications
 *
 * Meta sends POST requests when new messages arrive.
 * We verify the signature, parse the payload, and queue for processing.
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify the request signature
    if (META_APP_SECRET) {
      const signature = request.headers.get("x-hub-signature-256");
      if (!verifySignature(rawBody, signature)) {
        console.warn("Invalid Instagram webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // Parse the payload
    let payload: InstagramWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Failed to parse Instagram webhook payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify this is an Instagram event
    if (payload.object !== "instagram") {
      console.log(`Ignoring non-Instagram event: ${payload.object}`);
      return NextResponse.json({ status: "ignored" });
    }

    // Process each entry
    for (const entry of payload.entry) {
      const instagramAccountId = entry.id;

      // Find the user by their Instagram account ID
      const instagramAccount = await prisma.instagramAccount.findUnique({
        where: { instagramUserId: instagramAccountId },
        include: { user: true },
      });

      if (!instagramAccount) {
        console.log(`No user found for Instagram account: ${instagramAccountId}`);
        continue;
      }

      if (!instagramAccount.isActive) {
        console.log(`Instagram integration not active for user: ${instagramAccount.userId}`);
        continue;
      }

      // Process each messaging event
      for (const event of entry.messaging) {
        // Skip echo messages (messages you sent)
        if (event.message?.is_echo) {
          continue;
        }

        // Skip non-message events (read receipts, postbacks, etc.)
        if (!event.message?.text) {
          continue;
        }

        // Log the incoming message
        console.log(
          `Received Instagram DM for user ${instagramAccount.userId}:`,
          {
            messageId: event.message.mid,
            senderId: event.sender.id,
            textPreview: event.message.text.substring(0, 50) + (event.message.text.length > 50 ? "..." : ""),
          }
        );

        // Process the message asynchronously (don't await to respond quickly)
        processInstagramMessage(instagramAccount.userId, {
          messageId: event.message.mid,
          senderId: event.sender.id,
          text: event.message.text,
          timestamp: new Date(event.timestamp),
          recipientId: event.recipient.id,
          hasAttachments: !!(event.message.attachments && event.message.attachments.length > 0),
          attachmentUrls: event.message.attachments?.map(a => a.payload.url).filter((url): url is string => !!url),
        }).catch((error) => {
          console.error(`Error processing Instagram message ${event.message?.mid}:`, error);
        });
      }
    }

    // Must return 200 quickly to acknowledge receipt
    // Meta will retry if we don't respond within 20 seconds
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Instagram webhook error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify the webhook request signature
 *
 * Meta signs all webhook requests with your app secret.
 * This ensures the request actually came from Meta.
 */
function verifySignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature || !META_APP_SECRET) {
    return false;
  }

  const expectedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", META_APP_SECRET)
      .update(payload)
      .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

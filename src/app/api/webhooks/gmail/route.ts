/**
 * Gmail Pub/Sub Webhook
 *
 * Receives push notifications from Google Pub/Sub when new emails arrive.
 * Triggers the email processing pipeline for classification and entity creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processEmailNotification } from "@/lib/email/processing";
import { PubSubNotification } from "@/lib/email/gmail";

// Verification token for Pub/Sub (set in environment)
const PUBSUB_VERIFICATION_TOKEN = process.env.PUBSUB_VERIFICATION_TOKEN;

/**
 * POST - Receive Pub/Sub notification
 *
 * Google Pub/Sub sends a POST request with a base64-encoded message
 * containing the email address and history ID.
 */
export async function POST(request: NextRequest) {
  // Verify the request is from Google Pub/Sub
  const token = request.nextUrl.searchParams.get("token");

  if (!PUBSUB_VERIFICATION_TOKEN) {
    console.error("PUBSUB_VERIFICATION_TOKEN is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  if (token !== PUBSUB_VERIFICATION_TOKEN) {
    console.warn("Invalid Pub/Sub verification token");
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate Pub/Sub message structure
    const message = body.message;
    if (!message?.data) {
      console.warn("Invalid Pub/Sub message: missing data");
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // Decode the base64 message data
    const decodedData = Buffer.from(message.data, "base64").toString("utf8");
    let notification: PubSubNotification;

    try {
      notification = JSON.parse(decodedData);
    } catch {
      console.error("Failed to parse Pub/Sub message data:", decodedData);
      return NextResponse.json(
        { error: "Invalid message data" },
        { status: 400 }
      );
    }

    const { emailAddress, historyId } = notification;

    if (!emailAddress || !historyId) {
      console.warn("Missing emailAddress or historyId in notification");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the user by their email address
    const user = await prisma.user.findUnique({
      where: { email: emailAddress },
      include: { emailWatch: true },
    });

    if (!user) {
      // User doesn't exist - acknowledge but don't process
      console.log(`No user found for email: ${emailAddress}`);
      return NextResponse.json({ status: "ignored", reason: "user_not_found" });
    }

    if (!user.emailWatch?.isActive) {
      // Watch not active - acknowledge but don't process
      console.log(`Email watch not active for user: ${user.id}`);
      return NextResponse.json({ status: "ignored", reason: "watch_inactive" });
    }

    // Process the notification asynchronously
    // We don't await to avoid blocking the webhook response
    // Vercel functions timeout after 10-60s depending on plan
    processEmailNotification(user.id, historyId).catch((error) => {
      console.error(
        `Error processing email notification for user ${user.id}:`,
        error
      );
    });

    // Acknowledge receipt immediately
    // Pub/Sub will retry if we don't respond with 2xx within 10s
    return NextResponse.json({
      status: "ok",
      userId: user.id,
      historyId,
    });
  } catch (error) {
    console.error("Gmail webhook error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET - Pub/Sub endpoint verification
 *
 * Google Pub/Sub may send a GET request to verify the endpoint.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!PUBSUB_VERIFICATION_TOKEN) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  if (token === PUBSUB_VERIFICATION_TOKEN) {
    return NextResponse.json({
      status: "verified",
      message: "Gmail webhook endpoint is active",
    });
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 403 });
}

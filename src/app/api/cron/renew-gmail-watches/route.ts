/**
 * Gmail Watch Renewal Cron Job
 *
 * Runs daily to renew Gmail watches that are expiring within 24 hours.
 * Gmail watches expire after 7 days, so this ensures continuous email monitoring.
 *
 * Vercel Cron: Configured in vercel.json to run daily at 2:00 AM UTC
 */

import { NextRequest, NextResponse } from "next/server";
import { renewExpiringWatches } from "@/lib/email/gmail";

// Secret to verify the request is from Vercel Cron
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn("Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("Starting Gmail watch renewal cron job...");

  try {
    const renewedCount = await renewExpiringWatches();

    console.log(`Gmail watch renewal complete. Renewed ${renewedCount} watches.`);

    return NextResponse.json({
      success: true,
      renewedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Gmail watch renewal cron error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

/**
 * Instagram OAuth Initiation
 *
 * Redirects the user to Meta's OAuth flow to connect their Instagram Business account.
 * The user must have an Instagram Business or Creator account linked to a Facebook Page.
 *
 * Required permissions:
 * - instagram_basic: Access basic account info
 * - instagram_manage_messages: Read and send DMs
 * - pages_show_list: List Facebook Pages (needed to find linked Instagram)
 * - pages_read_engagement: Read page info
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";

const META_APP_ID = process.env.META_APP_ID;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// OAuth scopes required for Instagram DM integration
const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_read_engagement",
  "pages_messaging",
].join(",");

/**
 * GET /api/auth/instagram
 *
 * Initiates the Instagram OAuth flow by redirecting to Meta's authorization page.
 */
export async function GET() {
  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to connect Instagram" },
      { status: 401 }
    );
  }

  if (!META_APP_ID) {
    console.error("META_APP_ID is not configured");
    return NextResponse.json(
      { error: "Instagram integration is not configured" },
      { status: 500 }
    );
  }

  // Generate a state parameter to prevent CSRF attacks
  // Include the user ID so we can verify it in the callback
  const stateData = {
    userId: session.user.id,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

  // Build the Meta OAuth URL
  const redirectUri = `${NEXTAUTH_URL}/api/auth/instagram/callback`;

  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", INSTAGRAM_SCOPES);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  // Redirect to Meta's OAuth page
  return NextResponse.redirect(authUrl.toString());
}

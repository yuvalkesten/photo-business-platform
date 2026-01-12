/**
 * Instagram OAuth Callback
 *
 * Handles the OAuth callback from Meta after the user authorizes the app.
 * Exchanges the authorization code for an access token and stores the Instagram account.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface StateData {
  userId: string;
  nonce: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

interface PagesResponse {
  data: FacebookPage[];
}

interface InstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
}

/**
 * GET /api/auth/instagram/callback
 *
 * Handles the OAuth callback from Meta.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("Instagram OAuth error:", { error, errorReason, errorDescription });
    const errorUrl = new URL("/dashboard/settings", NEXTAUTH_URL);
    errorUrl.searchParams.set("instagram_error", errorDescription || error);
    return NextResponse.redirect(errorUrl.toString());
  }

  // Verify required parameters
  if (!code || !state) {
    return redirectWithError("Missing authorization code or state");
  }

  // Verify configuration
  if (!META_APP_ID || !META_APP_SECRET) {
    console.error("META_APP_ID or META_APP_SECRET is not configured");
    return redirectWithError("Instagram integration is not configured");
  }

  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return redirectWithError("You must be logged in to connect Instagram");
  }

  // Decode and verify the state parameter
  let stateData: StateData;
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return redirectWithError("Invalid state parameter");
  }

  // Verify the user ID matches
  if (stateData.userId !== session.user.id) {
    console.error("State userId mismatch", {
      stateUserId: stateData.userId,
      sessionUserId: session.user.id,
    });
    return redirectWithError("Session mismatch - please try again");
  }

  try {
    // Step 1: Exchange the authorization code for a short-lived access token
    const redirectUri = `${NEXTAUTH_URL}/api/auth/instagram/callback`;
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Failed to exchange code for token:", errorData);
      return redirectWithError("Failed to connect Instagram - authorization failed");
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    // Step 2: Exchange for a long-lived access token (60 days)
    const longLivedUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", META_APP_ID);
    longLivedUrl.searchParams.set("client_secret", META_APP_SECRET);
    longLivedUrl.searchParams.set("fb_exchange_token", tokenData.access_token);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    if (!longLivedResponse.ok) {
      const errorData = await longLivedResponse.json();
      console.error("Failed to get long-lived token:", errorData);
      return redirectWithError("Failed to connect Instagram - token exchange failed");
    }

    const longLivedData: LongLivedTokenResponse = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // seconds until expiration

    // Step 3: Get the user's Facebook Pages
    const pagesUrl = new URL("https://graph.facebook.com/v18.0/me/accounts");
    pagesUrl.searchParams.set("access_token", accessToken);
    pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");

    const pagesResponse = await fetch(pagesUrl.toString());
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error("Failed to fetch Facebook Pages:", errorData);
      return redirectWithError("Failed to fetch your Facebook Pages");
    }

    const pagesData: PagesResponse = await pagesResponse.json();

    // Step 4: Find a page with an Instagram Business Account
    const pageWithInstagram = pagesData.data.find(
      (page) => page.instagram_business_account?.id
    );

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      console.log("No Instagram Business Account found on any page");
      return redirectWithError(
        "No Instagram Business account found. Please ensure your Instagram is linked to a Facebook Page."
      );
    }

    const instagramAccountId = pageWithInstagram.instagram_business_account.id;
    const pageAccessToken = pageWithInstagram.access_token;

    // Step 5: Get the Instagram account details
    const instagramUrl = new URL(`https://graph.facebook.com/v18.0/${instagramAccountId}`);
    instagramUrl.searchParams.set("access_token", pageAccessToken);
    instagramUrl.searchParams.set("fields", "id,username,name");

    const instagramResponse = await fetch(instagramUrl.toString());
    if (!instagramResponse.ok) {
      const errorData = await instagramResponse.json();
      console.error("Failed to fetch Instagram account info:", errorData);
      return redirectWithError("Failed to fetch Instagram account details");
    }

    const instagramData: InstagramAccountInfo = await instagramResponse.json();

    // Step 6: Calculate token expiration date
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Step 7: Store or update the Instagram account in the database
    await prisma.instagramAccount.upsert({
      where: { userId: session.user.id },
      update: {
        instagramUserId: instagramData.id,
        username: instagramData.username,
        accessToken: pageAccessToken, // Use page token for messaging
        tokenExpiresAt,
        pageId: pageWithInstagram.id,
        pageName: pageWithInstagram.name,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        instagramUserId: instagramData.id,
        username: instagramData.username,
        accessToken: pageAccessToken,
        tokenExpiresAt,
        pageId: pageWithInstagram.id,
        pageName: pageWithInstagram.name,
        isActive: true,
      },
    });

    console.log(`Instagram account connected for user ${session.user.id}:`, {
      instagramUserId: instagramData.id,
      username: instagramData.username,
      pageId: pageWithInstagram.id,
    });

    // Redirect to settings with success message
    const successUrl = new URL("/dashboard/settings", NEXTAUTH_URL);
    successUrl.searchParams.set("instagram_connected", "true");
    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error("Instagram OAuth callback error:", error);
    return redirectWithError("An unexpected error occurred. Please try again.");
  }
}

/**
 * Helper to redirect with an error message
 */
function redirectWithError(message: string): NextResponse {
  const errorUrl = new URL("/dashboard/settings", NEXTAUTH_URL);
  errorUrl.searchParams.set("instagram_error", message);
  return NextResponse.redirect(errorUrl.toString());
}

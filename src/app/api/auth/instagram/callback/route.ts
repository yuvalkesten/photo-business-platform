/**
 * Instagram OAuth Callback (via Facebook Login)
 *
 * Handles the OAuth callback from Facebook after the user authorizes the app.
 * Uses Facebook Login to access Instagram through a linked Facebook Page.
 *
 * Flow:
 * 1. Exchange authorization code for Facebook user access token
 * 2. Exchange for long-lived token (60 days)
 * 3. Get user's Facebook Pages
 * 4. Find Page with linked Instagram Business account
 * 5. Get Page Access Token (required for Instagram messaging)
 * 6. Store Instagram account info with Page Access Token
 * 7. Trigger historical message sync
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { syncHistoricalMessages } from "@/lib/instagram/sync";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

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
 * Handles the OAuth callback from Facebook.
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
    console.error("Facebook OAuth error:", { error, errorReason, errorDescription });
    const errorUrl = new URL("/dashboard/messages", NEXTAUTH_URL);
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
    const tokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
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
    const longLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
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
    const userAccessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in;

    // Debug: Log token info (first 20 chars only for security)
    console.log("Long-lived token obtained:", {
      tokenPrefix: userAccessToken.substring(0, 20) + "...",
      expiresIn,
    });

    // Step 3: Get the user's Facebook Pages
    const pagesUrl = new URL(`${GRAPH_API_BASE}/me/accounts`);
    pagesUrl.searchParams.set("access_token", userAccessToken);
    pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");

    console.log("Fetching pages from:", pagesUrl.toString().replace(userAccessToken, "[REDACTED]"));

    const pagesResponse = await fetch(pagesUrl.toString());
    console.log("Pages response status:", pagesResponse.status);
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error("Failed to fetch Facebook Pages:", errorData);
      return redirectWithError("Failed to fetch your Facebook Pages");
    }

    const pagesData: PagesResponse = await pagesResponse.json();

    // Debug: Log all pages returned
    console.log("Facebook Pages returned:", JSON.stringify(pagesData, null, 2));

    // Step 4: Find a page with an Instagram Business Account
    let pageWithInstagram = pagesData.data.find(
      (page) => page.instagram_business_account?.id
    );

    // If no pages returned, try getting Page directly using token debug info
    if (pagesData.data.length === 0) {
      console.log("No pages from /me/accounts, trying to extract from token granular_scopes...");

      // Get token debug info to find the Page ID and Instagram ID from granular_scopes
      const debugUrl = new URL(`${GRAPH_API_BASE}/debug_token`);
      debugUrl.searchParams.set("input_token", userAccessToken);
      debugUrl.searchParams.set("access_token", `${META_APP_ID}|${META_APP_SECRET}`);

      const debugResponse = await fetch(debugUrl.toString());
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log("Token debug info:", JSON.stringify(debugData, null, 2));

        // Extract Page ID and Instagram ID from granular_scopes
        const granularScopes = debugData.data?.granular_scopes || [];
        const pagesScope = granularScopes.find((s: { scope: string }) => s.scope === "pages_show_list");
        const instagramScope = granularScopes.find((s: { scope: string }) => s.scope === "instagram_basic");

        const pageId = pagesScope?.target_ids?.[0];
        const instagramId = instagramScope?.target_ids?.[0];

        if (pageId && instagramId) {
          console.log(`Found Page ID: ${pageId}, Instagram ID: ${instagramId} from granular_scopes`);

          // Fetch the Page directly to get its access token
          const directPageUrl = new URL(`${GRAPH_API_BASE}/${pageId}`);
          directPageUrl.searchParams.set("access_token", userAccessToken);
          directPageUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");

          const directPageResponse = await fetch(directPageUrl.toString());
          if (directPageResponse.ok) {
            const directPageData = await directPageResponse.json();
            console.log("Direct page fetch result:", JSON.stringify(directPageData, null, 2));

            if (directPageData.instagram_business_account?.id) {
              pageWithInstagram = {
                id: directPageData.id,
                name: directPageData.name,
                access_token: directPageData.access_token,
                instagram_business_account: directPageData.instagram_business_account,
              };
            }
          } else {
            const errorData = await directPageResponse.json();
            console.error("Failed to fetch page directly:", errorData);
          }
        }
      }
    }

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      console.log("No Instagram Business Account found on any page. Pages received:",
        pagesData.data.map(p => ({ id: p.id, name: p.name, hasInstagram: !!p.instagram_business_account }))
      );
      return redirectWithError(
        "No Instagram Business account found. Please ensure your Instagram is linked to a Facebook Page."
      );
    }

    const instagramAccountId = pageWithInstagram.instagram_business_account.id;
    const pageAccessToken = pageWithInstagram.access_token;

    // Step 5: Get the Instagram account details
    const instagramUrl = new URL(`${GRAPH_API_BASE}/${instagramAccountId}`);
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
    // Note: We store the Page Access Token because it's needed for messaging
    await prisma.instagramAccount.upsert({
      where: { userId: session.user.id },
      update: {
        instagramUserId: instagramData.id,
        username: instagramData.username,
        accessToken: pageAccessToken, // Page token for messaging
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
      pageName: pageWithInstagram.name,
    });

    // Step 8: Trigger historical message sync in background (don't await)
    syncHistoricalMessages(session.user.id, { maxDays: 30 })
      .then((result) => {
        console.log(`[Instagram Sync] Historical sync completed for user ${session.user.id}:`, result);
      })
      .catch((error) => {
        console.error(`[Instagram Sync] Historical sync failed for user ${session.user.id}:`, error);
      });

    // Redirect to messages page with success message
    const successUrl = new URL("/dashboard/messages", NEXTAUTH_URL);
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
  const errorUrl = new URL("/dashboard/messages", NEXTAUTH_URL);
  errorUrl.searchParams.set("instagram_error", message);
  return NextResponse.redirect(errorUrl.toString());
}

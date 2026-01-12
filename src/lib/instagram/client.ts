/**
 * Instagram API Client
 *
 * Utility functions for interacting with the Instagram Graph API.
 */

import { prisma } from "@/lib/db";
import { InstagramError, InstagramUserProfile } from "./types";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

/**
 * Get the Instagram account for a user
 */
export async function getInstagramAccount(userId: string) {
  return prisma.instagramAccount.findUnique({
    where: { userId },
  });
}

/**
 * Get the Instagram account by Instagram user ID
 */
export async function getInstagramAccountByInstagramId(instagramUserId: string) {
  return prisma.instagramAccount.findUnique({
    where: { instagramUserId },
  });
}

/**
 * Check if a user has an active Instagram connection
 */
export async function hasActiveInstagramConnection(userId: string): Promise<boolean> {
  const account = await prisma.instagramAccount.findUnique({
    where: { userId },
    select: { isActive: true, tokenExpiresAt: true },
  });

  if (!account || !account.isActive) {
    return false;
  }

  // Check if token has expired
  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    return false;
  }

  return true;
}

/**
 * Refresh an Instagram access token
 *
 * Long-lived tokens can be refreshed to extend their validity.
 * This should be called before the token expires (within 60 days).
 */
export async function refreshInstagramToken(userId: string): Promise<boolean> {
  if (!META_APP_ID || !META_APP_SECRET) {
    throw new InstagramError(
      "Instagram integration is not configured",
      "API_ERROR"
    );
  }

  const account = await prisma.instagramAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    throw new InstagramError("Instagram account not found", "USER_NOT_FOUND");
  }

  try {
    // Refresh the long-lived token
    const refreshUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    refreshUrl.searchParams.set("grant_type", "fb_exchange_token");
    refreshUrl.searchParams.set("client_id", META_APP_ID);
    refreshUrl.searchParams.set("client_secret", META_APP_SECRET);
    refreshUrl.searchParams.set("fb_exchange_token", account.accessToken);

    const response = await fetch(refreshUrl.toString());

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to refresh Instagram token:", errorData);

      // If token is invalid, mark the account as inactive
      if (
        errorData.error?.code === 190 ||
        errorData.error?.type === "OAuthException"
      ) {
        await prisma.instagramAccount.update({
          where: { userId },
          data: { isActive: false },
        });
        throw new InstagramError(
          "Instagram token has expired. Please reconnect your account.",
          "TOKEN_EXPIRED"
        );
      }

      throw new InstagramError(
        "Failed to refresh Instagram token",
        "API_ERROR"
      );
    }

    const data = await response.json();
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

    // Update the token in the database
    await prisma.instagramAccount.update({
      where: { userId },
      data: {
        accessToken: data.access_token,
        tokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });

    console.log(`Refreshed Instagram token for user ${userId}`);
    return true;
  } catch (error) {
    if (error instanceof InstagramError) {
      throw error;
    }
    console.error("Error refreshing Instagram token:", error);
    throw new InstagramError(
      "Failed to refresh Instagram token",
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Fetch a user's profile information from Instagram
 */
export async function fetchInstagramUserProfile(
  accessToken: string,
  instagramScopedUserId: string
): Promise<InstagramUserProfile | null> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/${instagramScopedUserId}`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "id,username,name,profile_pic");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch Instagram user profile:", errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Instagram user profile:", error);
    return null;
  }
}

/**
 * Disconnect an Instagram account
 */
export async function disconnectInstagramAccount(userId: string): Promise<void> {
  const account = await prisma.instagramAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    return; // Already disconnected
  }

  // Delete the account record
  await prisma.instagramAccount.delete({
    where: { userId },
  });

  console.log(`Disconnected Instagram account for user ${userId}`);
}

/**
 * Verify an Instagram access token is still valid
 */
export async function verifyInstagramToken(accessToken: string): Promise<boolean> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", `${META_APP_ID}|${META_APP_SECRET}`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.data?.is_valid === true;
  } catch {
    return false;
  }
}

/**
 * Send a message via Instagram DM
 *
 * Note: Requires instagram_manage_messages permission
 */
export async function sendInstagramMessage(
  accessToken: string,
  instagramAccountId: string,
  recipientId: string,
  message: string
): Promise<{ messageId: string } | null> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/${instagramAccountId}/messages`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send Instagram message:", errorData);
      return null;
    }

    const data = await response.json();
    return { messageId: data.message_id };
  } catch (error) {
    console.error("Error sending Instagram message:", error);
    return null;
  }
}

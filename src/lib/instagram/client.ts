/**
 * Instagram API Client
 *
 * Utility functions for interacting with the Instagram Graph API.
 * Uses Facebook Login to access Instagram through a linked Facebook Page.
 * This provides access to the /conversations endpoint for historical DM sync.
 */

import { prisma } from "@/lib/db";
import { InstagramError, InstagramUserProfile } from "./types";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

// Facebook Graph API base URL (used for Instagram access via Facebook Pages)
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
 * Long-lived Page Access Tokens can be refreshed to extend their validity.
 * This should be called before the token expires (within 60 days).
 * Uses Facebook's token refresh endpoint for Page tokens.
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
    // Refresh the long-lived Page Access Token using Facebook's endpoint
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
  instagramUserId: string
): Promise<InstagramUserProfile | null> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/${instagramUserId}`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "id,username,name,profile_picture_url");

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
 * Verify an Instagram/Page access token is still valid by making a test API call
 */
export async function verifyInstagramToken(accessToken: string): Promise<boolean> {
  try {
    // For Page tokens, verify by checking the debug_token endpoint
    const url = new URL(`${GRAPH_API_BASE}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", accessToken);

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
 * Note: Requires instagram_business_manage_messages permission
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

// ============================================================================
// Conversation and Message Fetching (for historical sync)
// ============================================================================

export interface InstagramConversation {
  id: string;
  updated_time?: string;
  participants?: {
    data: Array<{
      id: string;
      username?: string;
      name?: string;
    }>;
  };
}

export interface InstagramAPIMessage {
  id: string;
  message?: string;
  from: {
    id: string;
    username?: string;
    name?: string;
  };
  to?: {
    data: Array<{
      id: string;
      username?: string;
    }>;
  };
  created_time: string;
}

export interface ConversationsResponse {
  conversations: InstagramConversation[];
  nextCursor?: string;
}

export interface MessagesResponse {
  messages: InstagramAPIMessage[];
  nextCursor?: string;
}

/**
 * Fetch all conversations for an Instagram account
 *
 * Uses the Instagram Messaging API to get conversation threads.
 * Supports cursor-based pagination.
 */
export async function fetchInstagramConversations(
  accessToken: string,
  instagramUserId: string,
  options?: { after?: string; limit?: number }
): Promise<ConversationsResponse> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/${instagramUserId}/conversations`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "id,updated_time,participants");
    url.searchParams.set("limit", String(options?.limit || 20));

    if (options?.after) {
      url.searchParams.set("after", options.after);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch Instagram conversations:", errorData);
      throw new InstagramError(
        `Failed to fetch conversations: ${errorData.error?.message || "Unknown error"}`,
        "API_ERROR"
      );
    }

    const data = await response.json();

    return {
      conversations: data.data || [],
      nextCursor: data.paging?.cursors?.after,
    };
  } catch (error) {
    if (error instanceof InstagramError) {
      throw error;
    }
    console.error("Error fetching Instagram conversations:", error);
    throw new InstagramError(
      "Failed to fetch Instagram conversations",
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Fetch messages from a specific conversation
 *
 * Returns messages in reverse chronological order (newest first).
 * Supports cursor-based pagination.
 */
export async function fetchConversationMessages(
  accessToken: string,
  conversationId: string,
  options?: { after?: string; limit?: number }
): Promise<MessagesResponse> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/${conversationId}`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set(
      "fields",
      "messages{id,message,from,to,created_time}"
    );

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch conversation messages:", errorData);
      throw new InstagramError(
        `Failed to fetch messages: ${errorData.error?.message || "Unknown error"}`,
        "API_ERROR"
      );
    }

    const data = await response.json();
    const messagesData = data.messages || {};

    return {
      messages: messagesData.data || [],
      nextCursor: messagesData.paging?.cursors?.after,
    };
  } catch (error) {
    if (error instanceof InstagramError) {
      throw error;
    }
    console.error("Error fetching conversation messages:", error);
    throw new InstagramError(
      "Failed to fetch conversation messages",
      "API_ERROR",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Fetch a single message by ID to get full details
 */
export async function fetchMessageById(
  accessToken: string,
  messageId: string
): Promise<InstagramAPIMessage | null> {
  try {
    const url = new URL(`${GRAPH_API_BASE}/${messageId}`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "id,message,from,to,created_time");

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch message:", errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching message:", error);
    return null;
  }
}

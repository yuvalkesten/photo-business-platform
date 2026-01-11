/**
 * Instagram API Types
 *
 * Type definitions for Meta's Instagram Messaging API webhooks and responses.
 */

/**
 * Instagram Webhook Payload
 *
 * This is what Meta sends to our webhook when a new message arrives.
 * Documentation: https://developers.facebook.com/docs/messenger-platform/webhooks
 */
export interface InstagramWebhookPayload {
  object: "instagram";
  entry: InstagramWebhookEntry[];
}

export interface InstagramWebhookEntry {
  /** Instagram Business Account ID */
  id: string;
  /** Timestamp of the event */
  time: number;
  /** Array of messaging events */
  messaging: InstagramMessagingEvent[];
}

export interface InstagramMessagingEvent {
  /** Sender information */
  sender: {
    /** Instagram-scoped user ID */
    id: string;
  };
  /** Recipient (your Instagram account) */
  recipient: {
    /** Your Instagram Business Account ID */
    id: string;
  };
  /** Timestamp of the message */
  timestamp: number;
  /** Message content (present for message events) */
  message?: InstagramMessage;
  /** Postback data (present for button click events) */
  postback?: InstagramPostback;
  /** Read receipt (present for read events) */
  read?: InstagramReadReceipt;
}

export interface InstagramMessage {
  /** Message ID */
  mid: string;
  /** Text content of the message */
  text?: string;
  /** Attachments (images, videos, etc.) */
  attachments?: InstagramAttachment[];
  /** Quick reply payload if user tapped a quick reply */
  quick_reply?: {
    payload: string;
  };
  /** Reply to a specific message */
  reply_to?: {
    mid: string;
  };
  /** Whether this is an echo of a message you sent */
  is_echo?: boolean;
}

export interface InstagramAttachment {
  /** Type of attachment */
  type: "image" | "video" | "audio" | "file" | "share" | "story_mention";
  /** Payload containing the attachment data */
  payload: {
    url?: string;
    sticker_id?: number;
  };
}

export interface InstagramPostback {
  /** Title of the button clicked */
  title: string;
  /** Payload data from the button */
  payload: string;
}

export interface InstagramReadReceipt {
  /** Timestamp of when messages were read */
  watermark: number;
}

/**
 * Parsed Instagram message for processing
 */
export interface ParsedInstagramMessage {
  /** Message ID from Instagram */
  messageId: string;
  /** Thread/conversation ID */
  threadId?: string;
  /** Sender's Instagram-scoped user ID */
  senderId: string;
  /** Sender's username (fetched separately) */
  senderHandle?: string;
  /** Sender's display name (fetched separately) */
  senderName?: string;
  /** Message text content */
  text: string;
  /** Message timestamp */
  timestamp: Date;
  /** Your Instagram account ID (recipient) */
  recipientId: string;
  /** Whether this has attachments */
  hasAttachments: boolean;
  /** Attachment URLs if any */
  attachmentUrls?: string[];
}

/**
 * Instagram User Profile
 *
 * Returned when fetching user details from Graph API.
 */
export interface InstagramUserProfile {
  /** User ID */
  id: string;
  /** Username (handle) */
  username?: string;
  /** Display name */
  name?: string;
  /** Profile picture URL */
  profile_pic?: string;
}

/**
 * Instagram API Error
 */
export class InstagramError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "InstagramError";
  }
}

/**
 * Error codes for Instagram operations
 */
export type InstagramErrorCode =
  | "INVALID_SIGNATURE"
  | "INVALID_PAYLOAD"
  | "USER_NOT_FOUND"
  | "TOKEN_EXPIRED"
  | "API_ERROR"
  | "RATE_LIMITED"
  | "PROCESSING_ERROR";

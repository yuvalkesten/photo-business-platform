/**
 * Gmail Integration Module
 *
 * Provides functions to read emails, set up push notifications,
 * and sync new messages from Gmail.
 */

// Types
export type {
  ParsedGmailMessage,
  GmailWatchInfo,
  HistoryRecord,
  PubSubNotification,
  GmailErrorCode,
} from "./types";

export { GmailError, isValidGmailMessage } from "./types";

// Email reading
export {
  fetchEmail,
  fetchEmails,
  parseGmailMessage,
  toEmailContent,
} from "./read-email";

// Watch management
export {
  setupGmailWatch,
  stopGmailWatch,
  getWatchStatus,
  watchNeedsRenewal,
  renewExpiringWatches,
  updateWatchHistoryId,
} from "./watch";

// History sync
export {
  syncGmailHistory,
  syncFromNotification,
  getRecentInboxMessages,
  isMessageProcessed,
} from "./history";

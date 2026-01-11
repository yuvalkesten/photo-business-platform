/**
 * Email Processing Module
 *
 * Orchestrates email classification and entity creation.
 */

// Main processing functions
export {
  processEmailNotification,
  processMessage,
  retryFailedEmails,
  getProcessingStats,
} from "./process-email";

// Entity creation
export { createEntitiesFromClassification } from "./create-entities";

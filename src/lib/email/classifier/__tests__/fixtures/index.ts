/**
 * Email Test Fixtures Index
 *
 * Exports all test fixtures and mock responses for email classification tests.
 */

export {
  inquiryEmails,
  mockWeddingInquiryResponse,
  type InquiryTestCase,
} from "./inquiry-emails";

export {
  urgentEmails,
  mockUrgentResponse,
  type UrgentTestCase,
} from "./urgent-emails";

export {
  invoiceEmails,
  mockInvoiceResponse,
  type InvoiceTestCase,
} from "./invoice-emails";

export {
  receiptEmails,
  mockReceiptResponse,
  type ReceiptTestCase,
} from "./receipt-emails";

export { otherEmails, type OtherTestCase } from "./other-emails";

// Helper to get all test emails
export function getAllTestEmails() {
  const { inquiryEmails } = require("./inquiry-emails");
  const { urgentEmails } = require("./urgent-emails");
  const { invoiceEmails } = require("./invoice-emails");
  const { receiptEmails } = require("./receipt-emails");
  const { otherEmails } = require("./other-emails");

  return {
    inquiry: inquiryEmails,
    urgent: urgentEmails,
    invoice: invoiceEmails,
    receipt: receiptEmails,
    other: otherEmails,
  };
}

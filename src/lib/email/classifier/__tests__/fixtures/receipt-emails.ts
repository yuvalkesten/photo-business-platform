/**
 * Receipt Email Test Fixtures
 *
 * Sample emails that should be classified as RECEIPT.
 * These represent payment confirmations and receipts from clients.
 */

import { EmailContent, ClassificationResult } from "../../types";

export interface ReceiptTestCase {
  name: string;
  email: EmailContent;
  expectedClassification: "RECEIPT";
  expectedAmount: number | null;
}

export const receiptEmails: ReceiptTestCase[] = [
  {
    name: "Wedding deposit payment confirmation",
    email: {
      messageId: "receipt-1",
      threadId: "thread-wedding",
      subject: "Payment Received - Wedding Photography Deposit",
      from: "payments@stripe.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `Stripe

Payment Received

You've received a payment!

Amount: $1,500.00 USD
Customer: Sarah Johnson (sarah.johnson@email.com)
Description: Wedding Photography Deposit - June 15, 2026
Payment ID: pi_3ABC123DEF456

View payment details in your Stripe Dashboard:
https://dashboard.stripe.com/payments/pi_3ABC123DEF456

Net amount after fees: $1,449.50
Fee: $50.50 (3.37%)

This payment was made with Visa ending in 4242.

Thanks for using Stripe!`,
      htmlBody: null,
      snippet: "Stripe Payment Received You've received a payment!...",
    },
    expectedClassification: "RECEIPT",
    expectedAmount: 1500.0,
  },
  {
    name: "Full payment received via PayPal",
    email: {
      messageId: "receipt-2",
      threadId: null,
      subject: "You've received a payment from Mike Chen",
      from: "service@paypal.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-09"),
      body: `PayPal

Hello photographer@studio.com,

Mike Chen has sent you a payment!

Transaction Details
-------------------
Amount received: $2,500.00 USD
Transaction ID: 5KM12345AB678901C
Date: January 9, 2026

Note from buyer: "Final payment for family portrait session. Thanks for the beautiful photos!"

This payment is now available in your PayPal balance.

View transaction: https://www.paypal.com/activity/payment/5KM12345AB678901C

Thanks for using PayPal!`,
      htmlBody: null,
      snippet: "PayPal Hello photographer@studio.com, Mike Chen has sent you a payment!...",
    },
    expectedClassification: "RECEIPT",
    expectedAmount: 2500.0,
  },
  {
    name: "Venmo payment notification",
    email: {
      messageId: "receipt-3",
      threadId: null,
      subject: "Emily Ross paid you $500.00",
      from: "venmo@venmo.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-08"),
      body: `Venmo

Emily Ross paid you $500.00

Note: "Engagement session deposit"

Your new Venmo balance: $2,345.00

View on Venmo: https://venmo.com/transaction/12345

Thanks,
The Venmo Team`,
      htmlBody: null,
      snippet: "Venmo Emily Ross paid you $500.00...",
    },
    expectedClassification: "RECEIPT",
    expectedAmount: 500.0,
  },
  {
    name: "Square invoice payment",
    email: {
      messageId: "receipt-4",
      threadId: "thread-corporate",
      subject: "Invoice #1234 has been paid",
      from: "receipts@squareup.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `Square

Payment Received

Invoice #1234 has been paid!

Customer: Acme Corporation
Amount Paid: $3,750.00
Payment Method: Card ending in 1234
Date: January 10, 2026

Invoice Details:
- Corporate Headshots (25 employees) - $3,500.00
- On-site setup fee - $250.00
- Total: $3,750.00

View receipt: https://squareup.com/receipt/ABC123

Need help? Visit squareup.com/help

Thanks for using Square!`,
      htmlBody: null,
      snippet: "Square Payment Received Invoice #1234 has been paid!...",
    },
    expectedClassification: "RECEIPT",
    expectedAmount: 3750.0,
  },
  {
    name: "Direct bank transfer confirmation",
    email: {
      messageId: "receipt-5",
      threadId: null,
      subject: "Wire Transfer Received - $8,500.00",
      from: "notifications@bankofamerica.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-07"),
      body: `Bank of America

Wire Transfer Received

A wire transfer has been deposited to your account.

Account: Business Checking (...4567)
Amount: $8,500.00
From: Community Foundation
Reference: Charity Gala Photography
Date: January 7, 2026

Current Available Balance: $15,234.56

Thank you for banking with Bank of America.

This is an automated message. Please do not reply.`,
      htmlBody: null,
      snippet: "Bank of America Wire Transfer Received...",
    },
    expectedClassification: "RECEIPT",
    expectedAmount: 8500.0,
  },
  {
    name: "Zelle payment received",
    email: {
      messageId: "receipt-6",
      threadId: null,
      subject: "You received $750.00 from Jennifer Martinez",
      from: "zelle@alerts.chase.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-06"),
      body: `Chase | Zelle

Jennifer Martinez sent you $750.00

The money has been deposited directly into your Chase checking account ending in 1234.

Memo: "Maternity session balance"

Transaction ID: ZL123456789
Date: January 6, 2026

Questions? Call 1-800-935-9935

Chase Bank
Member FDIC`,
      htmlBody: null,
      snippet: "Chase | Zelle Jennifer Martinez sent you $750.00...",
    },
    expectedClassification: "RECEIPT",
    expectedAmount: 750.0,
  },
];

/**
 * Expected Gemini response for a receipt email
 */
export const mockReceiptResponse: ClassificationResult = {
  classification: "RECEIPT",
  confidence: 0.97,
  sender: {
    email: "payments@stripe.com",
    name: null,
    company: "Stripe",
    jobTitle: null,
  },
  financial: {
    amount: 1500.0,
    currency: "USD",
    documentNumber: "pi_3ABC123DEF456",
    documentDate: "2026-01-10",
    dueDate: null,
  },
  dates: {
    eventDate: "2026-06-15",
    deadlineDate: null,
    mentionedDates: [
      { date: "2026-06-15", context: "wedding date" },
    ],
  },
  projectType: "WEDDING",
  projectReferences: ["Wedding Photography Deposit - June 15, 2026"],
  isUrgent: false,
  urgencyIndicators: [],
  summary:
    "Payment received via Stripe for wedding photography deposit. Sarah Johnson paid $1,500.00 for June 15, 2026 wedding. Net amount after 3.37% fee is $1,449.50.",
  suggestedAction: "Update project payment status and send deposit confirmation email to client",
};

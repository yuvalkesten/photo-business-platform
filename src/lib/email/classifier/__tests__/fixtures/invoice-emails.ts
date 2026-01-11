/**
 * Invoice Email Test Fixtures
 *
 * Sample emails that should be classified as INVOICE.
 * These represent bills and invoices from suppliers/vendors.
 */

import { EmailContent, ClassificationResult } from "../../types";

export interface InvoiceTestCase {
  name: string;
  email: EmailContent;
  expectedClassification: "INVOICE";
  expectedAmount: number | null;
  expectedVendor: string | null;
}

export const invoiceEmails: InvoiceTestCase[] = [
  {
    name: "Camera equipment invoice",
    email: {
      messageId: "invoice-1",
      threadId: null,
      subject: "Invoice #12345 - Camera Equipment Order",
      from: "billing@bhphoto.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `Invoice #12345

From: B&H Photo Video
123 Camera Street
New York, NY 10001

Bill To: Professional Photography Studio

Date: January 10, 2026
Due Date: January 25, 2026

Items:
1x Sony A7IV Camera Body - $2,499.00
2x Sony 24-70mm f/2.8 GM II - $4,598.00
1x Peak Design Camera Strap - $69.00

Subtotal: $7,166.00
Tax (8.875%): $635.99
Shipping: $0.00

Total Due: $7,801.99

Payment Terms: Net 15
Please remit payment to the address above or pay online at bhphoto.com/pay

Thank you for your business!`,
      htmlBody: null,
      snippet: "Invoice #12345 From: B&H Photo Video...",
    },
    expectedClassification: "INVOICE",
    expectedAmount: 7801.99,
    expectedVendor: "B&H Photo Video",
  },
  {
    name: "Printing services invoice",
    email: {
      messageId: "invoice-2",
      threadId: null,
      subject: "Your Miller's Lab Invoice - Order #98765",
      from: "invoices@millerslab.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-08"),
      body: `Miller's Professional Imaging
Invoice

Order Number: 98765
Invoice Date: 01/08/2026
Due Date: 02/08/2026

Customer: John Smith Photography

Description                          Qty    Price      Total
-----------------------------------------------------------
16x20 Lustre Prints                   5    $24.00    $120.00
8x10 Lustre Prints                   20     $6.00    $120.00
5x7 Lustre Prints                    50     $2.50    $125.00
Wedding Album 12x12                   1   $450.00    $450.00
-----------------------------------------------------------
                              Subtotal:              $815.00
                              Shipping:               $45.00
                              TOTAL DUE:             $860.00

Pay online at millerslab.com or call 1-800-555-LABS

Thank you for your order!`,
      htmlBody: null,
      snippet: "Miller's Professional Imaging Invoice Order Number: 98765...",
    },
    expectedClassification: "INVOICE",
    expectedAmount: 860.0,
    expectedVendor: "Miller's Professional Imaging",
  },
  {
    name: "Software subscription invoice",
    email: {
      messageId: "invoice-3",
      threadId: null,
      subject: "Adobe Creative Cloud - Invoice #CC-2026-001234",
      from: "billing@adobe.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-01"),
      body: `Adobe Systems Incorporated
Invoice

Invoice Number: CC-2026-001234
Invoice Date: January 1, 2026
Due Upon Receipt

Account: photographer@studio.com

Creative Cloud Photography Plan (Annual)
Includes: Lightroom, Photoshop, 20GB Cloud Storage
Billing Period: Jan 1, 2026 - Dec 31, 2026

Amount: $119.88

Payment Method: Visa ending in 4242

This invoice has been paid automatically. Thank you for your subscription!

Questions? Visit helpx.adobe.com`,
      htmlBody: null,
      snippet: "Adobe Systems Incorporated Invoice...",
    },
    expectedClassification: "INVOICE",
    expectedAmount: 119.88,
    expectedVendor: "Adobe Systems Incorporated",
  },
  {
    name: "Venue rental invoice",
    email: {
      messageId: "invoice-4",
      threadId: null,
      subject: "Studio Rental Invoice - December 2025",
      from: "accounts@studiospace.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-05"),
      body: `StudioSpace Rentals
789 Art District
Los Angeles, CA 90012

INVOICE

To: Creative Photography LLC
Invoice #: SS-2025-1234
Date: January 5, 2026
Due: January 20, 2026

Studio Rental - December 2025
Cyc Wall Studio (8 hours x 4 days)
Rate: $75/hour

32 hours @ $75 = $2,400.00

Additional Charges:
- Equipment rental (strobes): $200.00
- Seamless paper: $45.00

Total: $2,645.00

Wire transfer details:
Bank: First National
Account: 1234567890
Routing: 021000021`,
      htmlBody: null,
      snippet: "StudioSpace Rentals INVOICE To: Creative Photography LLC...",
    },
    expectedClassification: "INVOICE",
    expectedAmount: 2645.0,
    expectedVendor: "StudioSpace Rentals",
  },
  {
    name: "Equipment repair invoice",
    email: {
      messageId: "invoice-5",
      threadId: "thread-repair",
      subject: "Re: Lens Repair Complete - Invoice Attached",
      from: "service@camerarepairs.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-09"),
      body: `Hi,

Your lens repair is complete and ready for pickup!

Invoice Details:
Invoice #: REP-2026-0042
Date: 01/09/2026

Canon EF 70-200mm f/2.8L IS III
- Diagnosis & inspection: $50.00
- AF motor replacement: $275.00
- Calibration: $75.00
- Labor: $150.00

Total Due: $550.00

Payment due upon pickup. We accept cash, check, or card.

Service Center Address:
Camera Repairs Inc
456 Tech Lane
San Francisco, CA 94102

Hours: Mon-Fri 9am-6pm

Thanks,
Camera Repairs Team`,
      htmlBody: null,
      snippet: "Hi, Your lens repair is complete and ready for pickup!...",
    },
    expectedClassification: "INVOICE",
    expectedAmount: 550.0,
    expectedVendor: "Camera Repairs Inc",
  },
];

/**
 * Expected Gemini response for an invoice email
 */
export const mockInvoiceResponse: ClassificationResult = {
  classification: "INVOICE",
  confidence: 0.98,
  sender: {
    email: "billing@bhphoto.com",
    name: null,
    company: "B&H Photo Video",
    jobTitle: null,
  },
  financial: {
    amount: 7801.99,
    currency: "USD",
    documentNumber: "12345",
    documentDate: "2026-01-10",
    dueDate: "2026-01-25",
  },
  dates: {
    eventDate: null,
    deadlineDate: "2026-01-25",
    mentionedDates: [
      { date: "2026-01-10", context: "invoice date" },
      { date: "2026-01-25", context: "payment due date" },
    ],
  },
  projectType: null,
  projectReferences: [],
  isUrgent: false,
  urgencyIndicators: [],
  summary:
    "Invoice from B&H Photo Video for camera equipment order including Sony A7IV camera body and lenses. Total amount due is $7,801.99 with payment due by January 25, 2026.",
  suggestedAction: "Review invoice and schedule payment before January 25th due date",
};

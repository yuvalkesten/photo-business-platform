/**
 * Urgent Request Email Test Fixtures
 *
 * Sample emails that should be classified as URGENT_REQUEST.
 * These represent time-sensitive requests requiring immediate attention.
 */

import { EmailContent, ClassificationResult } from "../../types";

export interface UrgentTestCase {
  name: string;
  email: EmailContent;
  expectedClassification: "URGENT_REQUEST";
  expectedUrgencyIndicators: string[];
}

export const urgentEmails: UrgentTestCase[] = [
  {
    name: "ASAP request for additional photos",
    email: {
      messageId: "urgent-1",
      threadId: "thread-123",
      subject: "URGENT: Need additional photos ASAP",
      from: "Sarah Johnson <sarah.johnson@email.com>",
      to: "photographer@studio.com",
      date: new Date("2026-01-10T14:30:00"),
      body: `Hi,

I'm so sorry to bother you but I need your help ASAP!

My printer just called and they need 3 more photos for the wedding album by tomorrow morning or we'll miss the deadline for the anniversary gift.

Can you please send over any other good shots from the ceremony? I really need these by end of day today if possible.

URGENT - please call me at 555-1234

Thanks so much,
Sarah`,
      htmlBody: null,
      snippet: "Hi, I'm so sorry to bother you but I need your help ASAP!...",
    },
    expectedClassification: "URGENT_REQUEST",
    expectedUrgencyIndicators: ["URGENT", "ASAP", "deadline", "tomorrow", "end of day today"],
  },
  {
    name: "Last minute venue change",
    email: {
      messageId: "urgent-2",
      threadId: "thread-456",
      subject: "HELP - Venue changed for Saturday!!",
      from: "Mike Chen <mike.chen@gmail.com>",
      to: "photographer@studio.com",
      date: new Date("2026-01-08T09:15:00"),
      body: `Emergency situation!

Our original venue just cancelled on us. The wedding is this Saturday and we had to find a new location.

New venue: Sunset Gardens, 456 Beach Rd
Same time: 4pm ceremony

PLEASE confirm you can still make it! We're freaking out!!

Mike`,
      htmlBody: null,
      snippet: "Emergency situation! Our original venue just cancelled on us...",
    },
    expectedClassification: "URGENT_REQUEST",
    expectedUrgencyIndicators: ["Emergency", "this Saturday", "PLEASE confirm"],
  },
  {
    name: "Same-day photo request",
    email: {
      messageId: "urgent-3",
      threadId: null,
      subject: "Need photos TODAY for obituary",
      from: "Jennifer Martinez <jmartinez@acmecorp.com>",
      to: "info@photostudio.com",
      date: new Date("2026-01-09T11:00:00"),
      body: `Hi,

I hate to ask but we have an emergency. One of our executives passed away unexpectedly and the family needs a professional headshot for the obituary.

The newspaper deadline is 5pm TODAY. You did his headshots last year - do you still have them?

If you could send whatever you have as soon as possible, I would be so grateful.

Jennifer`,
      htmlBody: null,
      snippet: "Hi, I hate to ask but we have an emergency...",
    },
    expectedClassification: "URGENT_REQUEST",
    expectedUrgencyIndicators: ["emergency", "TODAY", "deadline", "5pm", "as soon as possible"],
  },
  {
    name: "Rush delivery request",
    email: {
      messageId: "urgent-4",
      threadId: "thread-789",
      subject: "Can we rush the edits?? Leaving country Friday",
      from: "David Park <dpark@startup.io>",
      to: "hello@portraits.com",
      date: new Date("2026-01-07T16:45:00"),
      body: `Hey!

I know we just did the headshot session yesterday but I just found out I'm flying out Friday for 6 months!

Is there ANY way you could get me at least a few edited photos before I leave? I really need them for my visa application.

I'm willing to pay extra for rush delivery. Please let me know!

David`,
      htmlBody: null,
      snippet: "Hey! I know we just did the headshot session yesterday but I just found out...",
    },
    expectedClassification: "URGENT_REQUEST",
    expectedUrgencyIndicators: ["rush", "Friday", "before I leave", "extra for rush"],
  },
  {
    name: "Time-sensitive gallery extension",
    email: {
      messageId: "urgent-5",
      threadId: "thread-234",
      subject: "Gallery expires tomorrow - need more time!",
      from: "Emily Ross <emily.ross@company.com>",
      to: "photographer@studio.com",
      date: new Date("2026-01-10T20:00:00"),
      body: `Hi,

I just realized our wedding gallery expires tomorrow and we haven't finished downloading everything!

My husband has been traveling and we've been so busy. Is there any way you can extend the gallery for another week? We really don't want to lose access to our photos.

Please let me know ASAP!

Emily`,
      htmlBody: null,
      snippet: "Hi, I just realized our wedding gallery expires tomorrow...",
    },
    expectedClassification: "URGENT_REQUEST",
    expectedUrgencyIndicators: ["expires tomorrow", "ASAP"],
  },
];

/**
 * Expected Gemini response for an urgent request
 */
export const mockUrgentResponse: ClassificationResult = {
  classification: "URGENT_REQUEST",
  confidence: 0.92,
  sender: {
    email: "sarah.johnson@email.com",
    name: "Sarah Johnson",
    company: null,
    jobTitle: null,
  },
  financial: null,
  dates: {
    eventDate: null,
    deadlineDate: "2026-01-11",
    mentionedDates: [
      { date: "2026-01-11", context: "printer deadline for wedding album" },
    ],
  },
  projectType: "WEDDING",
  projectReferences: ["wedding album"],
  isUrgent: true,
  urgencyIndicators: ["URGENT", "ASAP", "deadline", "tomorrow morning", "end of day today"],
  summary:
    "Client urgently needs 3 additional ceremony photos for wedding album. Printer deadline is tomorrow morning. Client available at 555-1234.",
  suggestedAction: "Call client immediately at 555-1234 and send ceremony photos before end of day",
};

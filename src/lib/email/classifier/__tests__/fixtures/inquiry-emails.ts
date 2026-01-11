/**
 * Inquiry Email Test Fixtures
 *
 * Sample emails that should be classified as INQUIRY.
 * These represent potential clients asking about photography services.
 */

import { EmailContent, ClassificationResult } from "../../types";

export interface InquiryTestCase {
  name: string;
  email: EmailContent;
  expectedClassification: "INQUIRY";
  expectedProjectType: string | null;
  expectedHasEventDate: boolean;
}

export const inquiryEmails: InquiryTestCase[] = [
  {
    name: "Wedding inquiry with specific date",
    email: {
      messageId: "inquiry-1",
      threadId: null,
      subject: "Wedding Photography Inquiry - June 2026",
      from: "Sarah Johnson <sarah.johnson@email.com>",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `Hi,

My fiance and I are getting married on June 15th, 2026 at The Grand Estate in Napa Valley.
We found your work on Instagram and absolutely love your style!

We're looking for full-day coverage and possibly an engagement session beforehand.
Our budget is around $5,000-$7,000.

Could you let us know your availability and packages?

Thanks,
Sarah Johnson
Event Coordinator at TechCorp`,
      htmlBody: null,
      snippet: "Hi, My fiance and I are getting married...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "WEDDING",
    expectedHasEventDate: true,
  },
  {
    name: "Portrait session inquiry",
    email: {
      messageId: "inquiry-2",
      threadId: null,
      subject: "Family Portrait Session",
      from: "Mike Chen <mike.chen@gmail.com>",
      to: "hello@photographystudio.com",
      date: new Date("2026-01-08"),
      body: `Hello!

I'm looking for a photographer for family portraits. We have 2 kids (ages 5 and 8) and would love to do an outdoor session, maybe at a park or beach.

Do you have availability in the next few weeks? What are your rates for a 1-2 hour session?

Thanks,
Mike`,
      htmlBody: null,
      snippet: "Hello! I'm looking for a photographer for family portraits...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "FAMILY",
    expectedHasEventDate: false,
  },
  {
    name: "Corporate headshots inquiry",
    email: {
      messageId: "inquiry-3",
      threadId: null,
      subject: "Corporate Headshots for Our Team",
      from: "Jennifer Martinez <jmartinez@acmecorp.com>",
      to: "info@photostudio.com",
      date: new Date("2026-01-09"),
      body: `Good morning,

I'm the HR Director at Acme Corporation and we're looking to update our team headshots for our new website.

We have approximately 25 employees who need professional headshots. Ideally, we'd like to do this at our office in downtown on February 10th or 11th.

Could you provide a quote and let us know your availability?

Best regards,
Jennifer Martinez
HR Director
Acme Corporation`,
      htmlBody: null,
      snippet: "Good morning, I'm the HR Director at Acme Corporation...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "CORPORATE",
    expectedHasEventDate: true,
  },
  {
    name: "Engagement session inquiry",
    email: {
      messageId: "inquiry-4",
      threadId: null,
      subject: "Engagement Photos",
      from: "Lisa Wong <lisawong22@yahoo.com>",
      to: "bookings@photostudio.com",
      date: new Date("2026-01-07"),
      body: `Hi there,

My boyfriend just proposed last weekend and we're looking for a photographer to capture some engagement photos! We're thinking sometime in March when the cherry blossoms are out.

We love your natural, candid style. Do you have any spring availability?

Lisa`,
      htmlBody: null,
      snippet: "Hi there, My boyfriend just proposed last weekend...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "ENGAGEMENT",
    expectedHasEventDate: false,
  },
  {
    name: "Newborn photography inquiry",
    email: {
      messageId: "inquiry-5",
      threadId: null,
      subject: "Newborn Photography Session",
      from: "Amanda Roberts <amanda.r@outlook.com>",
      to: "hello@babyphotographer.com",
      date: new Date("2026-01-10"),
      body: `Hello,

I'm expecting my first baby in March and I'd love to book a newborn photography session. I've heard it's best to do these within the first two weeks after birth.

Can you tell me more about your packages and how far in advance I should book?

Thank you!
Amanda Roberts`,
      htmlBody: null,
      snippet: "Hello, I'm expecting my first baby in March...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "NEWBORN",
    expectedHasEventDate: false,
  },
  {
    name: "Event photography inquiry",
    email: {
      messageId: "inquiry-6",
      threadId: null,
      subject: "Photographer needed for charity gala",
      from: "David Thompson <dthompson@charityfoundation.org>",
      to: "contact@eventphotography.com",
      date: new Date("2026-01-06"),
      body: `Dear Photographer,

Our foundation is hosting our annual charity gala on April 20th, 2026 at the Hilton Downtown. We're expecting around 200 guests and need a photographer to cover the event from 6pm to 11pm.

We need photos of:
- Guest arrivals
- Award ceremony
- Dinner and dancing
- Group photos

Please let me know your rates and availability.

David Thompson
Events Director
Community Foundation`,
      htmlBody: null,
      snippet: "Dear Photographer, Our foundation is hosting our annual charity gala...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "EVENT",
    expectedHasEventDate: true,
  },
  {
    name: "Hebrew language inquiry",
    email: {
      messageId: "inquiry-7",
      threadId: null,
      subject: "בקשה לצילום חתונה",
      from: "רונית לוי <ronit.levi@gmail.com>",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `שלום,

אני מחפשת צלם לחתונה שלנו שתתקיים ב-15 באוגוסט 2026.
ראיתי את העבודות שלך ואהבתי מאוד את הסגנון.

האם אתה פנוי בתאריך הזה? מה המחירים שלך?

תודה רבה,
רונית`,
      htmlBody: null,
      snippet: "שלום, אני מחפשת צלם לחתונה שלנו...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "WEDDING",
    expectedHasEventDate: true,
  },
  {
    name: "Spanish language inquiry",
    email: {
      messageId: "inquiry-8",
      threadId: null,
      subject: "Consulta sobre sesion de fotos",
      from: "Maria Garcia <maria.garcia@hotmail.com>",
      to: "info@fotografia.com",
      date: new Date("2026-01-09"),
      body: `Hola,

Estoy interesada en una sesion de fotos para mi quinceanera el 5 de mayo.
Quisiera saber sus precios y si tienen disponibilidad.

Gracias,
Maria Garcia`,
      htmlBody: null,
      snippet: "Hola, Estoy interesada en una sesion de fotos...",
    },
    expectedClassification: "INQUIRY",
    expectedProjectType: "EVENT",
    expectedHasEventDate: true,
  },
];

/**
 * Expected Gemini response for a wedding inquiry
 */
export const mockWeddingInquiryResponse: ClassificationResult = {
  classification: "INQUIRY",
  confidence: 0.95,
  sender: {
    email: "sarah.johnson@email.com",
    name: "Sarah Johnson",
    company: "TechCorp",
    jobTitle: "Event Coordinator",
  },
  financial: null,
  dates: {
    eventDate: "2026-06-15",
    deadlineDate: null,
    mentionedDates: [
      { date: "2026-06-15", context: "wedding date at The Grand Estate" },
    ],
  },
  projectType: "WEDDING",
  projectReferences: [],
  isUrgent: false,
  urgencyIndicators: [],
  summary:
    "Potential client inquiring about wedding photography for June 15th, 2026 at The Grand Estate in Napa Valley. Looking for full-day coverage and engagement session. Budget is $5,000-$7,000.",
  suggestedAction: "Check availability for June 15th, 2026 and send wedding package information",
};

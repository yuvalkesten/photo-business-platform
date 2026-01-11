/**
 * Classification Prompt Templates
 *
 * Prompts for the Gemini API to classify emails and extract structured data.
 * The prompt is designed to return JSON that can be parsed into ClassificationResult.
 */

import { EmailContent } from "./types";

/**
 * Build the classification prompt for a given email.
 *
 * This prompt instructs Gemini to:
 * 1. Classify the email into one of the predefined categories
 * 2. Extract structured data (sender info, financial data, dates)
 * 3. Determine urgency and project type
 * 4. Generate a summary and suggested action
 */
export function buildClassificationPrompt(email: EmailContent): string {
  const dateStr = email.date.toISOString();

  return `You are an email classifier for a photography business. Analyze the following email and return a JSON response with classification and extracted data.

EMAIL DETAILS:
==============
Subject: ${email.subject}
From: ${email.from}
To: ${email.to}
Date: ${dateStr}
Body:
${email.body}
==============

CLASSIFICATION CATEGORIES:
1. INQUIRY - New business inquiry from potential client asking about photography services (weddings, portraits, events, etc.)
2. URGENT_REQUEST - Time-sensitive request from existing contact requiring immediate attention (deadline changes, urgent questions, same-day requests)
3. INVOICE - Invoice or bill from a supplier/vendor for services, equipment, or products
4. RECEIPT - Payment confirmation or receipt from a client for your photography services
5. OTHER - Newsletters, spam, automated notifications, marketing emails, or unrelated emails

CLASSIFICATION RULES:
- If the email is asking about photography services, pricing, availability, or booking → INQUIRY
- If the email mentions "urgent", "ASAP", "immediately", tight deadlines, or requires quick response → consider URGENT_REQUEST
- If the email contains an invoice number, amount due, payment terms → INVOICE
- If the email confirms a payment received, transaction completed → RECEIPT
- If none of the above apply clearly → OTHER

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown code blocks, no explanation, just raw JSON):
{
  "classification": "INQUIRY|URGENT_REQUEST|INVOICE|RECEIPT|OTHER",
  "confidence": 0.0-1.0,
  "sender": {
    "email": "extracted email address",
    "name": "extracted full name or null",
    "company": "extracted company/organization name or null",
    "jobTitle": "extracted job title or null"
  },
  "financial": {
    "amount": null or number (e.g., 1500.00),
    "currency": "USD",
    "documentNumber": "invoice/receipt number or null",
    "documentDate": "YYYY-MM-DD or null",
    "dueDate": "YYYY-MM-DD or null"
  },
  "dates": {
    "eventDate": "YYYY-MM-DD or null (the date of the photography event)",
    "deadlineDate": "YYYY-MM-DD or null (any deadline mentioned)",
    "mentionedDates": [{"date": "YYYY-MM-DD", "context": "brief context for this date"}]
  },
  "projectType": "WEDDING|ENGAGEMENT|PORTRAIT|FAMILY|NEWBORN|CORPORATE|EVENT|COMMERCIAL|REAL_ESTATE|OTHER or null",
  "projectReferences": ["any project or event names mentioned"],
  "isUrgent": true or false,
  "urgencyIndicators": ["list of words/phrases indicating urgency found in email"],
  "summary": "2-3 sentence summary of the email content and intent",
  "suggestedAction": "recommended next action to take (e.g., 'Send pricing guide', 'Schedule consultation call', 'Review invoice for payment')"
}

IMPORTANT:
- For financial.amount, extract the main amount mentioned (total, amount due, payment amount)
- For dates, use YYYY-MM-DD format or null if not mentioned
- Set isUrgent to true only if there are clear urgency indicators
- projectType should match one of the enum values or be null if not a photography inquiry
- Be conservative with confidence - use 0.7+ only when classification is clear`;
}

/**
 * Build a simpler prompt for quick classification (no data extraction).
 * Useful for batch processing or when full extraction isn't needed.
 */
export function buildQuickClassificationPrompt(
  subject: string,
  snippet: string
): string {
  return `Classify this email for a photography business. Return ONLY one word: INQUIRY, URGENT_REQUEST, INVOICE, RECEIPT, or OTHER.

Subject: ${subject}
Preview: ${snippet}

Classification:`;
}

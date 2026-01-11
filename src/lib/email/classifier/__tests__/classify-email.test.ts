/**
 * Email Classification Tests
 *
 * Unit tests for the email classifier with mocked Gemini API responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { classifyEmail, parseEmailAddress } from "../classify-email";
import {
  inquiryEmails,
  mockWeddingInquiryResponse,
} from "./fixtures/inquiry-emails";
import { urgentEmails, mockUrgentResponse } from "./fixtures/urgent-emails";
import { invoiceEmails, mockInvoiceResponse } from "./fixtures/invoice-emails";
import { receiptEmails, mockReceiptResponse } from "./fixtures/receipt-emails";
import { otherEmails } from "./fixtures/other-emails";
import { ClassificationError } from "../types";

// Mock the Gemini client
vi.mock("../gemini-client", () => ({
  classifyWithGemini: vi.fn(),
  resetGeminiClient: vi.fn(),
}));

import { classifyWithGemini } from "../gemini-client";

const mockedClassifyWithGemini = vi.mocked(classifyWithGemini);

describe("classifyEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Inquiry Detection", () => {
    it("correctly classifies a wedding inquiry", async () => {
      // Return mock response
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockWeddingInquiryResponse)
      );

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.classification).toBe("INQUIRY");
      expect(result.projectType).toBe("WEDDING");
      expect(result.dates.eventDate).toBe("2026-06-15");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("extracts sender information correctly", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockWeddingInquiryResponse)
      );

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.sender.email).toBe("sarah.johnson@email.com");
      expect(result.sender.name).toBe("Sarah Johnson");
      expect(result.sender.company).toBe("TechCorp");
    });

    it("handles corporate inquiry", async () => {
      const corporateResponse = {
        ...mockWeddingInquiryResponse,
        classification: "INQUIRY",
        projectType: "CORPORATE",
        sender: {
          email: "jmartinez@acmecorp.com",
          name: "Jennifer Martinez",
          company: "Acme Corporation",
          jobTitle: "HR Director",
        },
        dates: {
          eventDate: "2026-02-10",
          deadlineDate: null,
          mentionedDates: [],
        },
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(corporateResponse)
      );

      const corporateEmail = inquiryEmails.find(
        (e) => e.name === "Corporate headshots inquiry"
      );
      const result = await classifyEmail(corporateEmail!.email);

      expect(result.classification).toBe("INQUIRY");
      expect(result.projectType).toBe("CORPORATE");
      expect(result.sender.company).toBe("Acme Corporation");
    });
  });

  describe("Urgent Request Detection", () => {
    it("correctly classifies an urgent request", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockUrgentResponse)
      );

      const result = await classifyEmail(urgentEmails[0].email);

      expect(result.classification).toBe("URGENT_REQUEST");
      expect(result.isUrgent).toBe(true);
      expect(result.urgencyIndicators.length).toBeGreaterThan(0);
    });

    it("detects urgency indicators", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockUrgentResponse)
      );

      const result = await classifyEmail(urgentEmails[0].email);

      expect(result.urgencyIndicators).toContain("URGENT");
      expect(result.urgencyIndicators).toContain("ASAP");
    });
  });

  describe("Invoice Detection", () => {
    it("correctly classifies an invoice", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockInvoiceResponse)
      );

      const result = await classifyEmail(invoiceEmails[0].email);

      expect(result.classification).toBe("INVOICE");
      expect(result.financial).not.toBeNull();
    });

    it("extracts financial information", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockInvoiceResponse)
      );

      const result = await classifyEmail(invoiceEmails[0].email);

      expect(result.financial?.amount).toBe(7801.99);
      expect(result.financial?.currency).toBe("USD");
      expect(result.financial?.documentNumber).toBe("12345");
      expect(result.financial?.dueDate).toBe("2026-01-25");
    });
  });

  describe("Receipt Detection", () => {
    it("correctly classifies a receipt", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockReceiptResponse)
      );

      const result = await classifyEmail(receiptEmails[0].email);

      expect(result.classification).toBe("RECEIPT");
      expect(result.financial?.amount).toBe(1500.0);
    });

    it("extracts payment information", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(mockReceiptResponse)
      );

      const result = await classifyEmail(receiptEmails[0].email);

      expect(result.financial?.documentNumber).toBe("pi_3ABC123DEF456");
      expect(result.projectReferences.length).toBeGreaterThan(0);
    });
  });

  describe("Other Classification", () => {
    it("classifies newsletters as OTHER", async () => {
      const otherResponse = {
        classification: "OTHER",
        confidence: 0.9,
        sender: {
          email: "newsletter@photographyblog.com",
          name: null,
          company: "Photography Blog",
          jobTitle: null,
        },
        financial: null,
        dates: {
          eventDate: null,
          deadlineDate: null,
          mentionedDates: [],
        },
        projectType: null,
        projectReferences: [],
        isUrgent: false,
        urgencyIndicators: [],
        summary: "Photography tips newsletter with portrait advice",
        suggestedAction: "Archive or ignore",
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(otherResponse)
      );

      const result = await classifyEmail(otherEmails[0].email);

      expect(result.classification).toBe("OTHER");
    });

    it("classifies spam as OTHER", async () => {
      const spamResponse = {
        classification: "OTHER",
        confidence: 0.99,
        sender: {
          email: "winner@lotteryprize.xyz",
          name: null,
          company: null,
          jobTitle: null,
        },
        financial: null,
        dates: {
          eventDate: null,
          deadlineDate: null,
          mentionedDates: [],
        },
        projectType: null,
        projectReferences: [],
        isUrgent: false,
        urgencyIndicators: [],
        summary: "Obvious spam/scam email about lottery winnings",
        suggestedAction: "Mark as spam and delete",
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(spamResponse)
      );

      const spamEmail = otherEmails.find(
        (e) => e.name === "Spam - lottery winner"
      );
      const result = await classifyEmail(spamEmail!.email);

      expect(result.classification).toBe("OTHER");
    });
  });

  describe("Response Parsing", () => {
    it("handles markdown-wrapped JSON", async () => {
      const markdownResponse = `\`\`\`json
${JSON.stringify(mockWeddingInquiryResponse)}
\`\`\``;

      mockedClassifyWithGemini.mockResolvedValueOnce(markdownResponse);

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.classification).toBe("INQUIRY");
    });

    it("handles extra whitespace", async () => {
      const whitespacedResponse = `

      ${JSON.stringify(mockWeddingInquiryResponse)}

      `;

      mockedClassifyWithGemini.mockResolvedValueOnce(whitespacedResponse);

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.classification).toBe("INQUIRY");
    });
  });

  describe("Error Handling", () => {
    it("throws on invalid JSON response", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce("not valid json");

      await expect(classifyEmail(inquiryEmails[0].email)).rejects.toThrow(
        ClassificationError
      );
    });

    it("throws with PARSE_ERROR code for invalid JSON", async () => {
      mockedClassifyWithGemini.mockResolvedValueOnce("{invalid}");

      try {
        await classifyEmail(inquiryEmails[0].email);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ClassificationError);
        expect((error as ClassificationError).code).toBe("PARSE_ERROR");
      }
    });

    it("handles API errors gracefully", async () => {
      mockedClassifyWithGemini.mockRejectedValueOnce(
        new ClassificationError("API error", "API_ERROR")
      );

      await expect(classifyEmail(inquiryEmails[0].email)).rejects.toThrow(
        ClassificationError
      );
    });
  });

  describe("Validation", () => {
    it("normalizes invalid classification to OTHER", async () => {
      const invalidResponse = {
        ...mockWeddingInquiryResponse,
        classification: "INVALID_TYPE",
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(invalidResponse)
      );

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.classification).toBe("OTHER");
    });

    it("clamps confidence to 0-1 range", async () => {
      const overConfidentResponse = {
        ...mockWeddingInquiryResponse,
        confidence: 1.5,
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(overConfidentResponse)
      );

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.confidence).toBe(1);
    });

    it("handles missing optional fields", async () => {
      const minimalResponse = {
        classification: "INQUIRY",
        confidence: 0.8,
        sender: {
          email: "test@test.com",
        },
        summary: "Test summary",
        suggestedAction: "Test action",
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(minimalResponse)
      );

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.classification).toBe("INQUIRY");
      expect(result.financial).toBeNull();
      expect(result.dates.eventDate).toBeNull();
      expect(result.projectReferences).toEqual([]);
    });

    it("validates date format", async () => {
      const invalidDateResponse = {
        ...mockWeddingInquiryResponse,
        dates: {
          eventDate: "not-a-date",
          deadlineDate: "2026/01/15", // Wrong format
          mentionedDates: [],
        },
      };

      mockedClassifyWithGemini.mockResolvedValueOnce(
        JSON.stringify(invalidDateResponse)
      );

      const result = await classifyEmail(inquiryEmails[0].email);

      expect(result.dates.eventDate).toBeNull();
      expect(result.dates.deadlineDate).toBeNull();
    });
  });
});

describe("parseEmailAddress", () => {
  it("parses name and email from standard format", () => {
    const result = parseEmailAddress("John Doe <john@example.com>");

    expect(result.email).toBe("john@example.com");
    expect(result.name).toBe("John Doe");
  });

  it("handles quoted names", () => {
    const result = parseEmailAddress('"John Doe" <john@example.com>');

    expect(result.email).toBe("john@example.com");
    expect(result.name).toBe("John Doe");
  });

  it("handles email only", () => {
    const result = parseEmailAddress("john@example.com");

    expect(result.email).toBe("john@example.com");
    expect(result.name).toBeNull();
  });

  it("normalizes email to lowercase", () => {
    const result = parseEmailAddress("John.DOE@Example.COM");

    expect(result.email).toBe("john.doe@example.com");
  });

  it("handles complex names", () => {
    const result = parseEmailAddress(
      "Dr. Jane Smith-Johnson <jane@hospital.org>"
    );

    expect(result.email).toBe("jane@hospital.org");
    expect(result.name).toBe("Dr. Jane Smith-Johnson");
  });
});

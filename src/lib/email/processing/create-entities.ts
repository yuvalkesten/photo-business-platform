/**
 * Entity Creation from Email Classification
 *
 * Automatically creates CRM entities based on email classification results:
 * - INQUIRY: Create Contact (LEAD) + Project (INQUIRY status)
 * - URGENT_REQUEST: Find existing contact/project, add urgent note
 * - INVOICE: Create FinancialDocument (INVOICE type)
 * - RECEIPT: Create FinancialDocument (RECEIPT type)
 */

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  ContactType,
  ContactStatus,
  ProjectStatus,
  ProjectType,
  DocumentType,
  DocumentStatus,
  LeadTemperature,
} from "@prisma/client";
import { ClassificationResult, EmailContent } from "../classifier";

/**
 * Create entities based on email classification.
 *
 * @param userId - The user ID
 * @param processedEmailId - The processed email record ID
 * @param result - The classification result
 * @param email - The original email content
 */
export async function createEntitiesFromClassification(
  userId: string,
  processedEmailId: string,
  result: ClassificationResult,
  email: EmailContent
): Promise<void> {
  switch (result.classification) {
    case "INQUIRY":
      await handleInquiry(userId, processedEmailId, result);
      break;
    case "URGENT_REQUEST":
      await handleUrgentRequest(userId, processedEmailId, result);
      break;
    case "INVOICE":
      await handleInvoice(userId, processedEmailId, result);
      break;
    case "RECEIPT":
      await handleReceipt(userId, processedEmailId, result);
      break;
  }
}

/**
 * Handle inquiry emails: Create Contact + Project
 */
async function handleInquiry(
  userId: string,
  processedEmailId: string,
  result: ClassificationResult
): Promise<void> {
  const { sender, dates, projectType, summary, suggestedAction } = result;

  // Check if contact already exists
  let contact = await prisma.contact.findUnique({
    where: {
      userId_email: {
        userId,
        email: sender.email,
      },
    },
  });

  // Create contact if new
  if (!contact) {
    const nameParts = parseName(sender.name);

    contact = await prisma.contact.create({
      data: {
        userId,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: sender.email,
        jobTitle: sender.jobTitle,
        type: ContactType.LEAD,
        source: "EMAIL_INQUIRY",
        status: ContactStatus.ACTIVE,
        notes: `Auto-created from email inquiry.\n\nOriginal inquiry:\n${summary}`,
      },
    });

    console.log(`Created contact ${contact.id} from email inquiry`);
  }

  // Create project as inquiry
  const project = await prisma.project.create({
    data: {
      userId,
      contactId: contact.id,
      name: buildProjectName(result),
      description: summary,
      projectType: mapProjectType(projectType),
      status: ProjectStatus.INQUIRY,
      source: "EMAIL_INQUIRY",
      eventDate: dates.eventDate ? new Date(dates.eventDate) : null,
      leadTemperature: result.isUrgent
        ? LeadTemperature.HOT
        : LeadTemperature.WARM,
      lastContactDate: new Date(),
      notes: `Suggested action: ${suggestedAction}`,
    },
  });

  console.log(`Created project ${project.id} from email inquiry`);

  // Update processed email with created entities
  await prisma.processedEmail.update({
    where: { id: processedEmailId },
    data: {
      createdContactId: contact.id,
      createdProjectId: project.id,
    },
  });

  // Revalidate affected pages
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/leads");
}

/**
 * Handle urgent request emails: Find contact and add urgent note
 */
async function handleUrgentRequest(
  userId: string,
  processedEmailId: string,
  result: ClassificationResult
): Promise<void> {
  const { sender, summary, suggestedAction, urgencyIndicators } = result;

  // Find existing contact
  const contact = await prisma.contact.findUnique({
    where: {
      userId_email: {
        userId,
        email: sender.email,
      },
    },
  });

  if (!contact) {
    console.log(`No existing contact found for urgent request from ${sender.email}`);
    return;
  }

  // Find most recent active project for this contact
  const recentProject = await prisma.project.findFirst({
    where: {
      userId,
      contactId: contact.id,
      status: {
        in: [
          ProjectStatus.BOOKED,
          ProjectStatus.IN_PROGRESS,
          ProjectStatus.POST_PRODUCTION,
        ],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const urgentNote = `
[URGENT REQUEST - ${new Date().toISOString()}]
Indicators: ${urgencyIndicators.join(", ")}

Summary: ${summary}

Suggested action: ${suggestedAction}
`.trim();

  if (recentProject) {
    // Add urgent note to project
    await prisma.project.update({
      where: { id: recentProject.id },
      data: {
        notes: recentProject.notes
          ? `${recentProject.notes}\n\n${urgentNote}`
          : urgentNote,
        updatedAt: new Date(),
      },
    });

    console.log(`Added urgent note to project ${recentProject.id}`);

    // Update processed email with project reference
    await prisma.processedEmail.update({
      where: { id: processedEmailId },
      data: {
        createdContactId: contact.id,
        createdProjectId: recentProject.id,
      },
    });

    revalidatePath("/dashboard/projects");
  } else {
    // No active project - add note to contact
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        notes: contact.notes
          ? `${contact.notes}\n\n${urgentNote}`
          : urgentNote,
        updatedAt: new Date(),
      },
    });

    console.log(`Added urgent note to contact ${contact.id}`);

    await prisma.processedEmail.update({
      where: { id: processedEmailId },
      data: {
        createdContactId: contact.id,
      },
    });

    revalidatePath("/dashboard/contacts");
  }
}

/**
 * Handle invoice emails: Create FinancialDocument
 */
async function handleInvoice(
  userId: string,
  processedEmailId: string,
  result: ClassificationResult
): Promise<void> {
  const { sender, financial, summary } = result;

  const document = await prisma.financialDocument.create({
    data: {
      userId,
      processedEmailId,
      documentType: DocumentType.INVOICE,
      amount: financial?.amount ?? null,
      currency: financial?.currency || "USD",
      vendorName: sender.company || sender.name,
      vendorEmail: sender.email,
      documentNumber: financial?.documentNumber,
      documentDate: financial?.documentDate
        ? new Date(financial.documentDate)
        : null,
      dueDate: financial?.dueDate ? new Date(financial.dueDate) : null,
      status: DocumentStatus.PENDING_REVIEW,
      notes: summary,
    },
  });

  console.log(`Created invoice document ${document.id}`);
}

/**
 * Handle receipt emails: Create FinancialDocument
 */
async function handleReceipt(
  userId: string,
  processedEmailId: string,
  result: ClassificationResult
): Promise<void> {
  const { sender, financial, summary, projectReferences } = result;

  const document = await prisma.financialDocument.create({
    data: {
      userId,
      processedEmailId,
      documentType: DocumentType.RECEIPT,
      amount: financial?.amount ?? null,
      currency: financial?.currency || "USD",
      vendorName: sender.company || sender.name,
      vendorEmail: sender.email,
      documentNumber: financial?.documentNumber,
      documentDate: financial?.documentDate
        ? new Date(financial.documentDate)
        : null,
      status: DocumentStatus.PENDING_REVIEW,
      notes: `${summary}\n\nProject references: ${projectReferences.join(", ") || "None"}`,
    },
  });

  console.log(`Created receipt document ${document.id}`);

  // Try to find and update the related project's paid amount
  if (financial?.amount && projectReferences.length > 0) {
    // Find project by name match (basic matching)
    const project = await prisma.project.findFirst({
      where: {
        userId,
        OR: projectReferences.map((ref) => ({
          name: { contains: ref, mode: "insensitive" as const },
        })),
        status: {
          in: [
            ProjectStatus.BOOKED,
            ProjectStatus.IN_PROGRESS,
            ProjectStatus.POST_PRODUCTION,
            ProjectStatus.DELIVERED,
          ],
        },
      },
    });

    if (project) {
      const currentPaid = project.paidAmount?.toNumber() || 0;
      await prisma.project.update({
        where: { id: project.id },
        data: {
          paidAmount: currentPaid + financial.amount,
        },
      });
      console.log(
        `Updated project ${project.id} paid amount to ${currentPaid + financial.amount}`
      );
      revalidatePath("/dashboard/projects");
    }
  }
}

/**
 * Parse a full name into first and last name.
 */
function parseName(fullName: string | null): {
  firstName: string;
  lastName: string;
} {
  if (!fullName) {
    return { firstName: "Unknown", lastName: "" };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Build a project name from classification result.
 */
function buildProjectName(result: ClassificationResult): string {
  const { sender, projectType, dates } = result;

  const name = sender.name || sender.email.split("@")[0];
  const type = projectType || "Photography";
  const date = dates.eventDate
    ? new Date(dates.eventDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

  if (date) {
    return `${name} - ${type} (${date})`;
  }
  return `${name} - ${type} Inquiry`;
}

/**
 * Map classification project type to Prisma ProjectType enum.
 */
function mapProjectType(type: string | null): ProjectType {
  if (!type) {
    return ProjectType.OTHER;
  }

  const mapping: Record<string, ProjectType> = {
    WEDDING: ProjectType.WEDDING,
    ENGAGEMENT: ProjectType.ENGAGEMENT,
    PORTRAIT: ProjectType.PORTRAIT,
    FAMILY: ProjectType.FAMILY,
    NEWBORN: ProjectType.NEWBORN,
    CORPORATE: ProjectType.CORPORATE,
    EVENT: ProjectType.EVENT,
    COMMERCIAL: ProjectType.COMMERCIAL,
    REAL_ESTATE: ProjectType.REAL_ESTATE,
    OTHER: ProjectType.OTHER,
  };

  return mapping[type.toUpperCase()] || ProjectType.OTHER;
}

/**
 * Entity Creation from Instagram DM Classification
 *
 * Automatically creates CRM entities based on DM classification results:
 * - INQUIRY: Create Contact (LEAD) + Project (INQUIRY status)
 * - URGENT_REQUEST: Find existing contact/project, add urgent note
 */

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  ContactType,
  ContactStatus,
  ProjectStatus,
  ProjectType,
  LeadTemperature,
} from "@prisma/client";
import { DMClassificationResult, DMContent } from "./classifier-types";

/**
 * Create entities based on DM classification.
 *
 * @param userId - The user ID
 * @param processedMessageId - The processed message record ID
 * @param result - The classification result
 * @param message - The original DM content
 */
export async function createEntitiesFromDMClassification(
  userId: string,
  processedMessageId: string,
  result: DMClassificationResult,
  message: DMContent
): Promise<void> {
  switch (result.classification) {
    case "INQUIRY":
      await handleInquiry(userId, processedMessageId, result, message);
      break;
    case "URGENT_REQUEST":
      await handleUrgentRequest(userId, processedMessageId, result, message);
      break;
  }
}

/**
 * Handle inquiry DMs: Create Contact + Project
 */
async function handleInquiry(
  userId: string,
  processedMessageId: string,
  result: DMClassificationResult,
  message: DMContent
): Promise<void> {
  const { sender, dates, projectType, summary, suggestedAction } = result;

  // Check if contact already exists by Instagram ID
  let contact = await prisma.contact.findFirst({
    where: {
      userId,
      instagramHandle: sender.username || undefined,
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
        instagramHandle: sender.username,
        type: ContactType.LEAD,
        source: "INSTAGRAM_DM",
        status: ContactStatus.ACTIVE,
        notes: `Auto-created from Instagram DM inquiry.\n\nInstagram ID: ${sender.instagramId}\nOriginal message:\n${message.text}\n\nSummary: ${summary}`,
      },
    });

    console.log(`Created contact ${contact.id} from Instagram DM inquiry`);
  }

  // Create project as inquiry
  const project = await prisma.project.create({
    data: {
      userId,
      contactId: contact.id,
      name: buildProjectName(result, sender.username),
      description: summary,
      projectType: mapProjectType(projectType),
      status: ProjectStatus.INQUIRY,
      source: "INSTAGRAM_DM",
      eventDate: dates.eventDate ? new Date(dates.eventDate) : null,
      leadTemperature: result.isUrgent
        ? LeadTemperature.HOT
        : LeadTemperature.WARM,
      lastContactDate: new Date(),
      notes: `Suggested action: ${suggestedAction}\n\nOriginal DM: ${message.text}`,
    },
  });

  console.log(`Created project ${project.id} from Instagram DM inquiry`);

  // Update processed message with created entities
  await prisma.processedMessage.update({
    where: { id: processedMessageId },
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
 * Handle urgent request DMs: Find contact and add urgent note
 */
async function handleUrgentRequest(
  userId: string,
  processedMessageId: string,
  result: DMClassificationResult,
  message: DMContent
): Promise<void> {
  const { sender, summary, suggestedAction, urgencyIndicators } = result;

  // Find existing contact by Instagram handle
  const contact = await prisma.contact.findFirst({
    where: {
      userId,
      instagramHandle: sender.username || undefined,
    },
  });

  if (!contact) {
    console.log(`No existing contact found for urgent Instagram DM from @${sender.username}`);
    // For urgent messages from unknown senders, treat as inquiry
    await handleInquiry(userId, processedMessageId, result, message);
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
[URGENT INSTAGRAM DM - ${new Date().toISOString()}]
From: @${sender.username || sender.instagramId}
Indicators: ${urgencyIndicators.join(", ")}

Message: ${message.text}

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

    // Update processed message with project reference
    await prisma.processedMessage.update({
      where: { id: processedMessageId },
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

    await prisma.processedMessage.update({
      where: { id: processedMessageId },
      data: {
        createdContactId: contact.id,
      },
    });

    revalidatePath("/dashboard/contacts");
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
    return { firstName: "Instagram", lastName: "User" };
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
function buildProjectName(
  result: DMClassificationResult,
  username: string | null
): string {
  const { projectType, dates } = result;

  const name = username ? `@${username}` : "Instagram Lead";
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

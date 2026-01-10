"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function getContact(contactId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        organization: true,
        projects: {
          include: {
            sessions: {
              orderBy: { scheduledAt: "asc" },
              take: 1,
            },
            _count: {
              select: {
                sessions: true,
                galleries: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        galleries: {
          include: {
            _count: {
              select: {
                photos: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!contact) {
      return { error: "Contact not found" }
    }

    if (contact.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    return { success: true, contact }
  } catch (error) {
    console.error("Error fetching contact:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to fetch contact" }
  }
}

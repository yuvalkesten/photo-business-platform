"use server"

import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/google/gmail"
import { generateGalleryReadyEmail } from "@/lib/email/templates"

export async function sendGalleryEmail(galleryId: string, includePassword?: boolean) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Get gallery with all related data
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: {
        project: {
          select: {
            name: true,
          },
        },
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        photos: {
          select: { id: true },
        },
      },
    })

    if (!gallery) {
      return { error: "Gallery not found" }
    }

    if (gallery.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    if (!gallery.contact.email) {
      return { error: "Contact has no email address" }
    }

    // Get photographer info
    const photographer = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        businessName: true,
        businessEmail: true,
      },
    })

    // Build share URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const shareUrl = `${baseUrl}/gallery/${gallery.shareToken}`

    const emailData = {
      clientName: `${gallery.contact.firstName} ${gallery.contact.lastName}`,
      galleryTitle: gallery.title,
      projectName: gallery.project.name,
      shareUrl,
      photoCount: gallery.photos.length,
      expiresAt: gallery.expiresAt,
      allowDownload: gallery.allowDownload,
      hasPassword: !!gallery.password,
      password: includePassword ? undefined : undefined, // Don't include actual password in email for security
      photographerName: photographer?.businessName || photographer?.name || "Your Photographer",
      photographerEmail: photographer?.businessEmail || photographer?.email || "",
    }

    const { subject, htmlBody, textBody } = generateGalleryReadyEmail(emailData)

    await sendEmail(user.id, {
      to: gallery.contact.email,
      subject,
      htmlBody,
      textBody,
    })

    // Update gallery to mark email as sent
    await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        // You could add an emailSentAt field to track this
        // For now, we just log success
      },
    })

    return {
      success: true,
      message: `Gallery email sent to ${gallery.contact.email}`
    }
  } catch (error) {
    console.error("Error sending gallery email:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to send gallery email" }
  }
}

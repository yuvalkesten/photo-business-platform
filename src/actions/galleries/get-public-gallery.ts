"use server"

import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function getPublicGallery(shareToken: string, password?: string) {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: { shareToken },
      include: {
        photos: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            filename: true,
            s3Url: true,
            thumbnailUrl: true,
            width: true,
            height: true,
          },
        },
        project: {
          select: {
            name: true,
            projectType: true,
          },
        },
        user: {
          select: {
            name: true,
            businessName: true,
            businessEmail: true,
            businessPhone: true,
          },
        },
      },
    })

    if (!gallery) {
      return { error: "Gallery not found" }
    }

    // Check if gallery is expired
    if (gallery.expiresAt && new Date(gallery.expiresAt) < new Date()) {
      return { error: "This gallery has expired" }
    }

    // Check if gallery requires password
    if (gallery.password) {
      if (!password) {
        return { requiresPassword: true, galleryTitle: gallery.title }
      }

      const isValidPassword = await bcrypt.compare(password, gallery.password)
      if (!isValidPassword) {
        return { requiresPassword: true, galleryTitle: gallery.title, error: "Incorrect password" }
      }
    }

    // Return gallery without sensitive data
    return {
      success: true,
      gallery: {
        id: gallery.id,
        title: gallery.title,
        description: gallery.description,
        coverImage: gallery.coverImage,
        allowDownload: gallery.allowDownload,
        watermark: gallery.watermark,
        expiresAt: gallery.expiresAt,
        photos: gallery.photos,
        project: gallery.project,
        photographer: {
          name: gallery.user.businessName || gallery.user.name,
          email: gallery.user.businessEmail,
          phone: gallery.user.businessPhone,
        },
      },
    }
  } catch (error) {
    console.error("Error fetching public gallery:", error)
    return { error: "Failed to load gallery" }
  }
}

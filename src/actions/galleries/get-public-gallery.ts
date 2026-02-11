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
            s3Key: true,
            s3Url: true,
            thumbnailUrl: true,
            watermarkedUrl: true,
            width: true,
            height: true,
            setId: true,
            analysis: {
              select: {
                searchTags: true,
                description: true,
                status: true,
                faceData: true,
                faceCount: true,
              },
            },
          },
        },
        photoSets: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            coverImage: true,
            order: true,
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
            brandLogo: true,
            brandFavicon: true,
            brandPrimaryColor: true,
            brandAccentColor: true,
          },
        },
        personClusters: {
          select: {
            id: true,
            name: true,
            role: true,
            description: true,
            photoIds: true,
            faceDescription: true,
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

    // When watermark is enabled, serve watermarked URLs to public viewers
    const publicPhotos = gallery.photos.map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      s3Url: gallery.watermark && photo.watermarkedUrl ? photo.watermarkedUrl : photo.s3Url,
      originalS3Key: photo.s3Key,
      thumbnailUrl: photo.thumbnailUrl,
      width: photo.width,
      height: photo.height,
      setId: photo.setId,
      analysis: photo.analysis
        ? {
            searchTags: photo.analysis.searchTags,
            description: photo.analysis.description,
            faceData: photo.analysis.faceData,
            faceCount: photo.analysis.faceCount,
          }
        : null,
    }))

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
        requireEmail: gallery.requireEmail,
        expiresAt: gallery.expiresAt,
        shareToken: gallery.shareToken,
        // Theming
        theme: gallery.theme,
        gridStyle: gallery.gridStyle,
        fontFamily: gallery.fontFamily,
        primaryColor: gallery.primaryColor,
        accentColor: gallery.accentColor,
        // Download options
        downloadResolution: gallery.downloadResolution,
        favoriteLimit: gallery.favoriteLimit,
        // AI Search
        aiSearchEnabled: gallery.aiSearchEnabled,
        // Content
        photos: publicPhotos,
        photoSets: gallery.photoSets,
        personClusters: gallery.personClusters,
        project: gallery.project,
        photographer: {
          name: gallery.user.businessName || gallery.user.name,
          email: gallery.user.businessEmail,
          phone: gallery.user.businessPhone,
          brandLogo: gallery.user.brandLogo,
          brandFavicon: gallery.user.brandFavicon,
          brandPrimaryColor: gallery.user.brandPrimaryColor,
          brandAccentColor: gallery.user.brandAccentColor,
        },
      },
    }
  } catch (error) {
    console.error("Error fetching public gallery:", error)
    return { error: "Failed to load gallery" }
  }
}

"use server"

import { prisma } from "@/lib/db"
import { searchGalleryPhotos, type SearchResult } from "@/lib/ai/photo-search"

export async function searchGalleryPhotosAction(
  galleryId: string,
  query: string
): Promise<{ results?: SearchResult[]; error?: string }> {
  try {
    if (!query || query.trim().length === 0) {
      return { results: [] }
    }

    // Verify gallery exists and has AI search enabled
    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { aiSearchEnabled: true },
    })

    if (!gallery) {
      return { error: "Gallery not found" }
    }

    if (!gallery.aiSearchEnabled) {
      return { error: "AI search is not enabled for this gallery" }
    }

    const results = await searchGalleryPhotos(galleryId, query.trim())
    return { results }
  } catch (error) {
    console.error("Search error:", error)
    return { error: "Search failed. Please try again." }
  }
}

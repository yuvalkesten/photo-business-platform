"use server"

import { prisma } from "@/lib/db"

export async function createFavoriteList(galleryId: string) {
  try {
    // Create an anonymous favorite list (email added on submission)
    const list = await prisma.favoriteList.create({
      data: {
        galleryId,
        email: "",
      },
    })

    return { success: true, listId: list.id }
  } catch (error) {
    console.error("Error creating favorite list:", error)
    return { error: "Failed to create favorites list" }
  }
}

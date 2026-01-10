"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function deleteProject(projectId: string) {
  try {
    const user = await requireAuth()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sessions: true,
        galleries: true,
      },
    })

    if (!existingProject) {
      return { error: "Project not found" }
    }

    if (existingProject.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    // Check if project has galleries with photos
    const galleriesWithPhotos = await prisma.gallery.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    })

    const totalPhotos = galleriesWithPhotos.reduce((sum, gallery) => sum + gallery._count.photos, 0)

    if (totalPhotos > 0) {
      return {
        error: `Cannot delete project with ${totalPhotos} photo(s) in ${galleriesWithPhotos.length} gallery/galleries. Please delete the galleries first.`,
      }
    }

    // Delete the project (cascading will handle sessions and empty galleries)
    await prisma.project.delete({
      where: { id: projectId },
    })

    revalidatePath("/dashboard/projects")
    revalidatePath("/dashboard/contacts")

    return { success: true }
  } catch (error) {
    console.error("Error deleting project:", error)
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: "Failed to delete project" }
  }
}

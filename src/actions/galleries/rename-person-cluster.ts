"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function renamePersonCluster(clusterId: string, name: string) {
  try {
    const user = await requireAuth()

    // Verify ownership: cluster → gallery → user
    const cluster = await prisma.personCluster.findUnique({
      where: { id: clusterId },
      select: {
        galleryId: true,
        gallery: { select: { userId: true } },
      },
    })

    if (!cluster) {
      return { error: "Person cluster not found" }
    }

    if (cluster.gallery.userId !== user.id) {
      return { error: "Unauthorized" }
    }

    await prisma.personCluster.update({
      where: { id: clusterId },
      data: { name: name.trim() || null },
    })

    revalidatePath(`/dashboard/galleries/${cluster.galleryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error renaming person cluster:", error)
    return { error: "Failed to rename person" }
  }
}

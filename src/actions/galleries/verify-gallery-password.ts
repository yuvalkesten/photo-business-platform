"use server"

import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function verifyGalleryPassword(token: string, password: string) {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: { shareToken: token },
      select: { id: true, password: true, title: true },
    })

    if (!gallery) {
      return { error: "Gallery not found" }
    }

    if (!gallery.password) {
      return { success: true }
    }

    const isValid = await bcrypt.compare(password, gallery.password)
    if (!isValid) {
      return { error: "Incorrect password" }
    }

    // Set httpOnly cookie valid for 7 days
    const cookieStore = await cookies()
    cookieStore.set(`gallery_access_${token}`, "granted", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: `/gallery/${token}`,
    })

    return { success: true }
  } catch (error) {
    console.error("Error verifying gallery password:", error)
    return { error: "Failed to verify password" }
  }
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"

/**
 * Get the currently authenticated user
 * Returns null if no user is authenticated
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

/**
 * Require authentication - redirects to signin if not authenticated
 * Use in Server Components and Server Actions
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/signin")
  }
  return user
}

/**
 * Require specific role - redirects if user doesn't have required role
 */
export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    redirect("/unauthorized")
  }
  return user
}

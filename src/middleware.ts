import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Redirect to dashboard if signed in and trying to access auth pages
  if (isLoggedIn && pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Redirect to signin if not logged in and trying to access protected routes
  if (!isLoggedIn && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  return NextResponse.next()
})

// Protect dashboard routes and signin redirect
export const config = {
  matcher: ["/dashboard/:path*", "/auth/signin"],
}

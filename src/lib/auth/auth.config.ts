import { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Edge-compatible auth config (no Prisma, no credentials that use DB)
// This is used for middleware which runs on the edge
export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/gmail.send"
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isOnAuth = nextUrl.pathname.startsWith("/auth")

      if (isOnDashboard) {
        return isLoggedIn // Redirect unauthenticated users to login
      } else if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id ?? ""
        token.role = (user as { role?: string }).role ?? ""
      }

      // Store access token for Google APIs
      if (account?.provider === "google") {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}

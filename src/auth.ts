import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma/client"
import { compare } from "bcryptjs"
import type { Adapter } from "next-auth/adapters"
import { authConfig } from "@/lib/auth/auth.config"
import { seedDemoData } from "@/lib/demo-data"

// Full auth config with Prisma adapter (used in API routes, not middleware)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  events: {
    // Seed demo data for new OAuth users
    async createUser({ user }) {
      if (user.id) {
        seedDemoData(user.id).catch((err) =>
          console.error("Demo seeding failed:", user.id, err)
        )
      }
    },
    // Update tokens when user signs in again (to get new scopes)
    async signIn({ account, user }) {
      if (account?.provider === "google" && user?.id) {
        // Update the existing account with new tokens
        await prisma.account.updateMany({
          where: {
            userId: user.id,
            provider: "google",
          },
          data: {
            access_token: account.access_token,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at,
            scope: account.scope,
          },
        })
      }
    },
  },
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
})

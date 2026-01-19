"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

export function SessionProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000, // Data considered fresh for 5 seconds
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  return (
    <NextAuthSessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NextAuthSessionProvider>
  )
}

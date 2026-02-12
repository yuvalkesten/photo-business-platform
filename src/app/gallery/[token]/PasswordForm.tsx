"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { verifyGalleryPassword } from "@/actions/galleries/verify-gallery-password"

interface PasswordFormProps {
  token: string
  error?: string
}

export function PasswordForm({ token, error: initialError }: PasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(initialError)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(undefined)

    const result = await verifyGalleryPassword(token, password)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    // Cookie is set server-side, reload the page to pick it up
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter gallery password"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Unlocking...
          </>
        ) : (
          "View Gallery"
        )}
      </Button>
    </form>
  )
}

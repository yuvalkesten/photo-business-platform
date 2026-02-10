"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { registerVisitor } from "@/actions/galleries/register-visitor"

interface EmailGateFormProps {
  galleryId: string
  galleryTitle: string
  onSuccess: () => void
}

export function EmailGateForm({ galleryId, galleryTitle, onSuccess }: EmailGateFormProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Email is required")
      return
    }

    startTransition(async () => {
      const result = await registerVisitor({ galleryId, email, name: name || undefined })

      if (result.error) {
        setError(result.error)
        return
      }

      // Store in cookie so they don't need to re-enter
      document.cookie = `gallery_visitor_${galleryId}=${encodeURIComponent(email)};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`

      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isPending}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          "View Gallery"
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Your email is shared with the photographer for this gallery only.
      </p>
    </form>
  )
}

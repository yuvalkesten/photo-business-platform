"use client"

import { useState, useEffect } from "react"
import { GalleryView } from "./GalleryView"
import { EmailGateForm } from "./EmailGateForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

interface GalleryWithEmailGateProps {
  gallery: Parameters<typeof GalleryView>[0]["gallery"]
  requireEmail: boolean
  galleryId: string
}

export function GalleryWithEmailGate({
  gallery,
  requireEmail,
  galleryId,
}: GalleryWithEmailGateProps) {
  const [hasAccess, setHasAccess] = useState(!requireEmail)

  useEffect(() => {
    if (!requireEmail) return

    // Check if visitor already registered via cookie
    const cookies = document.cookie.split(";").map((c) => c.trim())
    const visitorCookie = cookies.find((c) =>
      c.startsWith(`gallery_visitor_${galleryId}=`)
    )
    if (visitorCookie) {
      setHasAccess(true)
    }
  }, [requireEmail, galleryId])

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>{gallery.title}</CardTitle>
            <CardDescription>
              Please enter your email to view this gallery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailGateForm
              galleryId={galleryId}
              galleryTitle={gallery.title}
              onSuccess={() => setHasAccess(true)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return <GalleryView gallery={gallery} />
}

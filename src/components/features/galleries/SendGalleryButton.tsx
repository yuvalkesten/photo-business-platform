"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { sendGalleryEmail } from "@/actions/galleries"
import { Mail, Loader2 } from "lucide-react"

interface SendGalleryButtonProps {
  galleryId: string
  contactEmail: string
  photoCount: number
}

export function SendGalleryButton({ galleryId, contactEmail, photoCount }: SendGalleryButtonProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleSend = () => {
    if (photoCount === 0) {
      toast({
        title: "No photos to share",
        description: "Upload some photos before sending the gallery to your client.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      const result = await sendGalleryEmail(galleryId)

      if (result.error) {
        toast({
          title: "Failed to send email",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Gallery sent!",
        description: `Email sent to ${contactEmail}`,
      })
    })
  }

  return (
    <Button onClick={handleSend} disabled={isPending} variant="default">
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      {isPending ? "Sending..." : "Send to Client"}
    </Button>
  )
}

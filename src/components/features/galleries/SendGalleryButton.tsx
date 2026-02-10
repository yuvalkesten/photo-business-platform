"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { sendGalleryEmail } from "@/actions/galleries"
// Email template types - keep in sync with gallery-ready.ts
type EmailTemplate = "classic" | "minimal" | "elegant" | "playful"

const EMAIL_TEMPLATES: Record<EmailTemplate, { label: string; description: string }> = {
  classic: { label: "Classic", description: "Warm, friendly tone" },
  minimal: { label: "Minimal", description: "Clean, short, just the essentials" },
  elegant: { label: "Elegant", description: "Dark header, serif fonts, luxury feel" },
  playful: { label: "Playful", description: "Bright colors, casual tone" },
}
import { Mail, Loader2, Send } from "lucide-react"

interface SendGalleryButtonProps {
  galleryId: string
  contactEmail: string
  photoCount: number
}

export function SendGalleryButton({ galleryId, contactEmail, photoCount }: SendGalleryButtonProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState<EmailTemplate>("classic")

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
      const result = await sendGalleryEmail(galleryId, template)

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
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Mail className="h-4 w-4 mr-2" />
          Send to Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Gallery Email</DialogTitle>
          <DialogDescription>
            Send the gallery link to {contactEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email Template</Label>
            <Select
              value={template}
              onValueChange={(v) => setTemplate(v as EmailTemplate)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <span className="font-medium">{tmpl.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{tmpl.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSend} disabled={isPending} className="w-full">
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isPending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

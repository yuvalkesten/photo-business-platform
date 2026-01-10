"use client"

import { useState, useTransition } from "react"
import { LostReason } from "@prisma/client"
import { markLeadAsLost } from "@/actions/leads"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface MarkAsLostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  onSuccess?: () => void
}

const lostReasonLabels: Record<LostReason, { label: string; description: string }> = {
  BUDGET: { label: "Budget", description: "Price was too high for the client" },
  TIMING: { label: "Timing", description: "Date was not available" },
  COMPETITOR: { label: "Competitor", description: "Client chose another photographer" },
  NO_RESPONSE: { label: "No Response", description: "Client went silent" },
  SCOPE_MISMATCH: { label: "Scope Mismatch", description: "Requirements didn't fit" },
  PERSONAL_REASONS: { label: "Personal Reasons", description: "Client circumstances changed" },
  OTHER: { label: "Other", description: "See notes for details" },
}

export function MarkAsLostModal({
  open,
  onOpenChange,
  leadId,
  leadName,
  onSuccess,
}: MarkAsLostModalProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [lostReason, setLostReason] = useState<LostReason | "">("")
  const [lostNotes, setLostNotes] = useState("")

  const handleSubmit = () => {
    if (!lostReason) {
      toast({
        title: "Error",
        description: "Please select a reason for losing this lead",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      const result = await markLeadAsLost(leadId, {
        lostReason,
        lostNotes: lostNotes || undefined,
      })

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Lead Marked as Lost",
          description: "The lead has been moved to lost leads.",
        })
        onOpenChange(false)
        setLostReason("")
        setLostNotes("")
        onSuccess?.()
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setLostReason("")
    setLostNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Lead as Lost</DialogTitle>
          <DialogDescription>
            Mark "{leadName}" as a lost lead. Select a reason to help track why leads don't convert.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lostReason">Reason *</Label>
            <Select
              value={lostReason}
              onValueChange={(value) => setLostReason(value as LostReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(lostReasonLabels).map(([value, { label, description }]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lostNotes">Notes (optional)</Label>
            <Textarea
              id="lostNotes"
              placeholder="Add any additional details about why this lead was lost..."
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !lostReason}
          >
            {isPending ? "Marking..." : "Mark as Lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

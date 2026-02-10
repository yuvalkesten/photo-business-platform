"use client"

import { useState, useRef } from "react"
import JSZip from "jszip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Download, Loader2, CheckCircle, XCircle } from "lucide-react"

interface Photo {
  id: string
  filename: string
  s3Url: string
  thumbnailUrl: string | null
}

interface DownloadManagerProps {
  galleryId: string
  photos: Photo[]
  galleryTitle: string
  onClose: () => void
}

type DownloadState = "idle" | "downloading" | "zipping" | "complete" | "error"

export function DownloadManager({
  galleryId,
  photos,
  galleryTitle,
  onClose,
}: DownloadManagerProps) {
  const [state, setState] = useState<DownloadState>("idle")
  const [progress, setProgress] = useState(0)
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const abortRef = useRef(false)

  const handleDownload = async () => {
    if (photos.length === 0) return

    setState("downloading")
    abortRef.current = false

    try {
      const zip = new JSZip()
      const folder = zip.folder(galleryTitle.replace(/[^a-zA-Z0-9 _-]/g, "")) || zip

      for (let i = 0; i < photos.length; i++) {
        if (abortRef.current) return

        setCurrentPhoto(i + 1)
        setProgress(Math.round(((i) / photos.length) * 80))

        try {
          const response = await fetch(photos[i].s3Url)
          if (!response.ok) throw new Error(`Failed to fetch ${photos[i].filename}`)
          const blob = await response.blob()
          folder.file(photos[i].filename, blob)
        } catch {
          // Skip failed photos but continue
          console.warn(`Failed to download: ${photos[i].filename}`)
        }
      }

      if (abortRef.current) return

      setState("zipping")
      setProgress(85)

      const content = await zip.generateAsync(
        { type: "blob", compression: "STORE" },
        (metadata) => {
          setProgress(85 + Math.round(metadata.percent * 0.15))
        }
      )

      // Trigger download
      const url = URL.createObjectURL(content)
      const link = document.createElement("a")
      link.href = url
      link.download = `${galleryTitle.replace(/[^a-zA-Z0-9 _-]/g, "")}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setState("complete")
      setProgress(100)

      // Track the download
      try {
        await fetch(`/api/galleries/${galleryId}/track-download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "zip", resolution: "original" }),
        })
      } catch {
        // Tracking failure is non-critical
      }
    } catch (err) {
      setState("error")
      setErrorMessage(err instanceof Error ? err.message : "Download failed")
    }
  }

  const handleCancel = () => {
    abortRef.current = true
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Gallery</DialogTitle>
          <DialogDescription>
            {photos.length} photo{photos.length !== 1 ? "s" : ""} will be packaged into a ZIP file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {state === "idle" && (
            <div className="text-center space-y-4">
              <Download className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click below to download all {photos.length} photos as a ZIP file.
              </p>
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Start Download
              </Button>
            </div>
          )}

          {(state === "downloading" || state === "zipping") && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {state === "downloading"
                      ? `Downloading photo ${currentPhoto} of ${photos.length}...`
                      : "Creating ZIP file..."}
                  </p>
                </div>
              </div>
              <Progress value={progress} />
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </div>
          )}

          {state === "complete" && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <p className="text-sm font-medium">Download complete!</p>
              <p className="text-sm text-muted-foreground">
                Your ZIP file should start downloading automatically.
              </p>
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-sm font-medium">Download failed</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button onClick={handleDownload} className="flex-1">
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

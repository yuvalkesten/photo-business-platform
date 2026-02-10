"use client"

import { useState, useEffect, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Trash2, Loader2, Droplets } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const POSITIONS = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "tiled", label: "Tiled (Repeating)" },
]

export function WatermarkSettings() {
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null)
  const [position, setPosition] = useState("center")
  const [opacity, setOpacity] = useState(50)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/settings/watermark")
      .then((res) => res.json())
      .then((data) => {
        setWatermarkUrl(data.watermarkUrl || null)
        setPosition(data.watermarkPosition || "center")
        setOpacity(data.watermarkOpacity ?? 50)
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load watermark settings", variant: "destructive" })
      })
      .finally(() => setIsLoading(false))
  }, [toast])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setIsUploading(true)
      try {
        // Get presigned URL
        const res = await fetch("/api/settings/watermark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type }),
        })
        const { uploadUrl, s3Url } = await res.json()

        // Upload to S3
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        })

        // Save URL
        await fetch("/api/settings/watermark", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watermarkUrl: s3Url }),
        })

        setWatermarkUrl(s3Url)
        toast({ title: "Watermark uploaded", description: "Your watermark has been saved." })
      } catch {
        toast({ title: "Error", description: "Failed to upload watermark", variant: "destructive" })
      } finally {
        setIsUploading(false)
      }
    },
    [toast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"], "image/svg+xml": [".svg"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: isUploading,
  })

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      await fetch("/api/settings/watermark", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watermarkPosition: position, watermarkOpacity: opacity }),
      })
      toast({ title: "Settings saved", description: "Watermark settings updated." })
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const removeWatermark = async () => {
    try {
      await fetch("/api/settings/watermark", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watermarkUrl: null }),
      })
      setWatermarkUrl(null)
      toast({ title: "Watermark removed" })
    } catch {
      toast({ title: "Error", description: "Failed to remove watermark", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Watermark Settings
        </CardTitle>
        <CardDescription>
          Upload a watermark image (PNG with transparency recommended).
          It will be applied to galleries with watermarking enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Watermark Image */}
        {watermarkUrl ? (
          <div className="space-y-3">
            <Label>Current Watermark</Label>
            <div className="flex items-center gap-4">
              <div className="w-48 h-24 border rounded-lg bg-muted/50 flex items-center justify-center p-2">
                <img
                  src={watermarkUrl}
                  alt="Watermark"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <Button variant="destructive" size="sm" onClick={removeWatermark}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Upload watermark image</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG with transparency, up to 5MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Position */}
        <div className="space-y-2">
          <Label>Position</Label>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label>Opacity ({opacity}%)</Label>
          <Input
            type="range"
            min={10}
            max={100}
            step={5}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="h-2"
          />
        </div>

        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

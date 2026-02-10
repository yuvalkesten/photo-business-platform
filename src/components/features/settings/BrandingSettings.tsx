"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Trash2, Loader2, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateBranding } from "@/actions/settings/update-branding"

interface BrandingSettingsProps {
  currentLogo: string | null
  currentFavicon: string | null
  currentPrimaryColor: string
  currentAccentColor: string
}

export function BrandingSettings({
  currentLogo,
  currentFavicon,
  currentPrimaryColor,
  currentAccentColor,
}: BrandingSettingsProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(currentFavicon)
  const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor)
  const [accentColor, setAccentColor] = useState(currentAccentColor)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const onLogoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }, [])

  const onFaviconDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setFaviconFile(file)
    setFaviconPreview(URL.createObjectURL(file))
  }, [])

  const logoDropzone = useDropzone({
    onDrop: onLogoDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".svg", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  const faviconDropzone = useDropzone({
    onDrop: onFaviconDrop,
    accept: { "image/*": [".png", ".ico", ".svg"] },
    maxFiles: 1,
    maxSize: 1 * 1024 * 1024,
  })

  const handleSave = () => {
    startTransition(async () => {
      // Upload files if present
      let logoUrl = currentLogo
      let faviconUrl = currentFavicon

      if (logoFile) {
        const formData = new FormData()
        formData.append("file", logoFile)
        formData.append("type", "logo")
        const response = await fetch("/api/branding/upload", { method: "POST", body: formData })
        const data = await response.json()
        if (data.url) logoUrl = data.url
      }

      if (faviconFile) {
        const formData = new FormData()
        formData.append("file", faviconFile)
        formData.append("type", "favicon")
        const response = await fetch("/api/branding/upload", { method: "POST", body: formData })
        const data = await response.json()
        if (data.url) faviconUrl = data.url
      }

      const result = await updateBranding({
        brandLogo: logoUrl,
        brandFavicon: faviconUrl,
        brandPrimaryColor: primaryColor,
        brandAccentColor: accentColor,
      })

      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Branding updated", description: "Your branding settings have been saved." })
        setLogoFile(null)
        setFaviconFile(null)
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Branding
        </CardTitle>
        <CardDescription>
          Customize your brand appearance in galleries and emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div
            {...logoDropzone.getRootProps()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input {...logoDropzone.getInputProps()} />
            {logoPreview ? (
              <div className="space-y-3">
                <img src={logoPreview} alt="Logo preview" className="h-16 max-w-[240px] mx-auto object-contain" />
                <p className="text-xs text-muted-foreground">Click or drag to replace</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload your logo (PNG, JPG, SVG)</p>
              </div>
            )}
          </div>
          {logoPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setLogoPreview(null)
                setLogoFile(null)
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove logo
            </Button>
          )}
        </div>

        {/* Favicon */}
        <div className="space-y-2">
          <Label>Favicon</Label>
          <div
            {...faviconDropzone.getRootProps()}
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input {...faviconDropzone.getInputProps()} />
            {faviconPreview ? (
              <div className="flex items-center gap-3 justify-center">
                <img src={faviconPreview} alt="Favicon preview" className="h-8 w-8 object-contain" />
                <p className="text-xs text-muted-foreground">Click or drag to replace</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a favicon (PNG, ICO, SVG, max 1MB)</p>
            )}
          </div>
        </div>

        {/* Brand colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Branding"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

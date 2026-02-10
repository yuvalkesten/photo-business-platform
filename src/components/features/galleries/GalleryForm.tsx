"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { type Gallery, type Contact } from "@prisma/client"

// Serialized project type (Decimal fields converted to number)
type SerializedProject = {
  id: string
  name: string
  [key: string]: unknown
}
import { gallerySchema, type GalleryFormData } from "@/lib/validations/gallery.schema"
import { createGallery } from "@/actions/galleries/create-gallery"
import { updateGallery } from "@/actions/galleries/update-gallery"
import {
  GALLERY_THEMES,
  GALLERY_GRID_STYLES,
  GALLERY_FONTS,
  DOWNLOAD_RESOLUTIONS,
} from "@/lib/gallery-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

interface GalleryFormProps {
  gallery?: Gallery
  projects: SerializedProject[]
  contacts: Contact[]
  defaultProjectId?: string
  defaultContactId?: string
}

export function GalleryForm({
  gallery,
  projects,
  contacts,
  defaultProjectId,
  defaultContactId,
}: GalleryFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const form = useForm<GalleryFormData>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      title: gallery?.title || "",
      description: gallery?.description || "",
      projectId: gallery?.projectId || defaultProjectId || "",
      contactId: gallery?.contactId || defaultContactId || "",
      coverImage: gallery?.coverImage || "",
      isPublic: gallery?.isPublic || false,
      password: "",
      expiresAt: gallery?.expiresAt ? new Date(gallery.expiresAt) : undefined,
      allowDownload: gallery?.allowDownload ?? true,
      watermark: gallery?.watermark || false,
      requireEmail: gallery?.requireEmail || false,
      // Theming
      theme: (gallery?.theme as GalleryFormData["theme"]) || "classic",
      gridStyle: (gallery?.gridStyle as GalleryFormData["gridStyle"]) || "grid",
      fontFamily: (gallery?.fontFamily as GalleryFormData["fontFamily"]) || "inter",
      primaryColor: gallery?.primaryColor || "#000000",
      accentColor: gallery?.accentColor || "#8b5cf6",
      // Download options
      downloadResolution: (gallery?.downloadResolution as GalleryFormData["downloadResolution"]) || "original",
      favoriteLimit: gallery?.favoriteLimit ?? undefined,
    },
  })

  const onSubmit = (data: GalleryFormData) => {
    startTransition(async () => {
      const result = gallery
        ? await updateGallery(gallery.id, data)
        : await createGallery(data)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: gallery ? "Gallery updated" : "Gallery created",
        description: gallery
          ? "The gallery has been updated successfully."
          : "The gallery has been created successfully.",
      })

      router.push("/dashboard/galleries")
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Gallery Details */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery Details</CardTitle>
          <CardDescription>Basic information about this gallery</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Gallery Title *</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Wedding Gallery, Engagement Photos, etc."
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Project *</Label>
            <Select
              value={form.watch("projectId")}
              onValueChange={(value) => form.setValue("projectId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.projectId && (
              <p className="text-sm text-destructive">{form.formState.errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactId">Client *</Label>
            <Select
              value={form.watch("contactId")}
              onValueChange={(value) => form.setValue("contactId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.contactId && (
              <p className="text-sm text-destructive">{form.formState.errors.contactId.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Gallery description..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Design / Theming */}
      <Card>
        <CardHeader>
          <CardTitle>Design</CardTitle>
          <CardDescription>Customize the look and feel of your gallery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={form.watch("theme")}
                onValueChange={(value) => form.setValue("theme", value as GalleryFormData["theme"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GALLERY_THEMES).map(([key, theme]) => (
                    <SelectItem key={key} value={key}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {GALLERY_THEMES[form.watch("theme") || "classic"]?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Grid Layout</Label>
              <Select
                value={form.watch("gridStyle")}
                onValueChange={(value) => form.setValue("gridStyle", value as GalleryFormData["gridStyle"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GALLERY_GRID_STYLES).map(([key, style]) => (
                    <SelectItem key={key} value={key}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {GALLERY_GRID_STYLES[form.watch("gridStyle") || "grid"]?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Font</Label>
              <Select
                value={form.watch("fontFamily")}
                onValueChange={(value) => form.setValue("fontFamily", value as GalleryFormData["fontFamily"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GALLERY_FONTS).map(([key, font]) => (
                    <SelectItem key={key} value={key}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={form.watch("primaryColor") || "#000000"}
                  onChange={(e) => form.setValue("primaryColor", e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.watch("primaryColor") || "#000000"}
                  onChange={(e) => form.setValue("primaryColor", e.target.value)}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="accentColor"
                  value={form.watch("accentColor") || "#8b5cf6"}
                  onChange={(e) => form.setValue("accentColor", e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.watch("accentColor") || "#8b5cf6"}
                  onChange={(e) => form.setValue("accentColor", e.target.value)}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Access Settings</CardTitle>
          <CardDescription>Control who can view this gallery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">Public Gallery</Label>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view this gallery
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={form.watch("isPublic")}
              onCheckedChange={(checked) => form.setValue("isPublic", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password Protection</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              placeholder={gallery ? "Leave blank to keep current password" : "Optional password"}
            />
            <p className="text-sm text-muted-foreground">
              Set a password to protect this gallery
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requireEmail">Require Email</Label>
              <p className="text-sm text-muted-foreground">
                Visitors must enter their email before viewing the gallery
              </p>
            </div>
            <Switch
              id="requireEmail"
              checked={form.watch("requireEmail")}
              onCheckedChange={(checked) => form.setValue("requireEmail", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date</Label>
            <Input
              id="expiresAt"
              type="date"
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined
                form.setValue("expiresAt", date)
              }}
              defaultValue={gallery?.expiresAt ? new Date(gallery.expiresAt).toISOString().split("T")[0] : ""}
            />
            <p className="text-sm text-muted-foreground">
              Gallery will become inaccessible after this date
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Download & Proofing Settings</CardTitle>
          <CardDescription>Control download, watermark, and proofing options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowDownload">Allow Downloads</Label>
              <p className="text-sm text-muted-foreground">
                Clients can download photos from this gallery
              </p>
            </div>
            <Switch
              id="allowDownload"
              checked={form.watch("allowDownload")}
              onCheckedChange={(checked) => form.setValue("allowDownload", checked)}
            />
          </div>

          {form.watch("allowDownload") && (
            <div className="space-y-2">
              <Label>Download Resolution</Label>
              <Select
                value={form.watch("downloadResolution")}
                onValueChange={(value) => form.setValue("downloadResolution", value as GalleryFormData["downloadResolution"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOWNLOAD_RESOLUTIONS).map(([key, res]) => (
                    <SelectItem key={key} value={key}>
                      {res.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {DOWNLOAD_RESOLUTIONS[form.watch("downloadResolution") || "original"]?.description}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="watermark">Apply Watermark</Label>
              <p className="text-sm text-muted-foreground">
                Add your watermark to photos in this gallery
              </p>
            </div>
            <Switch
              id="watermark"
              checked={form.watch("watermark")}
              onCheckedChange={(checked) => form.setValue("watermark", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="favoriteLimit">Favorite Selection Limit</Label>
            <Input
              id="favoriteLimit"
              type="number"
              min={1}
              {...form.register("favoriteLimit")}
              placeholder="Unlimited"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of photos a client can select as favorites. Leave blank for unlimited.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : gallery ? "Update Gallery" : "Create Gallery"}
        </Button>
      </div>
    </form>
  )
}

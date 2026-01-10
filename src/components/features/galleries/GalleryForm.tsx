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
          <CardTitle>Download Settings</CardTitle>
          <CardDescription>Control download and watermark options</CardDescription>
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

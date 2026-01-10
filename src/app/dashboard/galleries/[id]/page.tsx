import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getGallery } from "@/actions/galleries"
import { deleteGallery } from "@/actions/galleries/delete-gallery"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Edit,
  Trash2,
  ImageIcon,
  Lock,
  Globe,
  Download,
  Calendar,
  User,
  FolderKanban,
  Link as LinkIcon,
  Copy,
  ExternalLink,
} from "lucide-react"

interface GalleryDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getGallery(id)

  if (result.error || !result.gallery) {
    notFound()
  }

  const { gallery } = result
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/gallery/${gallery.shareToken}`

  async function handleDelete() {
    "use server"
    const result = await deleteGallery(id)
    if (!result.error) {
      redirect("/dashboard/galleries")
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/galleries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{gallery.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {gallery.isPublic ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            {gallery.allowDownload && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                Downloads enabled
              </Badge>
            )}
            {gallery.password && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Password protected
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/galleries/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button variant="destructive" type="submit">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Gallery Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Share Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Share Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="text-xs font-mono"
                />
                <Button size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Gallery
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/projects/${gallery.project.id}`}>
                <div className="p-3 -m-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <p className="font-medium">{gallery.project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {gallery.project.projectType}
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/contacts/${gallery.contact.id}`}>
                <div className="p-3 -m-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <p className="font-medium">
                    {gallery.contact.firstName} {gallery.contact.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {gallery.contact.email}
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Gallery Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {gallery.description && (
                <div>
                  <p className="font-medium text-muted-foreground">Description</p>
                  <p>{gallery.description}</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Photos</span>
                <span className="font-medium">{gallery.photos?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(gallery.createdAt).toLocaleDateString()}
                </span>
              </div>
              {gallery.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium">
                    {new Date(gallery.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Photos */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Photos
                </CardTitle>
                <CardDescription>
                  {gallery.photos?.length || 0} photo(s) in this gallery
                </CardDescription>
              </div>
              <Button size="sm">
                Upload Photos
              </Button>
            </CardHeader>
            <CardContent>
              {gallery.photos && gallery.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {gallery.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={photo.thumbnailUrl || photo.s3Url}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No photos uploaded yet</p>
                  <Button>Upload Photos</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getGallery, getGalleryVisitors, getFavoriteLists } from "@/actions/galleries"
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
  Upload,
  Mail,
  Heart,
} from "lucide-react"
import { SendGalleryButton } from "@/components/features/galleries/SendGalleryButton"
import { PhotoUploader } from "@/components/features/galleries/PhotoUploader"
import { PhotoGrid } from "@/components/features/galleries/PhotoGrid"

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
  const visitorsResult = await getGalleryVisitors(id)
  const visitors = visitorsResult.visitors || []
  const favoritesResult = await getFavoriteLists(id)
  const favoriteLists = favoritesResult.lists || []
  // Use NEXTAUTH_URL for production, fall back to NEXT_PUBLIC_APP_URL or localhost
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const shareUrl = `${baseUrl}/gallery/${gallery.shareToken}`

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
            {gallery.requireEmail && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email gate
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
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Gallery
                  </a>
                </Button>
                <SendGalleryButton
                  galleryId={id}
                  contactEmail={gallery.contact.email || ""}
                  photoCount={gallery.photos?.length || 0}
                />
              </div>
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

          {/* Visitors */}
          {gallery.requireEmail && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Visitors ({visitors.length})
                </CardTitle>
                <CardDescription>
                  Emails collected from gallery visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visitors.length > 0 ? (
                  <div className="space-y-2">
                    {visitors.map((visitor) => (
                      <div
                        key={visitor.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium">{visitor.email}</p>
                          {visitor.name && (
                            <p className="text-muted-foreground text-xs">{visitor.name}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(visitor.visitedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No visitors yet. Email gate is enabled.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Photos
              </CardTitle>
              <CardDescription>
                Drag and drop or click to upload photos to this gallery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUploader galleryId={id} />
            </CardContent>
          </Card>

          {/* Photo Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Photos ({gallery.photos?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGrid
                galleryId={id}
                photos={(gallery.photos || []).map((p) => ({
                  id: p.id,
                  filename: p.filename,
                  s3Url: p.s3Url,
                  thumbnailUrl: p.thumbnailUrl,
                  fileSize: p.fileSize,
                  width: p.width,
                  height: p.height,
                  order: p.order,
                }))}
                coverImage={gallery.coverImage}
              />
            </CardContent>
          </Card>

          {/* Client Favorites */}
          {favoriteLists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Client Favorites ({favoriteLists.length})
                </CardTitle>
                <CardDescription>
                  Favorite selections submitted by gallery visitors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {favoriteLists.map((list) => (
                  <div key={list.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{list.name || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">{list.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          {list.photos.length} photo(s)
                        </Badge>
                        {list.submittedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(list.submittedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {list.note && (
                      <p className="text-sm text-muted-foreground italic">
                        &ldquo;{list.note}&rdquo;
                      </p>
                    )}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                      {list.photos.map((fp) => (
                        <div
                          key={fp.id}
                          className="aspect-square rounded overflow-hidden bg-muted"
                        >
                          <img
                            src={fp.photo.thumbnailUrl || fp.photo.s3Url}
                            alt={fp.photo.filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

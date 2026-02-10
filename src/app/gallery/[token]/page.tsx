import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPublicGallery } from "@/actions/galleries/get-public-gallery"
import { GalleryWithEmailGate } from "./GalleryWithEmailGate"
import { PasswordForm } from "./PasswordForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Lock, AlertCircle } from "lucide-react"

interface PublicGalleryPageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ password?: string }>
}

export async function generateMetadata({ params }: PublicGalleryPageProps): Promise<Metadata> {
  const { token } = await params
  const result = await getPublicGallery(token)

  if (result.error || !result.gallery) {
    return { title: "Gallery" }
  }

  const { gallery } = result
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const url = `${baseUrl}/gallery/${token}`

  return {
    title: gallery.title,
    description: gallery.description || `${gallery.photos.length} photos from ${gallery.project.name}`,
    openGraph: {
      title: gallery.title,
      description: gallery.description || `${gallery.photos.length} photos from ${gallery.project.name}`,
      url,
      type: "website",
      images: gallery.coverImage ? [{ url: gallery.coverImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: gallery.title,
      description: gallery.description || `${gallery.photos.length} photos from ${gallery.project.name}`,
      images: gallery.coverImage ? [gallery.coverImage] : [],
    },
  }
}

export default async function PublicGalleryPage({ params, searchParams }: PublicGalleryPageProps) {
  const { token } = await params
  const { password } = await searchParams

  const result = await getPublicGallery(token, password)

  // Gallery not found
  if (result.error === "Gallery not found") {
    notFound()
  }

  // Gallery expired
  if (result.error === "This gallery has expired") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Gallery Expired</CardTitle>
            <CardDescription>
              This gallery is no longer available. Please contact the photographer for access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Password required
  if (result.requiresPassword) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>{result.galleryTitle}</CardTitle>
            <CardDescription>
              This gallery is password protected. Please enter the password to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm token={token} error={result.error} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error
  if (result.error || !result.gallery) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{result.error || "Failed to load gallery"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Success - show gallery (with email gate if enabled)
  return (
    <GalleryWithEmailGate
      gallery={result.gallery}
      requireEmail={result.gallery.requireEmail}
      galleryId={result.gallery.id}
    />
  )
}

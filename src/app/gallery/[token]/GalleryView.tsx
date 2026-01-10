"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Camera,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  Calendar,
} from "lucide-react"

interface Photo {
  id: string
  filename: string
  s3Url: string
  thumbnailUrl: string | null
  width: number | null
  height: number | null
}

interface GalleryData {
  id: string
  title: string
  description: string | null
  coverImage: string | null
  allowDownload: boolean
  watermark: boolean
  expiresAt: Date | null
  photos: Photo[]
  project: {
    name: string
    projectType: string
  }
  photographer: {
    name: string | null
    email: string | null
    phone: string | null
  }
}

interface GalleryViewProps {
  gallery: GalleryData
}

export function GalleryView({ gallery }: GalleryViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)

  const openLightbox = (index: number) => {
    setSelectedPhoto(index)
  }

  const closeLightbox = () => {
    setSelectedPhoto(null)
  }

  const goToPrevious = () => {
    if (selectedPhoto === null) return
    setSelectedPhoto(selectedPhoto === 0 ? gallery.photos.length - 1 : selectedPhoto - 1)
  }

  const goToNext = () => {
    if (selectedPhoto === null) return
    setSelectedPhoto(selectedPhoto === gallery.photos.length - 1 ? 0 : selectedPhoto + 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious()
    if (e.key === "ArrowRight") goToNext()
    if (e.key === "Escape") closeLightbox()
  }

  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement("a")
    link.href = photo.s3Url
    link.download = photo.filename
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAll = () => {
    gallery.photos.forEach((photo, index) => {
      setTimeout(() => downloadPhoto(photo), index * 500)
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Camera className="h-4 w-4" />
                <span>{gallery.photographer.name || "Photographer"}</span>
              </div>
              <h1 className="text-2xl font-bold">{gallery.title}</h1>
              <p className="text-muted-foreground">
                {gallery.project.name} • {gallery.photos.length} photos
              </p>
            </div>
            {gallery.allowDownload && gallery.photos.length > 0 && (
              <Button onClick={downloadAll} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Description */}
      {gallery.description && (
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <p className="text-muted-foreground max-w-2xl">{gallery.description}</p>
        </div>
      )}

      {/* Gallery Grid */}
      <main className="container max-w-7xl mx-auto px-4 py-6">
        {gallery.photos.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No photos yet</h2>
            <p className="text-muted-foreground">
              Photos will appear here once they're uploaded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {gallery.photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="aspect-square relative overflow-hidden rounded-lg bg-muted group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <img
                  src={photo.thumbnailUrl || photo.s3Url}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {gallery.allowDownload && (
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadPhoto(photo)
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium">{gallery.photographer.name || "Photographer"}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {gallery.photographer.email && (
                  <a
                    href={`mailto:${gallery.photographer.email}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {gallery.photographer.email}
                  </a>
                )}
                {gallery.photographer.phone && (
                  <a
                    href={`tel:${gallery.photographer.phone}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {gallery.photographer.phone}
                  </a>
                )}
              </div>
            </div>
            {gallery.expiresAt && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires {new Date(gallery.expiresAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      <Dialog open={selectedPhoto !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          {selectedPhoto !== null && (
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                onClick={closeLightbox}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation */}
              {gallery.photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Image */}
              <img
                src={gallery.photos[selectedPhoto].s3Url}
                alt={gallery.photos[selectedPhoto].filename}
                className="max-w-full max-h-full object-contain"
              />

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <span className="text-sm">
                    {selectedPhoto + 1} / {gallery.photos.length}
                  </span>
                  {gallery.allowDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => downloadPhoto(gallery.photos[selectedPhoto])}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
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
  Heart,
  Play,
} from "lucide-react"
import { ShareButtons } from "./ShareButtons"
import { FavoritesBar } from "./FavoritesBar"
import { Slideshow } from "./Slideshow"
import { DownloadManager } from "./DownloadManager"
import { createFavoriteList } from "@/actions/galleries/create-favorite-list"
import { toggleFavorite } from "@/actions/galleries/toggle-favorite"
import { GALLERY_THEMES, GALLERY_FONTS, type GalleryTheme, type GalleryFont } from "@/lib/gallery-themes"

interface Photo {
  id: string
  filename: string
  s3Url: string
  originalS3Key?: string
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  setId?: string | null
}

interface PhotoSet {
  id: string
  name: string
  description?: string | null
  coverImage?: string | null
  order: number
}

interface GalleryData {
  id: string
  title: string
  description: string | null
  coverImage: string | null
  allowDownload: boolean
  watermark: boolean
  expiresAt: Date | null
  shareToken?: string
  // Theming
  theme?: string
  gridStyle?: string
  fontFamily?: string
  primaryColor?: string
  accentColor?: string
  // Download options
  downloadResolution?: string
  favoriteLimit?: number | null
  // Content
  photos: Photo[]
  photoSets?: PhotoSet[]
  project: {
    name: string
    projectType: string
  }
  photographer: {
    name: string | null
    email: string | null
    phone: string | null
    brandLogo?: string | null
    brandFavicon?: string | null
    brandPrimaryColor?: string
    brandAccentColor?: string
  }
}

interface GalleryViewProps {
  gallery: GalleryData
}

export function GalleryView({ gallery }: GalleryViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [listId, setListId] = useState<string | null>(null)
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [showDownloadManager, setShowDownloadManager] = useState(false)

  const theme = (gallery.theme || "classic") as GalleryTheme
  const themeVars = GALLERY_THEMES[theme]?.vars || GALLERY_THEMES.classic.vars
  const fontKey = (gallery.fontFamily || "inter") as GalleryFont
  const fontDef = GALLERY_FONTS[fontKey] || GALLERY_FONTS.inter
  const gridStyle = gallery.gridStyle || "grid"
  const accentColor = gallery.photographer?.brandAccentColor || gallery.accentColor || "#8b5cf6"
  const primaryColor = gallery.photographer?.brandPrimaryColor || gallery.primaryColor || "#000000"

  // Initialize favorites from localStorage
  useEffect(() => {
    const storageKey = `favorites_${gallery.id}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setFavoriteIds(new Set(data.photoIds || []))
        setListId(data.listId || null)
      } catch {
        // ignore
      }
    }
  }, [gallery.id])

  // Persist favorites to localStorage
  const persistFavorites = useCallback(
    (ids: Set<string>, currentListId: string | null) => {
      const storageKey = `favorites_${gallery.id}`
      localStorage.setItem(
        storageKey,
        JSON.stringify({ photoIds: Array.from(ids), listId: currentListId })
      )
    },
    [gallery.id]
  )

  const handleToggleFavorite = async (photoId: string) => {
    // Check favorite limit
    if (
      gallery.favoriteLimit &&
      !favoriteIds.has(photoId) &&
      favoriteIds.size >= gallery.favoriteLimit
    ) {
      return // At limit, don't add more
    }

    // Ensure we have a list
    let currentListId = listId
    if (!currentListId) {
      const result = await createFavoriteList(gallery.id)
      if (result.error || !result.listId) return
      currentListId = result.listId
      setListId(currentListId)
    }

    // Toggle on server
    const result = await toggleFavorite({
      galleryId: gallery.id,
      photoId,
      listId: currentListId,
    })

    if (result.error) return

    // Update local state
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (result.favorited) {
        next.add(photoId)
      } else {
        next.delete(photoId)
      }
      persistFavorites(next, currentListId)
      return next
    })
  }

  const openLightbox = (index: number) => setSelectedPhoto(index)
  const closeLightbox = () => setSelectedPhoto(null)

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

  const favoritePhotos = gallery.photos.filter((p) => favoriteIds.has(p.id))

  // Determine if favorite limit is reached
  const atFavoriteLimit = gallery.favoriteLimit
    ? favoriteIds.size >= gallery.favoriteLimit
    : false

  // Group photos by sets
  const photosBySet = new Map<string | null, Photo[]>()
  if (gallery.photoSets && gallery.photoSets.length > 0) {
    for (const set of gallery.photoSets) {
      photosBySet.set(set.id, [])
    }
    photosBySet.set(null, []) // uncategorized
    for (const photo of gallery.photos) {
      const bucket = photosBySet.get(photo.setId ?? null) || photosBySet.get(null)!
      bucket.push(photo)
    }
  }

  const hasPhotoSets = gallery.photoSets && gallery.photoSets.length > 0

  // Get global photo index for lightbox from a set photo
  const getGlobalIndex = (photo: Photo) => gallery.photos.findIndex((p) => p.id === photo.id)

  // Render photo grid based on grid style
  const renderPhotoGrid = (photos: Photo[]) => {
    if (gridStyle === "masonry") {
      return (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-2">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={getGlobalIndex(photo)}
              className="mb-2 break-inside-avoid"
              aspectFree
            />
          ))}
        </div>
      )
    }

    if (gridStyle === "column") {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={getGlobalIndex(photo)}
              className="w-full"
              aspectFree
            />
          ))}
        </div>
      )
    }

    if (gridStyle === "row") {
      return (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => {
            const aspect = (photo.width || 4) / (photo.height || 3)
            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={getGlobalIndex(photo)}
                style={{ width: `${Math.max(150, 200 * aspect)}px`, flexGrow: aspect }}
                className="h-48 sm:h-56 md:h-64"
                aspectFree
              />
            )
          })}
        </div>
      )
    }

    // Default: grid
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {photos.map((photo, idx) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={getGlobalIndex(photo)}
          />
        ))}
      </div>
    )
  }

  // Photo card component
  function PhotoCard({
    photo,
    index,
    className = "",
    aspectFree = false,
    style,
  }: {
    photo: Photo
    index: number
    className?: string
    aspectFree?: boolean
    style?: React.CSSProperties
  }) {
    const isFav = favoriteIds.has(photo.id)
    const canFavorite = !atFavoriteLimit || isFav

    return (
      <button
        onClick={() => openLightbox(index)}
        className={`relative overflow-hidden rounded-lg group focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          aspectFree ? "" : "aspect-square"
        } ${className}`}
        style={{
          ...style,
          backgroundColor: "var(--gallery-border)",
          focusRingColor: accentColor,
        } as React.CSSProperties}
      >
        <img
          src={photo.thumbnailUrl || photo.s3Url}
          alt={photo.filename}
          className={`w-full h-full object-cover transition-transform group-hover:scale-105`}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

        {/* Favorite heart button */}
        <div
          className={`absolute top-2 left-2 transition-opacity ${
            isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            disabled={!canFavorite && !isFav}
            onClick={(e) => {
              e.stopPropagation()
              handleToggleFavorite(photo.id)
            }}
          >
            <Heart
              className={`h-4 w-4 ${
                isFav ? "text-red-500 fill-red-500" : "text-foreground"
              }`}
            />
          </Button>
        </div>

        {/* Download button */}
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
    )
  }

  // Build theme style vars
  const themeStyle: Record<string, string> = {
    ...themeVars,
    "--gallery-accent": accentColor,
    "--gallery-primary": primaryColor,
    fontFamily: fontDef.family,
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: themeVars["--gallery-bg"],
        color: themeVars["--gallery-text"],
        ...themeStyle,
      }}
    >
      {/* Google Font */}
      {fontKey !== "inter" && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${fontDef.google}&display=swap`}
        />
      )}

      {/* Header */}
      <header
        className="border-b sticky top-0 z-40 backdrop-blur"
        style={{
          backgroundColor: themeVars["--gallery-header-bg"] + "ee",
          borderColor: themeVars["--gallery-border"],
        }}
      >
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {gallery.photographer.brandLogo ? (
                <div className="mb-2">
                  <img
                    src={gallery.photographer.brandLogo}
                    alt={gallery.photographer.name || "Photographer"}
                    className="h-12 max-w-[200px] object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm mb-1" style={{ color: themeVars["--gallery-muted"] }}>
                  <Camera className="h-4 w-4" />
                  <span>{gallery.photographer.name || "Photographer"}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold">{gallery.title}</h1>
              <p style={{ color: themeVars["--gallery-muted"] }}>
                {gallery.project.name} &bull; {gallery.photos.length} photos
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {gallery.photos.length > 1 && (
                <Button
                  onClick={() => setShowSlideshow(true)}
                  variant={theme === "dark" ? "secondary" : "outline"}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Slideshow
                </Button>
              )}
              <ShareButtons
                title={gallery.title}
                url={typeof window !== "undefined" ? window.location.href : ""}
                description={gallery.description || `${gallery.photos.length} photos from ${gallery.project.name}`}
                coverImage={gallery.coverImage}
              />
              {gallery.allowDownload && gallery.photos.length > 0 && (
                <Button
                  onClick={() => setShowDownloadManager(true)}
                  variant={theme === "dark" ? "secondary" : "outline"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              )}
            </div>
          </div>

          {/* Favorite limit indicator */}
          {gallery.favoriteLimit && (
            <div className="mt-2 text-sm" style={{ color: themeVars["--gallery-muted"] }}>
              Favorites: {favoriteIds.size} of {gallery.favoriteLimit} selected
              {atFavoriteLimit && <span className="ml-2 font-medium" style={{ color: accentColor }}>Limit reached</span>}
            </div>
          )}
        </div>
      </header>

      {/* Description */}
      {gallery.description && (
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <p className="max-w-2xl" style={{ color: themeVars["--gallery-muted"] }}>{gallery.description}</p>
        </div>
      )}

      {/* Gallery Grid */}
      <main className="container max-w-7xl mx-auto px-4 py-6 pb-24">
        {gallery.photos.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="h-16 w-16 mx-auto mb-4" style={{ color: themeVars["--gallery-muted"] }} />
            <h2 className="text-xl font-semibold mb-2">No photos yet</h2>
            <p style={{ color: themeVars["--gallery-muted"] }}>
              Photos will appear here once they&apos;re uploaded.
            </p>
          </div>
        ) : hasPhotoSets ? (
          // Render by sets
          <div className="space-y-12">
            {gallery.photoSets!.map((set) => {
              const setPhotos = photosBySet.get(set.id) || []
              if (setPhotos.length === 0) return null
              return (
                <section key={set.id}>
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">{set.name}</h2>
                    {set.description && (
                      <p className="text-sm mt-1" style={{ color: themeVars["--gallery-muted"] }}>
                        {set.description}
                      </p>
                    )}
                  </div>
                  {renderPhotoGrid(setPhotos)}
                </section>
              )
            })}
            {/* Uncategorized photos */}
            {(photosBySet.get(null)?.length ?? 0) > 0 && (
              <section>
                {gallery.photoSets!.length > 0 && (
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">More Photos</h2>
                  </div>
                )}
                {renderPhotoGrid(photosBySet.get(null)!)}
              </section>
            )}
          </div>
        ) : (
          renderPhotoGrid(gallery.photos)
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12" style={{ borderColor: themeVars["--gallery-border"] }}>
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {gallery.photographer.brandLogo ? (
                <img
                  src={gallery.photographer.brandLogo}
                  alt={gallery.photographer.name || "Photographer"}
                  className="h-8 max-w-[160px] object-contain mb-2"
                />
              ) : (
                <p className="font-medium">{gallery.photographer.name || "Photographer"}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-2 text-sm" style={{ color: themeVars["--gallery-muted"] }}>
                {gallery.photographer.email && (
                  <a
                    href={`mailto:${gallery.photographer.email}`}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  >
                    <Mail className="h-4 w-4" />
                    {gallery.photographer.email}
                  </a>
                )}
                {gallery.photographer.phone && (
                  <a
                    href={`tel:${gallery.photographer.phone}`}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
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

      {/* Favorites Bar */}
      {listId && favoritePhotos.length > 0 && (
        <FavoritesBar
          favoritePhotos={favoritePhotos}
          listId={listId}
          galleryTitle={gallery.title}
        />
      )}

      {/* Slideshow */}
      {showSlideshow && (
        <Slideshow
          photos={gallery.photos}
          onClose={() => setShowSlideshow(false)}
        />
      )}

      {/* Download Manager */}
      {showDownloadManager && (
        <DownloadManager
          galleryId={gallery.id}
          photos={gallery.photos}
          galleryTitle={gallery.title}
          onClose={() => setShowDownloadManager(false)}
        />
      )}

      {/* Lightbox */}
      <Dialog open={selectedPhoto !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 border-none"
          style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
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
                  <div className="flex items-center gap-2">
                    {/* Favorite button in lightbox */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      disabled={
                        atFavoriteLimit && !favoriteIds.has(gallery.photos[selectedPhoto].id)
                      }
                      onClick={() => handleToggleFavorite(gallery.photos[selectedPhoto].id)}
                    >
                      <Heart
                        className={`h-4 w-4 mr-2 ${
                          favoriteIds.has(gallery.photos[selectedPhoto].id)
                            ? "text-red-500 fill-red-500"
                            : ""
                        }`}
                      />
                      {favoriteIds.has(gallery.photos[selectedPhoto].id) ? "Favorited" : "Favorite"}
                    </Button>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

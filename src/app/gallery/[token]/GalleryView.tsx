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
  Info,
  ArrowLeft,
  Search,
} from "lucide-react"
import { ShareButtons } from "./ShareButtons"
import { FavoritesBar } from "./FavoritesBar"
import { Slideshow } from "./Slideshow"
import { DownloadManager } from "./DownloadManager"
import { GallerySearch } from "./GallerySearch"
import { PhotoInfoPanel } from "./PhotoInfoPanel"
import { PeopleRow } from "./PeopleRow"
import { createFavoriteList } from "@/actions/galleries/create-favorite-list"
import { toggleFavorite } from "@/actions/galleries/toggle-favorite"
import { GALLERY_THEMES, GALLERY_FONTS, type GalleryTheme, type GalleryFont } from "@/lib/gallery-themes"

interface PhotoAnalysisData {
  searchTags: string[]
  description: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  faceData: any
  faceCount: number
}

interface Photo {
  id: string
  filename: string
  s3Url: string
  originalS3Key?: string
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  setId?: string | null
  analysis?: PhotoAnalysisData | null
}

interface PhotoSet {
  id: string
  name: string
  description?: string | null
  coverImage?: string | null
  order: number
}

interface PersonCluster {
  id: string
  name: string | null
  role: string | null
  description: string | null
  photoIds: string[]
  faceDescription: string | null
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
  // AI Search
  aiSearchEnabled?: boolean
  // Content
  photos: Photo[]
  photoSets?: PhotoSet[]
  personClusters?: PersonCluster[]
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
  const [searchResults, setSearchResults] = useState<Set<string> | null>(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<{
    clusterId: string
    name: string | null
    role: string | null
    photoIds: string[]
    description: string | null
  } | null>(null)
  const [activeSetId, setActiveSetId] = useState<string | null>(null)
  const [showSearchPanel, setShowSearchPanel] = useState(false)

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
  const closeLightbox = () => {
    setSelectedPhoto(null)
    setShowInfoPanel(false)
  }

  const hasPhotoSets = gallery.photoSets && gallery.photoSets.length > 0

  // Determine if favorite limit is reached
  const atFavoriteLimit = gallery.favoriteLimit
    ? favoriteIds.size >= gallery.favoriteLimit
    : false

  // Filter photos by person selection, search results, or active tab
  const displayPhotos = selectedPerson
    ? gallery.photos.filter((p) => selectedPerson.photoIds.includes(p.id))
    : searchResults
      ? gallery.photos.filter((p) => searchResults.has(p.id))
      : hasPhotoSets && activeSetId !== null
        ? gallery.photos.filter((p) => p.setId === activeSetId)
        : gallery.photos

  const goToPrevious = () => {
    if (selectedPhoto === null) return
    setShowInfoPanel(false)
    const currentIdx = displayPhotos.findIndex((p) => p.id === gallery.photos[selectedPhoto]?.id)
    if (currentIdx < 0) return
    const prevIdx = currentIdx <= 0 ? displayPhotos.length - 1 : currentIdx - 1
    const globalIdx = gallery.photos.findIndex((p) => p.id === displayPhotos[prevIdx]?.id)
    if (globalIdx >= 0) setSelectedPhoto(globalIdx)
  }

  const goToNext = () => {
    if (selectedPhoto === null) return
    setShowInfoPanel(false)
    const currentIdx = displayPhotos.findIndex((p) => p.id === gallery.photos[selectedPhoto]?.id)
    if (currentIdx < 0) return
    const nextIdx = currentIdx >= displayPhotos.length - 1 ? 0 : currentIdx + 1
    const globalIdx = gallery.photos.findIndex((p) => p.id === displayPhotos[nextIdx]?.id)
    if (globalIdx >= 0) setSelectedPhoto(globalIdx)
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

  // Handle person selection (from info panel or people row)
  const handleSelectPerson = (person: {
    clusterId: string
    name: string | null
    role: string | null
    photoIds: string[]
    description: string | null
  } | null) => {
    setSelectedPerson(person)
    setSearchResults(null)
    setShowInfoPanel(false)
    closeLightbox()
  }

  // Get global photo index for lightbox from a set photo
  const getGlobalIndex = (photo: Photo) => gallery.photos.findIndex((p) => p.id === photo.id)

  // Section heading title
  const sectionTitle = searchResults
    ? "Search Results"
    : hasPhotoSets && activeSetId !== null
      ? gallery.photoSets!.find((s) => s.id === activeSetId)?.name || gallery.title
      : gallery.title

  // Render photo grid based on grid style
  const renderPhotoGrid = (photos: Photo[]) => {
    if (gridStyle === "masonry") {
      return (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-[3px]">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={getGlobalIndex(photo)}
              className="mb-[3px] break-inside-avoid"
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
        <div className="flex flex-wrap gap-[3px]">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[3px]">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={getGlobalIndex(photo)}
          />
        ))}
      </div>
    )
  }

  // Photo card component — PicTime style
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
        className={`relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 ${
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
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

        {/* Favorite heart — simple white icon with drop shadow */}
        <div
          className={`absolute top-2 left-2 transition-opacity ${
            isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            disabled={!canFavorite && !isFav}
            onClick={(e) => {
              e.stopPropagation()
              handleToggleFavorite(photo.id)
            }}
            className="p-1 focus:outline-none disabled:opacity-40"
          >
            <Heart
              className={`h-5 w-5 drop-shadow-md ${
                isFav ? "text-red-500 fill-red-500" : "text-white fill-white/30"
              }`}
            />
          </button>
        </div>
      </button>
    )
  }

  // Tab button component — PicTime style
  function TabButton({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
  }) {
    return (
      <button
        onClick={onClick}
        className={`relative px-3 py-3 text-xs font-medium uppercase tracking-[0.15em] transition-colors whitespace-nowrap ${
          active ? "" : "opacity-60 hover:opacity-80"
        }`}
        style={{ color: active ? themeVars["--gallery-text"] : themeVars["--gallery-muted"] }}
      >
        {children}
        {active && (
          <span
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{ backgroundColor: accentColor }}
          />
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

      {/* PicTime-style Navigation Bar */}
      <header
        className="border-b sticky top-0 z-40 backdrop-blur"
        style={{
          backgroundColor: themeVars["--gallery-header-bg"] + "ee",
          borderColor: themeVars["--gallery-border"],
        }}
      >
        <div className="container max-w-7xl mx-auto px-4">
          {/* Main nav row */}
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo / Photographer name */}
            <div className="shrink-0">
              {gallery.photographer.brandLogo ? (
                <img
                  src={gallery.photographer.brandLogo}
                  alt={gallery.photographer.name || "Photographer"}
                  className="h-8 max-w-[160px] object-contain"
                />
              ) : (
                <div
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: themeVars["--gallery-text"] }}
                >
                  <Camera className="h-4 w-4" />
                  <span>{gallery.photographer.name || "Photographer"}</span>
                </div>
              )}
            </div>

            {/* Center: Photo set tabs (desktop) */}
            {hasPhotoSets && !selectedPerson && !searchResults && (
              <nav className="hidden md:flex items-center gap-1">
                <TabButton
                  active={activeSetId === null}
                  onClick={() => setActiveSetId(null)}
                >
                  ALL
                </TabButton>
                {gallery.photoSets!.map((set) => (
                  <TabButton
                    key={set.id}
                    active={activeSetId === set.id}
                    onClick={() => setActiveSetId(set.id)}
                  >
                    {set.name.toUpperCase()}
                  </TabButton>
                ))}
              </nav>
            )}

            {/* Right: Icon action buttons */}
            <div className="flex items-center gap-0.5">
              {gallery.aiSearchEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowSearchPanel(!showSearchPanel)}
                  style={{ color: showSearchPanel ? accentColor : themeVars["--gallery-text"] }}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
              <ShareButtons
                title={gallery.title}
                url={typeof window !== "undefined" ? window.location.href : ""}
                description={gallery.description || `${gallery.photos.length} photos from ${gallery.project.name}`}
                coverImage={gallery.coverImage}
                iconOnly
                style={{ color: themeVars["--gallery-text"] }}
              />
              {favoriteIds.size > 0 && (
                <div className="relative flex items-center justify-center h-9 w-9">
                  <Heart className="h-4 w-4" style={{ color: themeVars["--gallery-text"] }} />
                  <span
                    className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1"
                    style={{ backgroundColor: accentColor }}
                  >
                    {favoriteIds.size}
                  </span>
                </div>
              )}
              {gallery.allowDownload && gallery.photos.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowDownloadManager(true)}
                  style={{ color: themeVars["--gallery-text"] }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {gallery.photos.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowSlideshow(true)}
                  style={{ color: themeVars["--gallery-text"] }}
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile tabs row */}
          {hasPhotoSets && !selectedPerson && !searchResults && (
            <div
              className="md:hidden overflow-x-auto flex gap-1 pb-2 -mx-4 px-4"
              style={{ scrollbarWidth: "none" }}
            >
              <TabButton
                active={activeSetId === null}
                onClick={() => setActiveSetId(null)}
              >
                ALL
              </TabButton>
              {gallery.photoSets!.map((set) => (
                <TabButton
                  key={set.id}
                  active={activeSetId === set.id}
                  onClick={() => setActiveSetId(set.id)}
                >
                  {set.name.toUpperCase()}
                </TabButton>
              ))}
            </div>
          )}

          {/* Favorite limit indicator */}
          {gallery.favoriteLimit && (
            <div className="pb-2 text-xs" style={{ color: themeVars["--gallery-muted"] }}>
              Favorites: {favoriteIds.size} / {gallery.favoriteLimit}
              {atFavoriteLimit && (
                <span className="ml-2 font-medium" style={{ color: accentColor }}>
                  Limit reached
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Collapsible Search Panel */}
      {showSearchPanel && gallery.aiSearchEnabled && (
        <div className="container max-w-7xl mx-auto px-4 pt-4">
          <div
            className="p-3 rounded-lg border"
            style={{
              borderColor: themeVars["--gallery-border"],
              backgroundColor: themeVars["--gallery-card-bg"] || themeVars["--gallery-bg"],
            }}
          >
            <GallerySearch
              galleryId={gallery.id}
              photos={gallery.photos}
              totalPhotos={gallery.photos.length}
              onSearchResults={(results) => {
                setSearchResults(results)
                if (results) setSelectedPerson(null)
              }}
              personClusters={gallery.personClusters || []}
              themeVars={themeVars}
              accentColor={accentColor}
            />
          </div>
        </div>
      )}

      {/* People Row */}
      {(gallery.personClusters?.length ?? 0) > 0 && !selectedPerson && (
        <div className="container max-w-7xl mx-auto px-4 pt-4">
          <PeopleRow
            personClusters={gallery.personClusters!}
            photos={gallery.photos}
            selectedPersonId={null}
            onSelectPerson={handleSelectPerson}
            themeVars={themeVars}
            accentColor={accentColor}
          />
        </div>
      )}

      {/* Person View Header */}
      {selectedPerson && (
        <div className="container max-w-7xl mx-auto px-4 pt-4">
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              backgroundColor: themeVars["--gallery-card-bg"] || themeVars["--gallery-bg"],
              borderColor: themeVars["--gallery-border"],
              border: "1px solid",
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setSelectedPerson(null)}
              style={{ color: themeVars["--gallery-text"] }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {selectedPerson.name || selectedPerson.role || "Unknown Person"}
              </p>
              <p className="text-sm" style={{ color: themeVars["--gallery-muted"] }}>
                {displayPhotos.length} photo{displayPhotos.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPerson(null)}
              style={{ color: accentColor }}
            >
              Back to all photos
            </Button>
          </div>
        </div>
      )}

      {/* Centered Section Heading */}
      {!selectedPerson && (
        <div className="text-center py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-[0.2em]">
            {sectionTitle}
          </h1>
          {!searchResults && !hasPhotoSets && gallery.description && (
            <p
              className="mt-2 text-sm max-w-lg mx-auto px-4"
              style={{ color: themeVars["--gallery-muted"] }}
            >
              {gallery.description}
            </p>
          )}
          <p
            className="mt-1 text-xs uppercase tracking-[0.1em]"
            style={{ color: themeVars["--gallery-muted"] }}
          >
            {displayPhotos.length} photo{displayPhotos.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      <main className="container max-w-7xl mx-auto px-4 pb-24">
        {displayPhotos.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="h-16 w-16 mx-auto mb-4" style={{ color: themeVars["--gallery-muted"] }} />
            <h2 className="text-xl font-semibold mb-2">
              {searchResults || selectedPerson ? "No matching photos" : "No photos yet"}
            </h2>
            <p style={{ color: themeVars["--gallery-muted"] }}>
              {searchResults || selectedPerson
                ? "Try a different search term."
                : "Photos will appear here once they're uploaded."}
            </p>
          </div>
        ) : (
          renderPhotoGrid(displayPhotos)
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
                loading="eager"
                className="max-w-full max-h-full object-contain"
              />

              {/* Photo Info Panel */}
              {showInfoPanel && (
                <PhotoInfoPanel
                  photo={gallery.photos[selectedPhoto]}
                  galleryId={gallery.id}
                  personClusters={gallery.personClusters || []}
                  onSelectPerson={handleSelectPerson}
                  onClose={() => setShowInfoPanel(false)}
                  themeVars={themeVars}
                  accentColor={accentColor}
                />
              )}

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <span className="text-sm">
                    {selectedPhoto + 1} / {gallery.photos.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Info button */}
                    {gallery.photos[selectedPhoto].analysis && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        Info
                      </Button>
                    )}
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

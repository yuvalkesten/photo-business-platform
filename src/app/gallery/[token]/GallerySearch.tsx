"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, Loader2, Sparkles } from "lucide-react"
import { searchGalleryPhotosAction } from "@/actions/galleries/search-photos"

interface PhotoWithAnalysis {
  id: string
  analysis?: {
    searchTags: string[]
  } | null
}

interface GallerySearchProps {
  galleryId: string
  photos: PhotoWithAnalysis[]
  totalPhotos: number
  onSearchResults: (photoIds: Set<string> | null) => void
  themeVars: Record<string, string>
  accentColor: string
}

export function GallerySearch({
  galleryId,
  photos,
  totalPhotos,
  onSearchResults,
  themeVars,
  accentColor,
}: GallerySearchProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [searchMode, setSearchMode] = useState<"instant" | "ai" | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        onSearchResults(null)
        setResultCount(null)
        setSearchMode(null)
        return
      }

      const words = searchQuery.trim().toLowerCase().split(/\s+/)

      // Instant mode: client-side tag matching for simple queries
      if (words.length <= 2) {
        const matchingIds = new Set<string>()
        for (const photo of photos) {
          if (!photo.analysis?.searchTags) continue
          const tags = photo.analysis.searchTags.map((t) => t.toLowerCase())
          if (words.some((w) => tags.some((t) => t.includes(w)))) {
            matchingIds.add(photo.id)
          }
        }

        if (matchingIds.size > 0) {
          onSearchResults(matchingIds)
          setResultCount(matchingIds.size)
          setSearchMode("instant")
          return
        }
      }

      // AI search mode: server-side RAG for complex queries or when instant finds nothing
      setIsSearching(true)
      setSearchMode("ai")
      try {
        const result = await searchGalleryPhotosAction(galleryId, searchQuery)
        if (result.results) {
          const ids = new Set(result.results.map((r) => r.photoId))
          onSearchResults(ids.size > 0 ? ids : new Set())
          setResultCount(ids.size)
        } else {
          onSearchResults(new Set())
          setResultCount(0)
        }
      } catch {
        onSearchResults(null)
        setResultCount(null)
        setSearchMode(null)
      } finally {
        setIsSearching(false)
      }
    },
    [galleryId, photos, onSearchResults]
  )

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        performSearch(value)
      }, 300)
    },
    [performSearch]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const clearSearch = () => {
    setQuery("")
    onSearchResults(null)
    setResultCount(null)
    setSearchMode(null)
  }

  return (
    <div className="w-full">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: themeVars["--gallery-muted"] }}
          />
          <Input
            type="text"
            placeholder='Search photos... e.g. "bride hugging kids"'
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-10 pr-10"
            style={{
              backgroundColor: themeVars["--gallery-card-bg"] || themeVars["--gallery-bg"],
              borderColor: themeVars["--gallery-border"],
              color: themeVars["--gallery-text"],
            }}
          />
          {isSearching && (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
              style={{ color: accentColor }}
            />
          )}
          {!isSearching && query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4" style={{ color: themeVars["--gallery-muted"] }} />
            </button>
          )}
        </div>
      </div>

      {/* Results indicator */}
      {resultCount !== null && (
        <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: themeVars["--gallery-muted"] }}>
          {resultCount > 0 ? (
            <>
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: accentColor + "20", color: accentColor }}
              >
                {resultCount} of {totalPhotos} photos
              </Badge>
              {searchMode === "ai" && (
                <span className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3" style={{ color: accentColor }} />
                  AI search
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={clearSearch}
                style={{ color: themeVars["--gallery-muted"] }}
              >
                Clear
              </Button>
            </>
          ) : (
            <>
              <span>No photos match &ldquo;{query}&rdquo;</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={clearSearch}
                style={{ color: themeVars["--gallery-muted"] }}
              >
                Clear search
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

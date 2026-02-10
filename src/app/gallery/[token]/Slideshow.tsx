"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
} from "lucide-react"

interface Photo {
  id: string
  filename: string
  s3Url: string
  thumbnailUrl: string | null
}

interface SlideshowProps {
  photos: Photo[]
  onClose: () => void
  startIndex?: number
}

const SPEED_OPTIONS = [3, 5, 8] as const

export function Slideshow({ photos, onClose, startIndex = 0 }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState<number>(5)
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextImageRef = useRef<HTMLImageElement | null>(null)

  const goTo = useCallback(
    (index: number) => {
      setTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(index)
        setTransitioning(false)
      }, 300)
    },
    []
  )

  const goNext = useCallback(() => {
    goTo(currentIndex === photos.length - 1 ? 0 : currentIndex + 1)
  }, [currentIndex, photos.length, goTo])

  const goPrevious = useCallback(() => {
    goTo(currentIndex === 0 ? photos.length - 1 : currentIndex - 1)
  }, [currentIndex, photos.length, goTo])

  // Auto-advance
  useEffect(() => {
    if (!isPlaying) return
    timerRef.current = setTimeout(goNext, speed * 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentIndex, speed, goNext])

  // Preload next image
  useEffect(() => {
    const nextIdx = currentIndex === photos.length - 1 ? 0 : currentIndex + 1
    const img = new Image()
    img.src = photos[nextIdx].s3Url
    nextImageRef.current = img
  }, [currentIndex, photos])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
          e.preventDefault()
          setIsPlaying((p) => !p)
          break
        case "ArrowLeft":
          goPrevious()
          break
        case "ArrowRight":
          goNext()
          break
        case "Escape":
          onClose()
          break
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goNext, goPrevious, onClose])

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(speed as (typeof SPEED_OPTIONS)[number])
    setSpeed(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length])
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Photo */}
      <img
        src={photos[currentIndex].s3Url}
        alt={photos[currentIndex].filename}
        className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
          transitioning ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={goPrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-12 w-12"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={goNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <span className="text-white/70 text-sm tabular-nums">
            {currentIndex + 1} / {photos.length}
          </span>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/20"
              onClick={cycleSpeed}
            >
              <Clock className="h-4 w-4 mr-1" />
              {speed}s
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

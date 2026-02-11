"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"

interface FaceThumbnailProps {
  photoUrl: string
  position: { x: number; y: number; width: number; height: number }
  size?: number
  name?: string | null
  onClick?: () => void
  className?: string
  highlight?: boolean
  accentColor?: string
}

export function FaceThumbnail({
  photoUrl,
  position,
  size = 48,
  name,
  onClick,
  className = "",
  highlight = false,
  accentColor,
}: FaceThumbnailProps) {
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!photoUrl || !position) {
      setLoading(false)
      setError(true)
      return
    }

    const img = new Image()
    img.onload = () => {
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight })
      setLoading(false)
    }
    img.onerror = () => {
      setError(true)
      setLoading(false)
    }
    img.src = photoUrl
  }, [photoUrl, position])

  const ringStyle = highlight && accentColor
    ? { boxShadow: `0 0 0 2px ${accentColor}` }
    : {}

  // Calculate CSS positioning to zoom into the face
  let imgStyle: React.CSSProperties = {}
  if (imgDims) {
    const padding = 1.4 // 20% padding on each side
    const facePixW = position.width * imgDims.w * padding
    const facePixH = position.height * imgDims.h * padding
    const facePixSize = Math.max(facePixW, facePixH, 1)
    const scale = size / facePixSize

    const faceCx = (position.x + position.width / 2) * imgDims.w
    const faceCy = (position.y + position.height / 2) * imgDims.h

    imgStyle = {
      position: "absolute",
      width: imgDims.w * scale,
      height: imgDims.h * scale,
      left: -(faceCx * scale - size / 2),
      top: -(faceCy * scale - size / 2),
      maxWidth: "none",
    }
  }

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 shrink-0 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <div
        className="rounded-full overflow-hidden relative bg-muted"
        style={{ width: size, height: size, ...ringStyle }}
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        ) : error || !imgDims ? (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={photoUrl}
            alt={name || "Person"}
            style={imgStyle}
            draggable={false}
          />
        )}
      </div>

      {name !== undefined && (
        <span
          className="text-xs truncate max-w-[60px] text-center leading-tight"
          title={name || undefined}
        >
          {name || ""}
        </span>
      )}
    </div>
  )
}

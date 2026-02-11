"use client"

import { useState, useEffect, useRef } from "react"
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
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!photoUrl || !position) return

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const canvas = canvasRef.current
        if (!canvas) return

        // Calculate crop region with 20% padding
        const padding = 0.2
        const cx = position.x * img.naturalWidth
        const cy = position.y * img.naturalHeight
        const cw = position.width * img.naturalWidth
        const ch = position.height * img.naturalHeight

        const padX = cw * padding
        const padY = ch * padding

        const sx = Math.max(0, cx - padX)
        const sy = Math.max(0, cy - padY)
        const sw = Math.min(img.naturalWidth - sx, cw + padX * 2)
        const sh = Math.min(img.naturalHeight - sy, ch + padY * 2)

        // Make square crop from the center
        const cropSize = Math.max(sw, sh)
        const finalSx = Math.max(0, sx - (cropSize - sw) / 2)
        const finalSy = Math.max(0, sy - (cropSize - sh) / 2)
        const finalSize = Math.min(
          cropSize,
          img.naturalWidth - finalSx,
          img.naturalHeight - finalSy
        )

        const outputSize = size * 2 // 2x for retina
        canvas.width = outputSize
        canvas.height = outputSize

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          setFailed(true)
          setLoading(false)
          return
        }

        // Draw circular clip
        ctx.beginPath()
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
        ctx.clip()

        ctx.drawImage(
          img,
          finalSx,
          finalSy,
          finalSize,
          finalSize,
          0,
          0,
          outputSize,
          outputSize
        )

        setDataUrl(canvas.toDataURL("image/jpeg", 0.8))
        setLoading(false)
      } catch {
        setFailed(true)
        setLoading(false)
      }
    }

    img.onerror = () => {
      setFailed(true)
      setLoading(false)
    }

    img.src = photoUrl
  }, [photoUrl, position, size])

  const ringStyle = highlight && accentColor
    ? { boxShadow: `0 0 0 2px ${accentColor}` }
    : {}

  const wrapperClasses = `inline-flex flex-col items-center gap-1 ${
    onClick ? "cursor-pointer" : ""
  } ${className}`

  return (
    <div className={wrapperClasses} onClick={onClick}>
      <canvas ref={canvasRef} className="hidden" />

      {loading ? (
        <div
          className="rounded-full bg-muted flex items-center justify-center"
          style={{ width: size, height: size, ...ringStyle }}
        >
          <User className="h-1/2 w-1/2 text-muted-foreground" />
        </div>
      ) : failed || !dataUrl ? (
        /* CSS fallback when canvas fails (CORS) */
        <div
          className="rounded-full overflow-hidden"
          style={{ width: size, height: size, ...ringStyle }}
        >
          <img
            src={photoUrl}
            alt={name || "Person"}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${position.x * 100 + position.width * 50}% ${
                position.y * 100 + position.height * 50
              }%`,
              transform: `scale(${1 / Math.min(position.width, position.height)})`,
            }}
          />
        </div>
      ) : (
        <img
          src={dataUrl}
          alt={name || "Person"}
          className="rounded-full object-cover"
          style={{ width: size, height: size, ...ringStyle }}
        />
      )}

      {name !== undefined && (
        <span
          className="text-xs truncate max-w-[60px] text-center"
          title={name || undefined}
        >
          {name || ""}
        </span>
      )}
    </div>
  )
}

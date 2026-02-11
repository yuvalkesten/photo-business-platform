"use client"

import { useRef, useEffect, useState } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FaceThumbnail } from "@/components/features/galleries/FaceThumbnail"

interface FaceDataEntry {
  faceId: string
  appearance: string
  role: string | null
  expression: string
  ageRange: string
  position: { x: number; y: number; width: number; height: number }
  personClusterId?: string
}

interface PersonCluster {
  id: string
  name: string | null
  role: string | null
  description: string | null
  photoIds: string[]
  faceDescription: string | null
}

interface PhotoInfoPanelProps {
  photo: {
    id: string
    s3Url: string
    thumbnailUrl: string | null
    analysis?: {
      searchTags: string[]
      description: string | null
      faceData: unknown
      faceCount: number
    } | null
  }
  galleryId: string
  personClusters: PersonCluster[]
  onSelectPerson: (cluster: {
    clusterId: string
    name: string | null
    role: string | null
    photoIds: string[]
    description: string | null
  }) => void
  onClose: () => void
  themeVars: Record<string, string>
  accentColor: string
}

export function PhotoInfoPanel({
  photo,
  galleryId,
  personClusters,
  onSelectPerson,
  onClose,
  themeVars,
  accentColor,
}: PhotoInfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [loadingFaceId, setLoadingFaceId] = useState<string | null>(null)

  const faces = (photo.analysis?.faceData as FaceDataEntry[] | null) || []
  const description = photo.analysis?.description
  const tags = photo.analysis?.searchTags || []

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the opening click triggering close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClick)
    }
  }, [onClose])

  const getClusterForFace = (face: FaceDataEntry): PersonCluster | undefined => {
    if (!face.personClusterId) return undefined
    return personClusters.find((c) => c.id === face.personClusterId)
  }

  const getFaceLabel = (face: FaceDataEntry): string => {
    const cluster = getClusterForFace(face)
    if (cluster?.name) return cluster.name
    if (cluster?.role) return cluster.role
    if (face.role) return face.role
    return "Unknown"
  }

  const handleFaceClick = async (face: FaceDataEntry) => {
    const cluster = getClusterForFace(face)

    // If face has a known cluster, navigate directly
    if (cluster) {
      onSelectPerson({
        clusterId: cluster.id,
        name: cluster.name,
        role: cluster.role,
        photoIds: cluster.photoIds,
        description: cluster.description,
      })
      return
    }

    // Fallback: use find-person API for unclustered faces
    setLoadingFaceId(face.faceId)
    try {
      const response = await fetch(
        `/api/galleries/${galleryId}/find-person?photoId=${photo.id}&faceId=${face.faceId}`
      )
      const data = await response.json()
      if (data.success && data.photoIds) {
        onSelectPerson({
          clusterId: data.clusterId || face.faceId,
          name: data.personName || null,
          role: data.personRole || face.role,
          photoIds: data.photoIds,
          description: data.personDescription || null,
        })
      }
    } catch (error) {
      console.error("Find person failed:", error)
    } finally {
      setLoadingFaceId(null)
    }
  }

  const photoUrl = photo.thumbnailUrl || photo.s3Url

  return (
    <div
      ref={panelRef}
      className="absolute bottom-0 left-0 right-0 z-50 rounded-t-xl overflow-hidden animate-in slide-in-from-bottom duration-200"
      style={{
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="p-4 max-h-[50vh] overflow-y-auto">
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* People in this photo */}
        {faces.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">
              People in this photo
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {faces.map((face) => (
                <div key={face.faceId} className="relative">
                  <FaceThumbnail
                    photoUrl={photoUrl}
                    position={face.position}
                    size={56}
                    name={getFaceLabel(face)}
                    onClick={() => handleFaceClick(face)}
                    className="hover:opacity-80 transition-opacity"
                    accentColor={accentColor}
                  />
                  {loadingFaceId === face.faceId && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-black/50 p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
              About this photo
            </h3>
            <p className="text-sm text-white/80">{description}</p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-white/10 text-white/80 hover:bg-white/20 border-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

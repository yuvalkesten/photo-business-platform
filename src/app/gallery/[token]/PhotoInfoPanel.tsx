"use client"

import { useRef, useEffect } from "react"
import { X } from "lucide-react"
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
  personClusters,
  onSelectPerson,
  onClose,
  themeVars,
  accentColor,
}: PhotoInfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

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

  const handleFaceClick = (face: FaceDataEntry) => {
    const cluster = getClusterForFace(face)
    if (cluster) {
      onSelectPerson({
        clusterId: cluster.id,
        name: cluster.name,
        role: cluster.role,
        photoIds: cluster.photoIds,
        description: cluster.description,
      })
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
              {faces.map((face) => {
                const cluster = getClusterForFace(face)
                const hasCluster = !!cluster

                return (
                  <FaceThumbnail
                    key={face.faceId}
                    photoUrl={photoUrl}
                    position={face.position}
                    size={56}
                    name={getFaceLabel(face)}
                    onClick={hasCluster ? () => handleFaceClick(face) : undefined}
                    className={hasCluster ? "hover:opacity-80 transition-opacity" : "opacity-70"}
                    accentColor={accentColor}
                  />
                )
              })}
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

"use client"

import { useMemo } from "react"
import { FaceThumbnail } from "@/components/features/galleries/FaceThumbnail"

interface FaceDataEntry {
  faceId: string
  position: { x: number; y: number; width: number; height: number }
  personClusterId?: string
}

interface PersonCluster {
  id: string
  name: string | null
  role: string | null
  photoIds: string[]
  description: string | null
  faceDescription: string | null
}

interface Photo {
  id: string
  thumbnailUrl: string | null
  s3Url: string
  analysis?: {
    faceData: unknown
    faceCount: number
  } | null
}

interface PeopleRowProps {
  personClusters: PersonCluster[]
  photos: Photo[]
  selectedPersonId: string | null
  onSelectPerson: (person: {
    clusterId: string
    name: string | null
    role: string | null
    photoIds: string[]
    description: string | null
  } | null) => void
  themeVars: Record<string, string>
  accentColor: string
}

export function PeopleRow({
  personClusters,
  photos,
  selectedPersonId,
  onSelectPerson,
  themeVars,
  accentColor,
}: PeopleRowProps) {
  // Filter to clusters with 2+ photos, sort by count desc, cap at 20
  const displayClusters = useMemo(() => {
    return personClusters
      .filter((c) => c.photoIds.length >= 2)
      .sort((a, b) => b.photoIds.length - a.photoIds.length)
      .slice(0, 20)
  }, [personClusters])

  // For each cluster, find the face position from its first photo's faceData
  const clusterThumbnails = useMemo(() => {
    const photoMap = new Map(photos.map((p) => [p.id, p]))

    return displayClusters.map((cluster) => {
      // Find first photo in cluster that exists
      let thumbnailUrl = ""
      let facePosition = { x: 0.3, y: 0.2, width: 0.4, height: 0.4 } // default center

      for (const photoId of cluster.photoIds) {
        const photo = photoMap.get(photoId)
        if (!photo) continue

        thumbnailUrl = photo.thumbnailUrl || photo.s3Url

        // Find the face entry in this photo matching the cluster
        const faces = photo.analysis?.faceData as FaceDataEntry[] | null
        if (faces) {
          const matchingFace = faces.find(
            (f) => f.personClusterId === cluster.id
          )
          if (matchingFace) {
            facePosition = matchingFace.position
            break
          }
        }
      }

      return { cluster, thumbnailUrl, facePosition }
    })
  }, [displayClusters, photos])

  if (clusterThumbnails.length === 0) return null

  return (
    <div className="w-full">
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {clusterThumbnails.map(({ cluster, thumbnailUrl, facePosition }) => {
          const isSelected = selectedPersonId === cluster.id
          const label = cluster.name || cluster.role || "Person"

          return (
            <FaceThumbnail
              key={cluster.id}
              photoUrl={thumbnailUrl}
              position={facePosition}
              size={48}
              name={label}
              highlight={isSelected}
              accentColor={accentColor}
              onClick={() => {
                if (isSelected) {
                  onSelectPerson(null)
                } else {
                  onSelectPerson({
                    clusterId: cluster.id,
                    name: cluster.name,
                    role: cluster.role,
                    photoIds: cluster.photoIds,
                    description: cluster.description,
                  })
                }
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

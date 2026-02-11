"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Save, Loader2 } from "lucide-react"
import { FaceThumbnail } from "./FaceThumbnail"
import { renamePersonCluster } from "@/actions/galleries/rename-person-cluster"

interface FaceDataEntry {
  faceId: string
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

interface PhotoWithAnalysis {
  id: string
  thumbnailUrl: string | null
  s3Url: string
  analysis?: {
    faceData: unknown
    faceCount: number
  } | null
}

interface PersonClustersCardProps {
  personClusters: PersonCluster[]
  photos: PhotoWithAnalysis[]
}

export function PersonClustersCard({ personClusters, photos }: PersonClustersCardProps) {
  const [names, setNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const cluster of personClusters) {
      initial[cluster.id] = cluster.name || ""
    }
    return initial
  })
  const [saving, setSaving] = useState<string | null>(null)

  const photoMap = new Map(photos.map((p) => [p.id, p]))

  const getClusterThumbnail = (cluster: PersonCluster) => {
    for (const photoId of cluster.photoIds) {
      const photo = photoMap.get(photoId)
      if (!photo) continue
      const faces = photo.analysis?.faceData as FaceDataEntry[] | null
      if (faces) {
        const match = faces.find((f) => f.personClusterId === cluster.id)
        if (match) {
          return {
            url: photo.thumbnailUrl || photo.s3Url,
            position: match.position,
          }
        }
      }
    }
    return null
  }

  const handleSave = async (clusterId: string) => {
    setSaving(clusterId)
    try {
      await renamePersonCluster(clusterId, names[clusterId] || "")
    } catch {
      // error handled server-side
    } finally {
      setSaving(null)
    }
  }

  if (personClusters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            People
          </CardTitle>
          <CardDescription>
            Run AI analysis to detect people in this gallery
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Sort by photo count descending
  const sorted = [...personClusters].sort(
    (a, b) => b.photoIds.length - a.photoIds.length
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          People ({personClusters.length})
        </CardTitle>
        <CardDescription>
          Name people to make them searchable in the public gallery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((cluster) => {
          const thumb = getClusterThumbnail(cluster)
          const clusterPhotos = cluster.photoIds
            .map((id) => photoMap.get(id))
            .filter(Boolean)
            .slice(0, 4)

          return (
            <div
              key={cluster.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              {/* Face thumbnail */}
              {thumb ? (
                <FaceThumbnail
                  photoUrl={thumb.url}
                  position={thumb.position}
                  size={48}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                {/* Name input + role */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter name..."
                    value={names[cluster.id] || ""}
                    onChange={(e) =>
                      setNames((prev) => ({
                        ...prev,
                        [cluster.id]: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    disabled={saving === cluster.id}
                    onClick={() => handleSave(cluster.id)}
                  >
                    {saving === cluster.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 flex-wrap">
                  {cluster.role && (
                    <Badge variant="secondary" className="text-xs">
                      {cluster.role}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {cluster.photoIds.length} photo{cluster.photoIds.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Photo previews */}
                {clusterPhotos.length > 0 && (
                  <div className="flex gap-1">
                    {clusterPhotos.map(
                      (photo) =>
                        photo && (
                          <div
                            key={photo.id}
                            className="w-10 h-10 rounded overflow-hidden bg-muted"
                          >
                            <img
                              src={photo.thumbnailUrl || photo.s3Url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                    )}
                    {cluster.photoIds.length > 4 && (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        +{cluster.photoIds.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, BarChart3 } from "lucide-react"

interface DownloadStatsData {
  totalDownloads: number
  downloadsByType: Array<{ type: string; count: number }>
  recentDownloads: Array<{
    id: string
    photoId: string | null
    visitorEmail: string | null
    resolution: string
    type: string
    createdAt: string
  }>
  topPhotos: Array<{ photoId: string | null; count: number }>
}

interface DownloadStatsProps {
  stats: DownloadStatsData
}

export function DownloadStats({ stats }: DownloadStatsProps) {
  if (stats.totalDownloads === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Download Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No downloads yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Download Analytics
        </CardTitle>
        <CardDescription>
          {stats.totalDownloads} total download{stats.totalDownloads !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Downloads by type */}
        <div className="flex flex-wrap gap-2">
          {stats.downloadsByType.map((d) => (
            <Badge key={d.type} variant="secondary">
              <Download className="h-3 w-3 mr-1" />
              {d.type}: {d.count}
            </Badge>
          ))}
        </div>

        {/* Recent activity */}
        {stats.recentDownloads.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Activity</p>
            <div className="space-y-1">
              {stats.recentDownloads.slice(0, 5).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {d.type}
                    </Badge>
                    {d.visitorEmail && (
                      <span className="text-muted-foreground">{d.visitorEmail}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

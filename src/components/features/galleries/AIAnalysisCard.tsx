"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sparkles, RefreshCw, Loader2 } from "lucide-react"

interface AIAnalysisCardProps {
  galleryId: string
  photoCount: number
  initialAiSearchEnabled: boolean
}

interface AnalysisStatus {
  progress: number
  aiSearchEnabled: boolean
  totalPhotos: number
  stats: Record<string, number>
}

export function AIAnalysisCard({
  galleryId,
  photoCount,
  initialAiSearchEnabled,
}: AIAnalysisCardProps) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(initialAiSearchEnabled)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/galleries/${galleryId}/analyze`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStatus({
            progress: data.progress,
            aiSearchEnabled: data.aiSearchEnabled,
            totalPhotos: data.totalPhotos,
            stats: data.stats || {},
          })
          setAiEnabled(data.aiSearchEnabled)
        }
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setIsLoading(false)
    }
  }, [galleryId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll for progress when analyzing
  useEffect(() => {
    if (!isAnalyzing) return

    const interval = setInterval(async () => {
      await fetchStatus()
      if (status?.progress === 100) {
        setIsAnalyzing(false)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isAnalyzing, status?.progress, fetchStatus])

  const startAnalysis = async (reanalyze: boolean = false) => {
    setIsAnalyzing(true)
    try {
      await fetch(`/api/galleries/${galleryId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reanalyze }),
      })
    } catch {
      setIsAnalyzing(false)
    }
  }

  const toggleAiSearch = async () => {
    const newValue = !aiEnabled
    setAiEnabled(newValue)
    try {
      await fetch(`/api/galleries/${galleryId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleEnabled: newValue }),
      })
    } catch {
      setAiEnabled(!newValue) // revert on failure
    }
  }

  const completedCount = status?.stats?.COMPLETED || 0
  const failedCount = status?.stats?.FAILED || 0
  const pendingCount = status?.stats?.PENDING || 0
  const processingCount = status?.stats?.PROCESSING || 0
  const progress = status?.progress || 0
  const isInProgress = processingCount > 0 || pendingCount > 0 || isAnalyzing

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Photo Search
        </CardTitle>
        <CardDescription>
          AI-powered search lets gallery visitors find specific moments using natural language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading analysis status...
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedCount} of {photoCount} photos analyzed
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {completedCount > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {completedCount} completed
                </Badge>
              )}
              {isInProgress && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {processingCount + pendingCount} in progress
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {failedCount} failed
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => startAnalysis(false)}
                disabled={isInProgress || photoCount === 0}
                size="sm"
              >
                {isInProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Photos
                  </>
                )}
              </Button>
              {completedCount > 0 && (
                <Button
                  onClick={() => startAnalysis(true)}
                  disabled={isInProgress}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-analyze All
                </Button>
              )}
            </div>

            {/* Toggle AI search for viewers */}
            {completedCount > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label htmlFor="ai-search-toggle" className="text-sm font-medium">
                    Enable AI Search for viewers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show search bar in the public gallery
                  </p>
                </div>
                <Switch
                  id="ai-search-toggle"
                  checked={aiEnabled}
                  onCheckedChange={toggleAiSearch}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

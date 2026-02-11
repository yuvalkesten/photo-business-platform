"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sparkles, RefreshCw, Loader2, AlertTriangle, ChevronDown, RotateCcw } from "lucide-react"

interface AIAnalysisCardProps {
  galleryId: string
  photoCount: number
  initialAiSearchEnabled: boolean
}

interface AnalysisStatus {
  progress: number
  aiSearchEnabled: boolean
  totalPhotos: number
  isStalled: boolean
  lastActivity: string | null
  stats: Record<string, number>
}

interface AnalysisError {
  photoId: string
  error: string | null
  retryCount: number
}

const POLL_INTERVAL_MS = 3000
const MAX_STALL_COUNT = 5 // consecutive polls with no progress change
const ABSOLUTE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function AIAnalysisCard({
  galleryId,
  photoCount,
  initialAiSearchEnabled,
}: AIAnalysisCardProps) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(initialAiSearchEnabled)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<AnalysisError[]>([])
  const [showErrors, setShowErrors] = useState(false)

  // Polling state refs (to avoid re-creating the interval)
  const stallCountRef = useRef(0)
  const lastProgressRef = useRef(-1)
  const analyzeStartTimeRef = useRef<number | null>(null)

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
            isStalled: data.isStalled ?? false,
            lastActivity: data.lastActivity ?? null,
            stats: data.stats || {},
          })
          setAiEnabled(data.aiSearchEnabled)
          return data as AnalysisStatus & { progress: number; isStalled: boolean }
        }
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setIsLoading(false)
    }
    return null
  }, [galleryId])

  const fetchErrors = useCallback(async () => {
    try {
      const response = await fetch(`/api/galleries/${galleryId}/analyze?includeErrors=true`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.errors) {
          setErrors(data.errors)
        }
      }
    } catch {
      // Ignore
    }
  }, [galleryId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll for progress when analyzing
  useEffect(() => {
    if (!isAnalyzing) return

    analyzeStartTimeRef.current = Date.now()
    stallCountRef.current = 0
    lastProgressRef.current = -1

    const interval = setInterval(async () => {
      const data = await fetchStatus()

      if (!data) return

      // Check if progress changed
      if (data.progress === lastProgressRef.current) {
        stallCountRef.current++
      } else {
        stallCountRef.current = 0
        lastProgressRef.current = data.progress
      }

      // Stop polling conditions
      const absoluteTimeout = analyzeStartTimeRef.current &&
        Date.now() - analyzeStartTimeRef.current > ABSOLUTE_TIMEOUT_MS
      const isStalled = data.isStalled || stallCountRef.current >= MAX_STALL_COUNT

      if (data.progress === 100 || isStalled || absoluteTimeout) {
        setIsAnalyzing(false)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isAnalyzing, fetchStatus])

  const startAnalysis = async (reanalyze: boolean = false) => {
    setIsAnalyzing(true)
    setErrors([])
    setShowErrors(false)
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

  const retryFailed = async () => {
    setIsAnalyzing(true)
    setErrors([])
    setShowErrors(false)
    try {
      await fetch(`/api/galleries/${galleryId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryFailed: true }),
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

  const handleShowErrors = () => {
    if (!showErrors) {
      fetchErrors()
    }
    setShowErrors(!showErrors)
  }

  const completedCount = status?.stats?.COMPLETED || 0
  const failedCount = status?.stats?.FAILED || 0
  const pendingCount = status?.stats?.PENDING || 0
  const processingCount = status?.stats?.PROCESSING || 0
  const progress = status?.progress || 0
  const isStalled = status?.isStalled || false
  const retryableCount = failedCount + (isStalled ? processingCount : 0)

  // Group errors by type for display
  const errorGroups = errors.reduce<Record<string, number>>((acc, e) => {
    const match = e.error?.match(/^\[([A-Z_]+)\]/)
    const code = match ? match[1] : "UNKNOWN"
    acc[code] = (acc[code] || 0) + 1
    return acc
  }, {})

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
            {/* Stall warning banner */}
            {isStalled && !isAnalyzing && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Analysis appears to have stalled. Some photos may have failed to process.
                </span>
              </div>
            )}

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
              {(isAnalyzing || processingCount > 0 || pendingCount > 0) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {isAnalyzing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
                  ) : null}
                  {processingCount + pendingCount} in progress
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {failedCount} failed
                </Badge>
              )}
            </div>

            {/* Error details (expandable) */}
            {failedCount > 0 && !isAnalyzing && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 p-0 h-auto"
                  onClick={handleShowErrors}
                >
                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showErrors ? "rotate-180" : ""}`} />
                  {showErrors ? "Hide" : "Show"} error details ({failedCount} failed)
                </Button>
                {showErrors && (
                  <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 space-y-1">
                    {Object.entries(errorGroups).length > 0 ? (
                      Object.entries(errorGroups).map(([code, count]) => (
                        <div key={code}>
                          {count} {code === "TIMEOUT" ? "timed out" :
                            code === "RATE_LIMIT" ? "rate limited" :
                            code === "API_ERROR" ? "API error" :
                            code === "IMAGE_ERROR" ? "image error (not retryable)" :
                            code === "PARSE_ERROR" ? "parse error (not retryable)" :
                            "unknown error"}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">Loading error details...</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => startAnalysis(false)}
                disabled={isAnalyzing || photoCount === 0}
                size="sm"
              >
                {isAnalyzing ? (
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
              {retryableCount > 0 && !isAnalyzing && (
                <Button
                  onClick={retryFailed}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Failed ({retryableCount})
                </Button>
              )}
              {completedCount > 0 && !isAnalyzing && (
                <Button
                  onClick={() => startAnalysis(true)}
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

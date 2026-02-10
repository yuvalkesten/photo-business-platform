"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, CheckCircle, AlertCircle, Loader2, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUpload {
  file: File
  id: string
  status: "pending" | "uploading" | "processing" | "complete" | "error"
  progress: number
  error?: string
  s3Key?: string
  width?: number
  height?: number
}

interface PhotoUploaderProps {
  galleryId: string
}

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/tiff": [".tiff", ".tif"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      // Fallback for formats browsers can't preview (TIFF, HEIC)
      resolve({ width: 0, height: 0 })
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

export function PhotoUploader({ galleryId }: PhotoUploaderProps) {
  const [files, setFiles] = useState<FileUpload[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileUpload[] = acceptedFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: "pending" as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading,
    onDropRejected: (rejections) => {
      rejections.forEach((rejection) => {
        const errors = rejection.errors.map((e) => e.message).join(", ")
        toast({
          title: "File rejected",
          description: `${rejection.file.name}: ${errors}`,
          variant: "destructive",
        })
      })
    },
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending")
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    try {
      // Step 1: Get presigned URLs
      const response = await fetch("/api/galleries/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryId,
          files: pendingFiles.map((f) => ({
            filename: f.file.name,
            contentType: f.file.type || "image/jpeg",
            fileSize: f.file.size,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to get upload URLs")
      }

      const { uploadUrls } = await response.json()

      // Step 2: Upload each file to S3
      const uploadResults: Array<{
        filename: string
        s3Key: string
        contentType: string
        fileSize: number
        width: number
        height: number
      }> = []

      for (let i = 0; i < pendingFiles.length; i++) {
        const fileUpload = pendingFiles[i]
        const urlInfo = uploadUrls[i]

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileUpload.id ? { ...f, status: "uploading" as const, progress: 0 } : f
          )
        )

        try {
          // Get image dimensions
          const dimensions = await getImageDimensions(fileUpload.file)

          // Upload to S3
          const xhr = new XMLHttpRequest()
          await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100)
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === fileUpload.id ? { ...f, progress } : f
                  )
                )
              }
            })

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve()
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`))
              }
            })

            xhr.addEventListener("error", () => reject(new Error("Upload failed")))

            xhr.open("PUT", urlInfo.uploadUrl)
            xhr.setRequestHeader("Content-Type", fileUpload.file.type || "image/jpeg")
            xhr.send(fileUpload.file)
          })

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileUpload.id
                ? { ...f, status: "processing" as const, progress: 100, s3Key: urlInfo.s3Key }
                : f
            )
          )

          uploadResults.push({
            filename: fileUpload.file.name,
            s3Key: urlInfo.s3Key,
            contentType: fileUpload.file.type || "image/jpeg",
            fileSize: fileUpload.file.size,
            width: dimensions.width,
            height: dimensions.height,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed"
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileUpload.id
                ? { ...f, status: "error" as const, error: message }
                : f
            )
          )
        }
      }

      // Step 3: Notify server of completion (thumbnail generation + DB records)
      if (uploadResults.length > 0) {
        const completeResponse = await fetch("/api/galleries/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ galleryId, photos: uploadResults }),
        })

        if (!completeResponse.ok) {
          throw new Error("Failed to process uploaded photos")
        }

        // Mark successful uploads as complete
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "processing" ? { ...f, status: "complete" as const } : f
          )
        )

        toast({
          title: "Upload complete",
          description: `${uploadResults.length} photo(s) uploaded successfully.`,
        })

        router.refresh()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      toast({
        title: "Upload error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending").length
  const completedCount = files.filter((f) => f.status === "complete").length
  const hasErrors = files.some((f) => f.status === "error")

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "complete"))
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop photos here...</p>
        ) : (
          <>
            <p className="font-medium">Drag & drop photos here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse. JPEG, PNG, WebP, TIFF, HEIC up to 50MB each.
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {files.length} file(s) — {completedCount} uploaded
                {hasErrors && ", some failed"}
              </p>
              <div className="flex gap-2">
                {completedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>
                    Clear completed
                  </Button>
                )}
                {pendingCount > 0 && (
                  <Button size="sm" onClick={uploadFiles} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {pendingCount} photo(s)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((fileUpload) => (
                <div
                  key={fileUpload.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{fileUpload.file.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {(fileUpload.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      {(fileUpload.status === "uploading" || fileUpload.status === "processing") && (
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${fileUpload.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {fileUpload.error && (
                      <p className="text-xs text-destructive">{fileUpload.error}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {fileUpload.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFile(fileUpload.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {fileUpload.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {fileUpload.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {fileUpload.status === "complete" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {fileUpload.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

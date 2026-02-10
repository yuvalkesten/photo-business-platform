"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Trash2,
  ImageIcon,
  MoreVertical,
  CheckSquare,
  Square,
  Star,
  GripVertical,
  Loader2,
  FolderOpen,
} from "lucide-react"
import { deletePhotos } from "@/actions/galleries/delete-photos"
import { updatePhotoOrder } from "@/actions/galleries/update-photo-order"
import { setCoverImage } from "@/actions/galleries/set-cover-image"
import { assignPhotosToSet } from "@/actions/galleries/photo-sets"
import { useToast } from "@/hooks/use-toast"

interface Photo {
  id: string
  filename: string
  s3Url: string
  thumbnailUrl: string | null
  fileSize: number
  width: number
  height: number
  order: number
  setId?: string | null
}

interface PhotoSet {
  id: string
  name: string
}

interface PhotoGridProps {
  galleryId: string
  photos: Photo[]
  coverImage: string | null
  photoSets?: PhotoSet[]
}

export function PhotoGrid({ galleryId, photos, coverImage, photoSets = [] }: PhotoGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) {
        next.delete(photoId)
      } else {
        next.add(photoId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(photos.map((p) => p.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleDelete = () => {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const result = await deletePhotos(galleryId, Array.from(selectedIds))
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({
          title: "Photos deleted",
          description: `${result.deletedCount} photo(s) deleted.`,
        })
        setSelectedIds(new Set())
        setSelectMode(false)
        router.refresh()
      }
      setDeleteDialogOpen(false)
    })
  }

  const handleSetCover = (photoId: string) => {
    startTransition(async () => {
      const result = await setCoverImage(galleryId, photoId)
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Cover updated", description: "Gallery cover image has been updated." })
        router.refresh()
      }
    })
  }

  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDraggedId(photoId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const currentOrder = photos.map((p) => p.id)
    const draggedIdx = currentOrder.indexOf(draggedId)
    const targetIdx = currentOrder.indexOf(targetId)

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedId(null)
      return
    }

    // Reorder
    currentOrder.splice(draggedIdx, 1)
    currentOrder.splice(targetIdx, 0, draggedId)

    setDraggedId(null)

    startTransition(async () => {
      const result = await updatePhotoOrder(galleryId, currentOrder)
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
      router.refresh()
    })
  }

  const handleMoveToSet = (photoIds: string[], setId: string | null) => {
    startTransition(async () => {
      const result = await assignPhotosToSet(galleryId, photoIds, setId)
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Photos moved", description: "Photos have been moved to the set." })
        if (selectMode) {
          setSelectedIds(new Set())
          setSelectMode(false)
        }
        router.refresh()
      }
    })
  }

  const isCover = (photo: Photo) => {
    return coverImage === photo.thumbnailUrl || coverImage === photo.s3Url
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No photos uploaded yet. Use the uploader above to add photos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setSelectMode(!selectMode)
              if (selectMode) deselectAll()
            }}
          >
            {selectMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            {selectMode ? "Cancel" : "Select"}
          </Button>
          {selectMode && (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select all
              </Button>
              {selectedIds.size > 0 && (
                <>
                  {photoSets.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isPending}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Move to set
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {photoSets.map((set) => (
                          <DropdownMenuItem
                            key={set.id}
                            onClick={() => handleMoveToSet(Array.from(selectedIds), set.id)}
                          >
                            {set.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={() => handleMoveToSet(Array.from(selectedIds), null)}>
                          Uncategorized
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {photos.length} photo(s) {!selectMode && "— drag to reorder"}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            draggable={!selectMode}
            onDragStart={(e) => handleDragStart(e, photo.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, photo.id)}
            className={`
              relative aspect-square rounded-lg overflow-hidden bg-muted group
              ${draggedId === photo.id ? "opacity-50" : ""}
              ${selectedIds.has(photo.id) ? "ring-2 ring-primary ring-offset-2" : ""}
              ${!selectMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
            `}
            onClick={() => selectMode && toggleSelect(photo.id)}
          >
            <img
              src={photo.thumbnailUrl || photo.s3Url}
              alt={photo.filename}
              className="w-full h-full object-cover"
              draggable={false}
            />

            {/* Cover badge */}
            {isCover(photo) && (
              <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                <Star className="h-3 w-3 mr-1" /> Cover
              </Badge>
            )}

            {/* Select checkbox overlay */}
            {selectMode && (
              <div className="absolute top-2 right-2">
                <div
                  className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-colors
                    ${selectedIds.has(photo.id)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background/80 border-muted-foreground/50"}
                  `}
                >
                  {selectedIds.has(photo.id) && (
                    <CheckSquare className="h-4 w-4" />
                  )}
                </div>
              </div>
            )}

            {/* Drag handle + actions (non-select mode) */}
            {!selectMode && (
              <>
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-5 w-5 text-white drop-shadow-md" />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSetCover(photo.id)}>
                        <Star className="h-4 w-4 mr-2" />
                        Set as cover
                      </DropdownMenuItem>
                      {photoSets.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Move to set
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {photoSets.map((set) => (
                              <DropdownMenuItem
                                key={set.id}
                                onClick={() => handleMoveToSet([photo.id], set.id)}
                              >
                                {set.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={() => handleMoveToSet([photo.id], null)}>
                              Uncategorized
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedIds(new Set([photo.id]))
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}

            {/* File info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{photo.filename}</p>
              <p className="text-white/70 text-xs">
                {photo.width}x{photo.height} • {(photo.fileSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} photo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected photos from the gallery and from storage.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

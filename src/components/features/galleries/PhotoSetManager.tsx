"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Plus,
  MoreVertical,
  Trash2,
  GripVertical,
  Loader2,
  FolderOpen,
} from "lucide-react"
import {
  createPhotoSet,
  deletePhotoSet,
  updatePhotoSet,
  reorderPhotoSets,
} from "@/actions/galleries/photo-sets"
import { useToast } from "@/hooks/use-toast"

interface PhotoSet {
  id: string
  name: string
  description: string | null
  order: number
  _count: { photos: number }
}

interface PhotoSetManagerProps {
  galleryId: string
  sets: PhotoSet[]
}

export function PhotoSetManager({ galleryId, sets }: PhotoSetManagerProps) {
  const [newSetName, setNewSetName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleCreate = () => {
    if (!newSetName.trim()) return
    startTransition(async () => {
      const result = await createPhotoSet(galleryId, newSetName.trim())
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Set created", description: `"${newSetName.trim()}" has been created.` })
        setNewSetName("")
        router.refresh()
      }
    })
  }

  const handleRename = (setId: string) => {
    if (!editName.trim()) return
    startTransition(async () => {
      const result = await updatePhotoSet(setId, { name: editName.trim() })
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        setEditingId(null)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deletePhotoSet(deleteId)
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Set deleted", description: "Photos have been moved to uncategorized." })
        setDeleteId(null)
        router.refresh()
      }
    })
  }

  const handleDragStart = (e: React.DragEvent, setId: string) => {
    setDraggedId(setId)
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

    const currentOrder = sets.map((s) => s.id)
    const draggedIdx = currentOrder.indexOf(draggedId)
    const targetIdx = currentOrder.indexOf(targetId)
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedId(null)
      return
    }

    currentOrder.splice(draggedIdx, 1)
    currentOrder.splice(targetIdx, 0, draggedId)
    setDraggedId(null)

    startTransition(async () => {
      const result = await reorderPhotoSets(galleryId, currentOrder)
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Create new set */}
      <div className="flex items-center gap-2">
        <Input
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
          placeholder="New set name (e.g. Ceremony, Reception...)"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={isPending}
        />
        <Button onClick={handleCreate} disabled={isPending || !newSetName.trim()} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Set list */}
      {sets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No sets yet. Create sets to organize your photos into sections.
        </p>
      ) : (
        <div className="space-y-1">
          {sets.map((set) => (
            <div
              key={set.id}
              draggable
              onDragStart={(e) => handleDragStart(e, set.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, set.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border ${
                draggedId === set.id ? "opacity-50" : ""
              } hover:bg-accent/50 transition-colors`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <FolderOpen className="h-4 w-4 text-muted-foreground" />

              {editingId === set.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(set.id)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  onBlur={() => handleRename(set.id)}
                  autoFocus
                  className="h-7 text-sm"
                />
              ) : (
                <span className="flex-1 text-sm font-medium">{set.name}</span>
              )}

              <Badge variant="secondary" className="text-xs">
                {set._count.photos}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingId(set.id)
                      setEditName(set.name)
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteId(set.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set?</AlertDialogTitle>
            <AlertDialogDescription>
              The set will be deleted but its photos will remain in the gallery (moved to uncategorized).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

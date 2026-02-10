"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Heart, Send, Loader2, CheckCircle } from "lucide-react"
import { submitFavorites } from "@/actions/galleries/submit-favorites"
import { useToast } from "@/hooks/use-toast"

interface FavoritePhoto {
  id: string
  filename: string
  thumbnailUrl: string | null
  s3Url: string
}

interface FavoritesBarProps {
  favoritePhotos: FavoritePhoto[]
  listId: string
  galleryTitle: string
}

export function FavoritesBar({ favoritePhotos, listId, galleryTitle }: FavoritesBarProps) {
  const [isSubmitting, startTransition] = useTransition()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!email.trim()) {
      setError("Email is required")
      return
    }

    startTransition(async () => {
      const result = await submitFavorites({
        listId,
        name: name.trim(),
        email: email.trim(),
        note: note.trim() || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setIsSubmitted(true)
      toast({
        title: "Favorites submitted!",
        description: `${result.photoCount} photo(s) sent to the photographer.`,
      })
    })
  }

  if (favoritePhotos.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t shadow-lg">
      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <span className="font-medium">
              {favoritePhotos.length} favorite{favoritePhotos.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Review & Submit
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Your Favorites</SheetTitle>
                <SheetDescription>
                  {favoritePhotos.length} photo(s) selected from {galleryTitle}
                </SheetDescription>
              </SheetHeader>

              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Favorites Submitted!</h3>
                  <p className="text-muted-foreground">
                    Your photographer has been notified with your selections.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 mt-6">
                  {/* Photo thumbnails */}
                  <div className="grid grid-cols-4 gap-2">
                    {favoritePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-md overflow-hidden bg-muted"
                      >
                        <img
                          src={photo.thumbnailUrl || photo.s3Url}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Submit form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fav-name">Your Name *</Label>
                      <Input
                        id="fav-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fav-email">Your Email *</Label>
                      <Input
                        id="fav-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fav-note">Note (optional)</Label>
                      <Textarea
                        id="fav-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Any notes about your selections..."
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit {favoritePhotos.length} Favorite(s)
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}

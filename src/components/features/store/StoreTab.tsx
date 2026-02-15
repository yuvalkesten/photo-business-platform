"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag } from "lucide-react"
import { ProductPicker, type StoreProduct } from "./ProductPicker"

interface Photo {
  id: string
  filename: string
  s3Url: string
  thumbnailUrl: string | null
  width: number | null
  height: number | null
}

interface StoreTabProps {
  photos: Photo[]
  products: StoreProduct[]
  galleryId: string
  themeVars: Record<string, string>
  accentColor: string
}

export function StoreTab({
  photos,
  products,
  galleryId,
  themeVars,
  accentColor,
}: StoreTabProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="h-12 w-12 mx-auto mb-3" style={{ color: themeVars["--gallery-muted"] }} />
        <p className="text-lg font-medium">No products available</p>
        <p style={{ color: themeVars["--gallery-muted"] }}>
          The photographer hasn&apos;t set up products for this gallery yet.
        </p>
      </div>
    )
  }

  // Group products by category for display
  const categories = Array.from(new Set(products.map((p) => p.productCategory)))
  const CATEGORY_LABELS: Record<string, string> = {
    PRINT: "Prints",
    CANVAS: "Canvas",
    FRAMED_PRINT: "Framed Prints",
    FINE_ART: "Fine Art Prints",
    PHOTO_BOOK: "Photo Albums",
  }

  return (
    <div>
      {/* Available products summary */}
      <div className="mb-8 text-center">
        <h2 className="text-lg font-medium mb-2">Order Prints</h2>
        <p className="text-sm mb-4" style={{ color: themeVars["--gallery-muted"] }}>
          Select a photo below to order a print
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => {
            const catProducts = products.filter((p) => p.productCategory === cat)
            const minPrice = Math.min(...catProducts.map((p) => p.retailPrice))
            return (
              <Badge key={cat} variant="outline" className="px-3 py-1">
                {CATEGORY_LABELS[cat] || cat} from ${minPrice.toFixed(2)}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Photo grid for store */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[3px]">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="relative aspect-square overflow-hidden group focus:outline-none"
            style={{ backgroundColor: themeVars["--gallery-border"] }}
          >
            <img
              src={photo.thumbnailUrl || photo.s3Url}
              alt={photo.filename}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  className="text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Order
                </Button>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Product Picker Dialog */}
      {selectedPhoto && (
        <ProductPicker
          open={!!selectedPhoto}
          onOpenChange={(open) => !open && setSelectedPhoto(null)}
          photo={selectedPhoto}
          products={products}
          galleryId={galleryId}
          themeVars={themeVars}
          accentColor={accentColor}
        />
      )}
    </div>
  )
}

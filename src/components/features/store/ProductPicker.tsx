"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Minus, Plus, Check } from "lucide-react"
import { useCartStore, type CartItem } from "@/stores/cart-store"

export interface StoreProduct {
  id: string
  prodigiSku: string
  productCategory: string
  productName: string
  sizeLabel: string
  retailPrice: number
  currency: string
}

interface ProductPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photo: {
    id: string
    filename: string
    s3Url: string
    thumbnailUrl: string | null
  }
  products: StoreProduct[]
  galleryId: string
  themeVars?: Record<string, string>
  accentColor?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  PRINT: "Prints",
  CANVAS: "Canvas",
  FRAMED_PRINT: "Framed",
  METAL_PRINT: "Metal",
  ACRYLIC: "Acrylic",
  PHOTO_BOOK: "Albums",
}

export function ProductPicker({
  open,
  onOpenChange,
  photo,
  products,
  galleryId,
  accentColor = "#8b5cf6",
}: ProductPickerProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  const { addItem, setGalleryId } = useCartStore()

  // Group products by category
  const categories = Array.from(new Set(products.map((p) => p.productCategory)))
  const grouped = categories.reduce<Record<string, StoreProduct[]>>((acc, cat) => {
    acc[cat] = products.filter((p) => p.productCategory === cat)
    return acc
  }, {})

  const handleAddToCart = () => {
    if (!selectedProduct) return

    setGalleryId(galleryId)

    const item: CartItem = {
      photoId: photo.id,
      photoUrl: photo.thumbnailUrl || photo.s3Url,
      photoFilename: photo.filename,
      prodigiSku: selectedProduct.prodigiSku,
      productName: selectedProduct.productName,
      sizeLabel: selectedProduct.sizeLabel,
      productCategory: selectedProduct.productCategory,
      quantity,
      unitPrice: selectedProduct.retailPrice,
      prodigiCost: 0, // client doesn't need to know wholesale cost
    }

    addItem(item)
    setJustAdded(true)
    setTimeout(() => {
      setJustAdded(false)
      setSelectedProduct(null)
      setQuantity(1)
      onOpenChange(false)
    }, 1200)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Print</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Photo preview */}
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <img
              src={photo.thumbnailUrl || photo.s3Url}
              alt={photo.filename}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Product selection */}
          <div className="space-y-4">
            {categories.length > 1 ? (
              <Tabs defaultValue={categories[0]}>
                <TabsList className="w-full">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="flex-1 text-xs">
                      {CATEGORY_LABELS[cat] || cat}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat} className="space-y-2 mt-3">
                    {grouped[cat].map((product) => (
                      <ProductOption
                        key={product.id}
                        product={product}
                        selected={selectedProduct?.id === product.id}
                        onSelect={() => setSelectedProduct(product)}
                        accentColor={accentColor}
                      />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <ProductOption
                    key={product.id}
                    product={product}
                    selected={selectedProduct?.id === product.id}
                    onSelect={() => setSelectedProduct(product)}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            )}

            {/* Quantity + Add to cart */}
            {selectedProduct && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-16 text-center h-8"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-lg">
                    ${(selectedProduct.retailPrice * quantity).toFixed(2)}
                  </span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={justAdded}
                  style={!justAdded ? { backgroundColor: accentColor } : undefined}
                >
                  {justAdded ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProductOption({
  product,
  selected,
  onSelect,
  accentColor,
}: {
  product: StoreProduct
  selected: boolean
  onSelect: () => void
  accentColor: string
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors text-left ${
        selected ? "border-current" : "border-transparent hover:bg-accent/50"
      }`}
      style={selected ? { borderColor: accentColor } : undefined}
    >
      <div>
        <p className="font-medium text-sm">{product.productName}</p>
        <Badge variant="outline" className="mt-1 text-xs">
          {product.sizeLabel}
        </Badge>
      </div>
      <span className="font-semibold">${product.retailPrice.toFixed(2)}</span>
    </button>
  )
}

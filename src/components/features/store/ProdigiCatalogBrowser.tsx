"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Plus } from "lucide-react"
import { getProdigiCatalog, type CatalogProduct } from "@/actions/store/get-prodigi-catalog"
import { addPriceSheetItem } from "@/actions/store/update-price-sheet"

interface ProdigiCatalogBrowserProps {
  priceSheetId: string
  defaultMarkupPercent: number
  existingSkus: string[]
  onClose: () => void
}

const CATEGORIES = [
  { value: "PRINT", label: "Prints" },
  { value: "CANVAS", label: "Canvas" },
  { value: "FRAMED_PRINT", label: "Framed" },
  { value: "FINE_ART", label: "Fine Art" },
]

export function ProdigiCatalogBrowser({
  priceSheetId,
  defaultMarkupPercent,
  existingSkus,
  onClose,
}: ProdigiCatalogBrowserProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [addingSkus, setAddingSkus] = useState<Set<string>>(new Set())
  const [addedSkus, setAddedSkus] = useState<Set<string>>(new Set(existingSkus))

  useEffect(() => {
    getProdigiCatalog().then((result) => {
      if (result.success && result.products) {
        setProducts(result.products)
      }
      setLoading(false)
    })
  }, [])

  const handleAddProduct = async (product: CatalogProduct) => {
    setAddingSkus((prev) => new Set(prev).add(product.sku))

    const retailPrice = Number((product.cost * (1 + defaultMarkupPercent / 100)).toFixed(2))

    await addPriceSheetItem(priceSheetId, {
      prodigiSku: product.sku,
      productCategory: product.category,
      productName: product.productName,
      sizeLabel: product.sizeLabel,
      prodigiCost: product.cost,
      retailPrice,
      currency: "USD",
    })

    setAddingSkus((prev) => {
      const next = new Set(prev)
      next.delete(product.sku)
      return next
    })
    setAddedSkus((prev) => new Set(prev).add(product.sku))
  }

  const filterByCategory = (category: string) =>
    products.filter((p) => p.category === category)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Products from Catalog</DialogTitle>
          <DialogDescription>
            Select products to add to your price sheet. Prices will be set with your {defaultMarkupPercent}% default markup.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading catalog...</div>
        ) : (
          <Tabs defaultValue="PRINT">
            <TabsList className="w-full">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="flex-1">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="space-y-2 mt-4">
                {filterByCategory(cat.value).map((product) => {
                  const isAdded = addedSkus.has(product.sku)
                  const isAdding = addingSkus.has(product.sku)
                  const retailPrice = Number(
                    (product.cost * (1 + defaultMarkupPercent / 100)).toFixed(2)
                  )

                  return (
                    <div
                      key={product.sku}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{product.sizeLabel}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Cost: ${product.cost.toFixed(2)}
                          </span>
                          <span className="text-sm">
                            Retail: ${retailPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isAdded ? "secondary" : "default"}
                        disabled={isAdded || isAdding}
                        onClick={() => handleAddProduct(product)}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Added
                          </>
                        ) : isAdding ? (
                          "Adding..."
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

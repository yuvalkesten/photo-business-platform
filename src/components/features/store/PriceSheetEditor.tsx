"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Plus, Save } from "lucide-react"
import { updatePriceSheetItem, removePriceSheetItem } from "@/actions/store/update-price-sheet"
import { ProdigiCatalogBrowser } from "./ProdigiCatalogBrowser"

interface PriceSheetItem {
  id: string
  prodigiSku: string
  productCategory: string
  productName: string
  sizeLabel: string
  prodigiCost: number | { toNumber?: () => number }
  retailPrice: number | { toNumber?: () => number }
  currency: string
}

interface PriceSheetEditorProps {
  priceSheetId: string
  items: PriceSheetItem[]
  defaultMarkupPercent: number
}

const CATEGORY_LABELS: Record<string, string> = {
  PRINT: "Prints",
  CANVAS: "Canvas",
  FRAMED_PRINT: "Framed Prints",
  FINE_ART: "Fine Art Prints",
  PHOTO_BOOK: "Photo Books",
}

function toNumber(val: number | { toNumber?: () => number }): number {
  if (typeof val === "number") return val
  if (val && typeof val.toNumber === "function") return val.toNumber()
  return Number(val)
}

export function PriceSheetEditor({
  priceSheetId,
  items,
  defaultMarkupPercent,
}: PriceSheetEditorProps) {
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set())
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [showCatalog, setShowCatalog] = useState(false)

  const handlePriceChange = (itemId: string, price: number) => {
    setEditedPrices((prev) => ({ ...prev, [itemId]: price }))
  }

  const handleSavePrice = async (itemId: string) => {
    const newPrice = editedPrices[itemId]
    if (newPrice === undefined) return

    setSavingItems((prev) => new Set(prev).add(itemId))
    await updatePriceSheetItem(itemId, { retailPrice: newPrice })
    setSavingItems((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
    setEditedPrices((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItems((prev) => new Set(prev).add(itemId))
    await removePriceSheetItem(itemId)
    setRemovingItems((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  // Group items by category
  const grouped = items.reduce<Record<string, PriceSheetItem[]>>((acc, item) => {
    const cat = item.productCategory
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Products ({items.length})</h3>
          <p className="text-sm text-muted-foreground">
            Set retail prices for each product. Your profit is the difference between retail and Prodigi cost.
          </p>
        </div>
        <Button onClick={() => setShowCatalog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Products
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No products added yet. Browse the Prodigi catalog to add products.
            </p>
            <Button onClick={() => setShowCatalog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Browse Catalog
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, categoryItems]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {CATEGORY_LABELS[category] || category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Retail Price</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryItems.map((item) => {
                    const cost = toNumber(item.prodigiCost)
                    const currentRetail =
                      editedPrices[item.id] ?? toNumber(item.retailPrice)
                    const profit = currentRetail - cost
                    const margin = currentRetail > 0 ? (profit / currentRetail) * 100 : 0
                    const hasEdit = editedPrices[item.id] !== undefined

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.sizeLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min={cost}
                              value={currentRetail}
                              onChange={(e) =>
                                handlePriceChange(item.id, Number(e.target.value))
                              }
                              className="w-24 text-right"
                            />
                            {hasEdit && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={savingItems.has(item.id)}
                                onClick={() => handleSavePrice(item.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              profit > 0 ? "text-green-600" : "text-red-500"
                            }
                          >
                            ${profit.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({margin.toFixed(0)}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={removingItems.has(item.id)}
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {showCatalog && (
        <ProdigiCatalogBrowser
          priceSheetId={priceSheetId}
          defaultMarkupPercent={defaultMarkupPercent}
          existingSkus={items.map((i) => i.prodigiSku)}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </div>
  )
}

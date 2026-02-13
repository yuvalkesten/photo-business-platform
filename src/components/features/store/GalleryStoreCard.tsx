"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShoppingBag } from "lucide-react"
import { toggleGalleryStore } from "@/actions/store/toggle-gallery-store"

interface PriceSheetOption {
  id: string
  name: string
  isDefault: boolean
  itemCount: number
}

interface GalleryStoreCardProps {
  galleryId: string
  storeEnabled: boolean
  priceSheetId: string | null
  priceSheets: PriceSheetOption[]
}

export function GalleryStoreCard({
  galleryId,
  storeEnabled,
  priceSheetId,
  priceSheets,
}: GalleryStoreCardProps) {
  const [enabled, setEnabled] = useState(storeEnabled)
  const [selectedSheet, setSelectedSheet] = useState(priceSheetId || "")
  const [saving, setSaving] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setSaving(true)
    setEnabled(checked)

    // If enabling and no sheet selected, try to pick default
    let sheetId = selectedSheet
    if (checked && !sheetId) {
      const defaultSheet = priceSheets.find((s) => s.isDefault)
      if (defaultSheet) {
        sheetId = defaultSheet.id
        setSelectedSheet(sheetId)
      }
    }

    await toggleGalleryStore(galleryId, {
      storeEnabled: checked,
      priceSheetId: checked ? sheetId || null : null,
    })
    setSaving(false)
  }

  const handleSheetChange = async (sheetId: string) => {
    setSaving(true)
    setSelectedSheet(sheetId)
    await toggleGalleryStore(galleryId, {
      storeEnabled: enabled,
      priceSheetId: sheetId || null,
    })
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Print Store
        </CardTitle>
        <CardDescription>
          Allow clients to purchase prints from this gallery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="gallery-store-toggle">Enable Store</Label>
          <Switch
            id="gallery-store-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving || priceSheets.length === 0}
          />
        </div>

        {priceSheets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Create a price sheet first to enable the store.
          </p>
        )}

        {enabled && priceSheets.length > 0 && (
          <div className="space-y-2">
            <Label>Price Sheet</Label>
            <Select value={selectedSheet} onValueChange={handleSheetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a price sheet" />
              </SelectTrigger>
              <SelectContent>
                {priceSheets.map((sheet) => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.name} ({sheet.itemCount} products)
                    {sheet.isDefault ? " — Default" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

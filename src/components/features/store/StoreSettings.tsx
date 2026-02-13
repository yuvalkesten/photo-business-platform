"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateStoreSettings } from "@/actions/store/update-store-settings"

interface StoreSettingsProps {
  storeEnabled: boolean
  defaultMarkupPercent: number
}

export function StoreSettings({ storeEnabled, defaultMarkupPercent }: StoreSettingsProps) {
  const [enabled, setEnabled] = useState(storeEnabled)
  const [markup, setMarkup] = useState(defaultMarkupPercent)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateStoreSettings({
      storeEnabled: enabled,
      defaultMarkupPercent: markup,
    })
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Settings</CardTitle>
        <CardDescription>
          Configure your print store. When enabled, clients can purchase prints from your galleries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="store-enabled">Enable Print Store</Label>
            <p className="text-sm text-muted-foreground">
              Allow clients to purchase prints from your galleries
            </p>
          </div>
          <Switch
            id="store-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-markup">Default Markup (%)</Label>
          <p className="text-sm text-muted-foreground">
            Default profit margin applied when adding products to a price sheet
          </p>
          <Input
            id="default-markup"
            type="number"
            min={0}
            max={500}
            value={markup}
            onChange={(e) => setMarkup(Number(e.target.value))}
            className="max-w-[200px]"
          />
          <p className="text-xs text-muted-foreground">
            A product costing $10 with {markup}% markup will be priced at ${(10 * (1 + markup / 100)).toFixed(2)}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  )
}

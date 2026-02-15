"use server"

import { requireAuth } from "@/lib/auth/utils"

// Curated catalog of popular Prodigi products for photographers
// In production, this would fetch from Prodigi API; for now we provide a static catalog
const PRODIGI_CATALOG = [
  // Prints
  {
    sku: "GLOBAL-PHO-4x6-PRO",
    productName: "Photo Print 4x6\"",
    sizeLabel: "4x6\"",
    category: "PRINT" as const,
    cost: 0.85,
  },
  {
    sku: "GLOBAL-PHO-5x7-PRO",
    productName: "Photo Print 5x7\"",
    sizeLabel: "5x7\"",
    category: "PRINT" as const,
    cost: 1.25,
  },
  {
    sku: "GLOBAL-PHO-8x10-PRO",
    productName: "Photo Print 8x10\"",
    sizeLabel: "8x10\"",
    category: "PRINT" as const,
    cost: 2.50,
  },
  {
    sku: "GLOBAL-PHO-8x12-PRO",
    productName: "Photo Print 8x12\"",
    sizeLabel: "8x12\"",
    category: "PRINT" as const,
    cost: 3.00,
  },
  {
    sku: "GLOBAL-PHO-12x16-PRO",
    productName: "Photo Print 12x16\"",
    sizeLabel: "12x16\"",
    category: "PRINT" as const,
    cost: 4.50,
  },
  {
    sku: "GLOBAL-PHO-12x18-PRO",
    productName: "Photo Print 12x18\"",
    sizeLabel: "12x18\"",
    category: "PRINT" as const,
    cost: 6.00,
  },
  {
    sku: "GLOBAL-PHO-16x20-PRO",
    productName: "Photo Print 16x20\"",
    sizeLabel: "16x20\"",
    category: "PRINT" as const,
    cost: 8.50,
  },
  {
    sku: "GLOBAL-PHO-20x30-PRO",
    productName: "Photo Print 20x30\"",
    sizeLabel: "20x30\"",
    category: "PRINT" as const,
    cost: 14.00,
  },
  // Canvas
  {
    sku: "GLOBAL-CAN-8x10",
    productName: "Canvas Print 8x10\"",
    sizeLabel: "8x10\"",
    category: "CANVAS" as const,
    cost: 12.00,
  },
  {
    sku: "GLOBAL-CAN-12x16",
    productName: "Canvas Print 12x16\"",
    sizeLabel: "12x16\"",
    category: "CANVAS" as const,
    cost: 18.00,
  },
  {
    sku: "GLOBAL-CAN-16x20",
    productName: "Canvas Print 16x20\"",
    sizeLabel: "16x20\"",
    category: "CANVAS" as const,
    cost: 24.00,
  },
  {
    sku: "GLOBAL-CAN-20x30",
    productName: "Canvas Print 20x30\"",
    sizeLabel: "20x30\"",
    category: "CANVAS" as const,
    cost: 36.00,
  },
  {
    sku: "GLOBAL-CAN-24x36",
    productName: "Canvas Print 24x36\"",
    sizeLabel: "24x36\"",
    category: "CANVAS" as const,
    cost: 48.00,
  },
  // Framed Prints (Classic Frame - color is an attribute, not in SKU)
  {
    sku: "GLOBAL-CFP-8X10",
    productName: "Framed Print 8x10\"",
    sizeLabel: "8x10\"",
    category: "FRAMED_PRINT" as const,
    cost: 35.00,
  },
  {
    sku: "GLOBAL-CFP-11X14",
    productName: "Framed Print 11x14\"",
    sizeLabel: "11x14\"",
    category: "FRAMED_PRINT" as const,
    cost: 40.00,
  },
  {
    sku: "GLOBAL-CFP-16X20",
    productName: "Framed Print 16x20\"",
    sizeLabel: "16x20\"",
    category: "FRAMED_PRINT" as const,
    cost: 50.00,
  },
  {
    sku: "GLOBAL-CFP-20X30",
    productName: "Framed Print 20x30\"",
    sizeLabel: "20x30\"",
    category: "FRAMED_PRINT" as const,
    cost: 70.00,
  },
  // Fine Art Prints (Enhanced Matte Art Paper)
  {
    sku: "GLOBAL-FAP-8X10",
    productName: "Fine Art Print 8x10\"",
    sizeLabel: "8x10\"",
    category: "FINE_ART" as const,
    cost: 6.00,
  },
  {
    sku: "GLOBAL-FAP-12X16",
    productName: "Fine Art Print 12x16\"",
    sizeLabel: "12x16\"",
    category: "FINE_ART" as const,
    cost: 10.00,
  },
  {
    sku: "GLOBAL-FAP-16X20",
    productName: "Fine Art Print 16x20\"",
    sizeLabel: "16x20\"",
    category: "FINE_ART" as const,
    cost: 14.00,
  },
  {
    sku: "GLOBAL-FAP-20X30",
    productName: "Fine Art Print 20x30\"",
    sizeLabel: "20x30\"",
    category: "FINE_ART" as const,
    cost: 22.00,
  },
]

export type CatalogProduct = (typeof PRODIGI_CATALOG)[number]

export async function getProdigiCatalog(category?: string) {
  try {
    await requireAuth()

    const products = category
      ? PRODIGI_CATALOG.filter((p) => p.category === category)
      : PRODIGI_CATALOG

    return { success: true, products }
  } catch (error) {
    console.error("Error fetching Prodigi catalog:", error)
    return { error: "Failed to fetch catalog" }
  }
}

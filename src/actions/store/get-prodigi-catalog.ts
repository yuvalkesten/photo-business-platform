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
    sku: "GLOBAL-PHO-11x14-PRO",
    productName: "Photo Print 11x14\"",
    sizeLabel: "11x14\"",
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
  // Framed Prints
  {
    sku: "GLOBAL-FRM-8x10-BLK",
    productName: "Framed Print 8x10\" Black",
    sizeLabel: "8x10\"",
    category: "FRAMED_PRINT" as const,
    cost: 22.00,
  },
  {
    sku: "GLOBAL-FRM-11x14-BLK",
    productName: "Framed Print 11x14\" Black",
    sizeLabel: "11x14\"",
    category: "FRAMED_PRINT" as const,
    cost: 30.00,
  },
  {
    sku: "GLOBAL-FRM-16x20-BLK",
    productName: "Framed Print 16x20\" Black",
    sizeLabel: "16x20\"",
    category: "FRAMED_PRINT" as const,
    cost: 42.00,
  },
  {
    sku: "GLOBAL-FRM-20x30-BLK",
    productName: "Framed Print 20x30\" Black",
    sizeLabel: "20x30\"",
    category: "FRAMED_PRINT" as const,
    cost: 60.00,
  },
  // Metal Prints
  {
    sku: "GLOBAL-MTL-8x10",
    productName: "Metal Print 8x10\"",
    sizeLabel: "8x10\"",
    category: "METAL_PRINT" as const,
    cost: 18.00,
  },
  {
    sku: "GLOBAL-MTL-12x16",
    productName: "Metal Print 12x16\"",
    sizeLabel: "12x16\"",
    category: "METAL_PRINT" as const,
    cost: 28.00,
  },
  {
    sku: "GLOBAL-MTL-16x20",
    productName: "Metal Print 16x20\"",
    sizeLabel: "16x20\"",
    category: "METAL_PRINT" as const,
    cost: 40.00,
  },
  // Acrylic
  {
    sku: "GLOBAL-ACR-8x10",
    productName: "Acrylic Print 8x10\"",
    sizeLabel: "8x10\"",
    category: "ACRYLIC" as const,
    cost: 20.00,
  },
  {
    sku: "GLOBAL-ACR-12x16",
    productName: "Acrylic Print 12x16\"",
    sizeLabel: "12x16\"",
    category: "ACRYLIC" as const,
    cost: 32.00,
  },
  {
    sku: "GLOBAL-ACR-16x20",
    productName: "Acrylic Print 16x20\"",
    sizeLabel: "16x20\"",
    category: "ACRYLIC" as const,
    cost: 46.00,
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

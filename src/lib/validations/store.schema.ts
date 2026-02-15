import { z } from "zod"

export const storeSettingsSchema = z.object({
  storeEnabled: z.boolean(),
  defaultMarkupPercent: z.number().int().min(0).max(500),
})

export const priceSheetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export const priceSheetItemSchema = z.object({
  prodigiSku: z.string().min(1, "SKU is required"),
  productCategory: z.enum([
    "PRINT",
    "CANVAS",
    "FRAMED_PRINT",
    "FINE_ART",
    "METAL_PRINT",
    "ACRYLIC",
    "PHOTO_BOOK",
  ]),
  productName: z.string().min(1, "Product name is required"),
  sizeLabel: z.string().min(1, "Size label is required"),
  prodigiCost: z.number().min(0),
  retailPrice: z.number().min(0.01, "Retail price must be positive"),
  currency: z.string().default("USD"),
})

export const shippingAddressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal/zip code is required"),
  country: z.literal("US", { error: "Only US shipping is available" }),
})

export const cartItemSchema = z.object({
  photoId: z.string().min(1),
  prodigiSku: z.string().min(1),
  productName: z.string().min(1),
  sizeLabel: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  unitPrice: z.number().min(0),
})

export const checkoutSchema = z.object({
  galleryId: z.string().min(1),
  customerEmail: z.string().email("Valid email is required"),
  customerName: z.string().min(1, "Name is required"),
  shippingAddress: shippingAddressSchema,
  items: z.array(cartItemSchema).min(1, "Cart cannot be empty"),
})

export type StoreSettingsData = z.infer<typeof storeSettingsSchema>
export type PriceSheetData = z.infer<typeof priceSheetSchema>
export type PriceSheetItemData = z.infer<typeof priceSheetItemSchema>
export type ShippingAddressData = z.infer<typeof shippingAddressSchema>
export type CartItemData = z.infer<typeof cartItemSchema>
export type CheckoutData = z.infer<typeof checkoutSchema>

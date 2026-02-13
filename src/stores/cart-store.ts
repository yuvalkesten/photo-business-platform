"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CartItem {
  photoId: string
  photoUrl: string
  photoFilename: string
  prodigiSku: string
  productName: string
  sizeLabel: string
  productCategory: string
  quantity: number
  unitPrice: number // in dollars
  prodigiCost: number // wholesale cost
}

interface CartState {
  galleryId: string | null
  items: CartItem[]
  setGalleryId: (galleryId: string) => void
  addItem: (item: CartItem) => void
  removeItem: (photoId: string, prodigiSku: string) => void
  updateQuantity: (photoId: string, prodigiSku: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
  getSubtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      galleryId: null,
      items: [],

      setGalleryId: (galleryId: string) => {
        const current = get().galleryId
        if (current && current !== galleryId) {
          // Different gallery, clear cart
          set({ galleryId, items: [] })
        } else {
          set({ galleryId })
        }
      },

      addItem: (item: CartItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.photoId === item.photoId && i.prodigiSku === item.prodigiSku
          )
          if (existingIndex >= 0) {
            const updated = [...state.items]
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + item.quantity,
            }
            return { items: updated }
          }
          return { items: [...state.items, item] }
        })
      },

      removeItem: (photoId: string, prodigiSku: string) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.photoId === photoId && i.prodigiSku === prodigiSku)
          ),
        }))
      },

      updateQuantity: (photoId: string, prodigiSku: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(photoId, prodigiSku)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.photoId === photoId && i.prodigiSku === prodigiSku
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    }),
    {
      name: "store_cart",
      partialize: (state) => ({
        galleryId: state.galleryId,
        items: state.items,
      }),
    }
  )
)

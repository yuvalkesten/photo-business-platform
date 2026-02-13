"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Trash2, Minus, Plus, Loader2 } from "lucide-react"
import { useCartStore } from "@/stores/cart-store"
import { createCheckout } from "@/actions/store/create-checkout"

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  galleryId: string
  shareToken: string
  themeVars?: Record<string, string>
  accentColor?: string
}

export function CartDrawer({
  open,
  onOpenChange,
  galleryId,
  shareToken,
  accentColor = "#8b5cf6",
}: CartDrawerProps) {
  const { items, removeItem, updateQuantity, clearCart, getSubtotal } = useCartStore()
  const [checkingOut, setCheckingOut] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("US")
  const [error, setError] = useState<string | null>(null)

  const subtotal = getSubtotal()
  const canCheckout =
    items.length > 0 &&
    customerName.trim() &&
    customerEmail.trim() &&
    addressLine1.trim() &&
    city.trim() &&
    postalCode.trim()

  const handleCheckout = async () => {
    if (!canCheckout) return
    setCheckingOut(true)
    setError(null)

    const result = await createCheckout({
      galleryId,
      customerEmail: customerEmail.trim(),
      customerName: customerName.trim(),
      shippingAddress: {
        name: customerName.trim(),
        line1: addressLine1.trim(),
        line2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim() || undefined,
        postalCode: postalCode.trim(),
        country: country.trim(),
      },
      items: items.map((item) => ({
        photoId: item.photoId,
        prodigiSku: item.prodigiSku,
        productName: item.productName,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      shareToken,
    })

    if (result.error) {
      setError(result.error)
      setCheckingOut(false)
      return
    }

    if (result.checkoutUrl) {
      // Clear cart and redirect to Stripe
      clearCart()
      window.location.href = result.checkoutUrl
    } else {
      setError("Failed to create checkout session")
      setCheckingOut(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              {/* Cart Items */}
              <div className="space-y-4 pb-4">
                {items.map((item) => (
                  <div key={`${item.photoId}-${item.prodigiSku}`} className="flex gap-3">
                    <div className="h-16 w-16 rounded overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.photoUrl}
                        alt={item.photoFilename}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.sizeLabel}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.photoId, item.prodigiSku, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.photoId, item.prodigiSku, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mt-1 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.photoId, item.prodigiSku)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Shipping Address */}
              <div className="space-y-3 pb-4">
                <h3 className="font-medium text-sm">Shipping Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="cart-name" className="text-xs">Full Name</Label>
                    <Input
                      id="cart-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Doe"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="cart-email" className="text-xs">Email</Label>
                    <Input
                      id="cart-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="cart-line1" className="text-xs">Address</Label>
                    <Input
                      id="cart-line1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="123 Main St"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="cart-line2" className="text-xs">Apt / Suite (optional)</Label>
                    <Input
                      id="cart-line2"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cart-city" className="text-xs">City</Label>
                    <Input
                      id="cart-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cart-state" className="text-xs">State</Label>
                    <Input
                      id="cart-state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cart-postal" className="text-xs">Postal Code</Label>
                    <Input
                      id="cart-postal"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cart-country" className="text-xs">Country</Label>
                    <Input
                      id="cart-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="US"
                      maxLength={2}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer with total + checkout */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Subtotal</span>
                <span className="text-lg font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping and tax calculated at checkout
              </p>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!canCheckout || checkingOut}
                onClick={handleCheckout}
                style={{ backgroundColor: accentColor }}
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay $${subtotal.toFixed(2)}`
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

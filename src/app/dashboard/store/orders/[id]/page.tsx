import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getStoreOrder } from "@/actions/store/get-store-order"
import { cancelStoreOrder } from "@/actions/store/cancel-store-order"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Package,
  User,
  Truck,
  DollarSign,
  ExternalLink,
  XCircle,
  ImageIcon,
} from "lucide-react"

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  PRINTED: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  REFUNDED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getStoreOrder(id)

  if (result.error || !result.order) {
    notFound()
  }

  const { order } = result
  const shippingAddress = order.shippingAddress as {
    name?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  } | null

  const cancellable = ["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(order.status)

  async function handleCancel() {
    "use server"
    await cancelStoreOrder(id)
    redirect("/dashboard/store/orders")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/store/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {order.orderNumber}
              </h1>
              <Badge
                className={STATUS_COLORS[order.status] || ""}
                variant="secondary"
              >
                {order.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        {cancellable && (
          <form action={handleCancel}>
            <Button variant="destructive" type="submit">
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-16 w-16 rounded overflow-hidden bg-muted shrink-0">
                      {item.photo ? (
                        <img
                          src={item.photo.thumbnailUrl || item.photo.s3Url}
                          alt={item.photo.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.sizeLabel} &middot; Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.lineTotal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tracking */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tracking Number</span>
                  <span className="font-mono">{order.trackingNumber}</span>
                </div>
                {order.trackingUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track Package
                    </a>
                  </Button>
                )}
                {order.shippedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipped</span>
                    <span>{new Date(order.shippedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-muted-foreground">{order.customerEmail}</p>
              {shippingAddress && (
                <>
                  <Separator />
                  <p className="font-medium text-xs uppercase text-muted-foreground">Shipping Address</p>
                  <p>{shippingAddress.line1}</p>
                  {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                  <p>
                    {shippingAddress.city}
                    {shippingAddress.state ? `, ${shippingAddress.state}` : ""}{" "}
                    {shippingAddress.postalCode}
                  </p>
                  <p>{shippingAddress.country}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${order.shippingCost.toFixed(2)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${order.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${order.totalAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-muted-foreground">
                <span>Prodigi Cost</span>
                <span>-${order.prodigiCostTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-green-600">
                <span>Your Profit</span>
                <span>${order.photographerProfit.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/dashboard/galleries/${order.gallery.id}`}
                className="text-primary hover:underline"
              >
                {order.gallery.title}
              </Link>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{new Date(order.paidAt).toLocaleString()}</span>
                </div>
              )}
              {order.shippedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipped</span>
                  <span>{new Date(order.shippedAt).toLocaleString()}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered</span>
                  <span>{new Date(order.deliveredAt).toLocaleString()}</span>
                </div>
              )}
              {order.cancelledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span>{new Date(order.cancelledAt).toLocaleString()}</span>
                </div>
              )}
              {order.refundedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refunded</span>
                  <span>{new Date(order.refundedAt).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

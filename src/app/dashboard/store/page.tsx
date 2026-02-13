import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag,
  FileText,
  Settings,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react"

export default async function StorePage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const [priceSheetCount, orderCount, recentOrders] = await Promise.all([
    prisma.priceSheet.count({ where: { userId: user.id } }),
    prisma.storeOrder.count({ where: { userId: user.id } }),
    prisma.storeOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        photographerProfit: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { storeEnabled: true },
  })

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Print Store</h1>
          <p className="text-muted-foreground">
            Manage your print store, price sheets, and orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fullUser?.storeEnabled ? (
            <Badge className="bg-green-100 text-green-800">Store Active</Badge>
          ) : (
            <Badge variant="outline">Store Disabled</Badge>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/store/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{priceSheetCount}</p>
                <p className="text-sm text-muted-foreground">Price Sheets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orderCount}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${recentOrders.reduce((sum, o) => sum + Number(o.photographerProfit), 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <Link href="/dashboard/store/price-sheets">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Price Sheets
                <ArrowRight className="h-4 w-4 ml-auto" />
              </CardTitle>
              <CardDescription>
                Create and manage price sheets for your galleries
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <Link href="/dashboard/store/orders">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Orders
                <ArrowRight className="h-4 w-4 ml-auto" />
              </CardTitle>
              <CardDescription>
                View and manage print orders from your clients
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/store/orders">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/store/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName} &middot;{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={STATUS_COLORS[order.status] || ""}
                      variant="secondary"
                    >
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-medium">
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

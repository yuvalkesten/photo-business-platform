import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getPriceSheet } from "@/actions/store/get-price-sheets"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { PriceSheetEditor } from "@/components/features/store/PriceSheetEditor"

interface PriceSheetDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PriceSheetDetailPage({ params }: PriceSheetDetailPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const { id } = await params
  const result = await getPriceSheet(id)

  if (result.error || !result.priceSheet) {
    notFound()
  }

  const { priceSheet } = result

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultMarkupPercent: true },
  })

  // Serialize Decimal fields for client components
  const serializedItems = priceSheet.items.map((item) => ({
    ...item,
    prodigiCost: Number(item.prodigiCost),
    retailPrice: Number(item.retailPrice),
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/store/price-sheets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {priceSheet.name}
              </h1>
              {priceSheet.isDefault && (
                <Badge variant="secondary">Default</Badge>
              )}
              {!priceSheet.isActive && (
                <Badge variant="outline">Inactive</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {priceSheet.items.length} product{priceSheet.items.length !== 1 ? "s" : ""} &middot;{" "}
              {priceSheet._count.galleries} {priceSheet._count.galleries === 1 ? "gallery" : "galleries"}
            </p>
          </div>
        </div>
      </div>

      <PriceSheetEditor
        priceSheetId={id}
        items={serializedItems}
        defaultMarkupPercent={fullUser?.defaultMarkupPercent ?? 50}
      />
    </div>
  )
}

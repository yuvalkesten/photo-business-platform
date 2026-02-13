import { redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { getPriceSheets } from "@/actions/store/get-price-sheets"
import { createPriceSheet } from "@/actions/store/create-price-sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, FileText, ImageIcon } from "lucide-react"

export default async function PriceSheetsPage() {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const result = await getPriceSheets()
  const priceSheets = result.priceSheets || []

  async function handleCreateDefault() {
    "use server"
    const result = await createPriceSheet({
      name: "Default Price Sheet",
      isDefault: true,
    })
    if (result.success && result.priceSheet) {
      redirect(`/dashboard/store/price-sheets/${result.priceSheet.id}`)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/store">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Price Sheets</h1>
            <p className="text-muted-foreground">
              Create price sheets and assign them to galleries
            </p>
          </div>
        </div>
        <form action={handleCreateDefault}>
          <Button type="submit">
            <Plus className="h-4 w-4 mr-2" />
            New Price Sheet
          </Button>
        </form>
      </div>

      {priceSheets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No price sheets yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a price sheet to define which products and prices are available in your galleries.
            </p>
            <form action={handleCreateDefault}>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Price Sheet
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceSheets.map((sheet) => (
            <Link key={sheet.id} href={`/dashboard/store/price-sheets/${sheet.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{sheet.name}</CardTitle>
                    <div className="flex gap-1">
                      {sheet.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                      {!sheet.isActive && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {sheet._count.items} product{sheet._count.items !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {sheet._count.galleries} {sheet._count.galleries === 1 ? "gallery" : "galleries"}
                    </span>
                    <span>
                      Created {new Date(sheet.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

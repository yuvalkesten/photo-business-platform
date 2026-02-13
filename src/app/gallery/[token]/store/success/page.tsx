import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowLeft, Package } from "lucide-react"

interface StoreSuccessPageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function StoreSuccessPage({ params, searchParams }: StoreSuccessPageProps) {
  const { token } = await params
  const { order } = await searchParams

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          <CardDescription className="text-base">
            Thank you for your purchase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {order && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Order Number</p>
              <p className="text-lg font-mono font-bold">{order}</p>
            </div>
          )}

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 mt-0.5 shrink-0" />
              <p>
                Your prints will be produced and shipped directly to you.
                You&apos;ll receive an email with tracking information once your order ships.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href={`/gallery/${token}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Suspense } from "react"
import Link from "next/link"
import { requireAuth } from "@/lib/auth/utils"
import { redirect } from "next/navigation"
import { getGalleries } from "@/actions/galleries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Plus, ImageIcon, Search, Lock, Globe, Download, Eye } from "lucide-react"

interface GalleriesPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

function GalleriesLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-40 rounded-t-lg" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function GalleriesList({ search, page }: { search?: string; page: number }) {
  const result = await getGalleries({ search, page, limit: 50 })

  if (result.error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    )
  }

  const { galleries, pagination } = result

  if (!galleries || galleries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No galleries found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {search
              ? "No galleries match your search criteria."
              : "Get started by creating your first gallery."}
          </p>
          <Button asChild>
            <Link href="/dashboard/galleries/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Gallery
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {galleries.map((gallery) => (
          <Link key={gallery.id} href={`/dashboard/galleries/${gallery.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full overflow-hidden">
              {/* Cover Image or Placeholder */}
              <div className="h-40 bg-muted flex items-center justify-center">
                {gallery.coverImage ? (
                  <img
                    src={gallery.coverImage}
                    alt={gallery.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold truncate">{gallery.title}</h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {gallery.isPublic ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {gallery.project?.name}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>{gallery._count?.photos || 0} photos</span>
                  </div>
                  {gallery.allowDownload && (
                    <div className="flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                {gallery.contact && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {gallery.contact.firstName} {gallery.contact.lastName}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={`/dashboard/galleries?page=${pageNum}${search ? `&search=${search}` : ""}`}
            >
              <Button
                variant={pageNum === page ? "default" : "outline"}
                size="sm"
              >
                {pageNum}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

export default async function GalleriesPage({ searchParams }: GalleriesPageProps) {
  const user = await requireAuth()
  if (!user) redirect("/auth/signin")

  const params = await searchParams
  const search = params.search
  const page = parseInt(params.page || "1")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Galleries</h1>
          <p className="text-muted-foreground">
            Manage and share your photo galleries with clients
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/galleries/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Gallery
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search galleries..."
                defaultValue={search}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Galleries Grid */}
      <Suspense fallback={<GalleriesLoading />}>
        <GalleriesList search={search} page={page} />
      </Suspense>
    </div>
  )
}

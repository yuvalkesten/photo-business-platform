-- AlterTable
ALTER TABLE "favorite_photos" ADD COLUMN     "comment" TEXT;

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#8b5cf6',
ADD COLUMN     "downloadResolution" TEXT NOT NULL DEFAULT 'original',
ADD COLUMN     "favoriteLimit" INTEGER,
ADD COLUMN     "fontFamily" TEXT NOT NULL DEFAULT 'inter',
ADD COLUMN     "gridStyle" TEXT NOT NULL DEFAULT 'grid',
ADD COLUMN     "primaryColor" TEXT NOT NULL DEFAULT '#000000',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'classic';

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "setId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "brandAccentColor" TEXT NOT NULL DEFAULT '#8b5cf6',
ADD COLUMN     "brandFavicon" TEXT,
ADD COLUMN     "brandLogo" TEXT,
ADD COLUMN     "brandPrimaryColor" TEXT NOT NULL DEFAULT '#000000';

-- CreateTable
CREATE TABLE "photo_sets" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "photo_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_events" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "photoId" TEXT,
    "visitorEmail" TEXT,
    "resolution" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_sets_galleryId_order_idx" ON "photo_sets"("galleryId", "order");

-- CreateIndex
CREATE INDEX "download_events_galleryId_createdAt_idx" ON "download_events"("galleryId", "createdAt");

-- CreateIndex
CREATE INDEX "photos_setId_idx" ON "photos"("setId");

-- AddForeignKey
ALTER TABLE "photo_sets" ADD CONSTRAINT "photo_sets_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_setId_fkey" FOREIGN KEY ("setId") REFERENCES "photo_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

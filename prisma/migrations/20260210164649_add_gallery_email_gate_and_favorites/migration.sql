-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "requireEmail" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "gallery_visitors" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_lists" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_photos" (
    "id" TEXT NOT NULL,
    "favoriteListId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "favorite_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_visitors_galleryId_idx" ON "gallery_visitors"("galleryId");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_visitors_galleryId_email_key" ON "gallery_visitors"("galleryId", "email");

-- CreateIndex
CREATE INDEX "favorite_lists_galleryId_idx" ON "favorite_lists"("galleryId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_photos_favoriteListId_photoId_key" ON "favorite_photos"("favoriteListId", "photoId");

-- AddForeignKey
ALTER TABLE "gallery_visitors" ADD CONSTRAINT "gallery_visitors_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_lists" ADD CONSTRAINT "favorite_lists_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_photos" ADD CONSTRAINT "favorite_photos_favoriteListId_fkey" FOREIGN KEY ("favoriteListId") REFERENCES "favorite_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_photos" ADD CONSTRAINT "favorite_photos_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

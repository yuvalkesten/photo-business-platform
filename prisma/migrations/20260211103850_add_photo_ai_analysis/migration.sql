-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "aiSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analysisProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAnalysisTriggeredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "photo_analyses" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "analysisData" JSONB,
    "searchTags" TEXT[],
    "faceData" JSONB,
    "faceCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_clusters" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT,
    "photoIds" TEXT[],
    "faceDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photo_analyses_photoId_key" ON "photo_analyses"("photoId");

-- CreateIndex
CREATE INDEX "photo_analyses_galleryId_status_idx" ON "photo_analyses"("galleryId", "status");

-- CreateIndex
CREATE INDEX "photo_analyses_galleryId_idx" ON "photo_analyses"("galleryId");

-- CreateIndex
CREATE INDEX "person_clusters_galleryId_idx" ON "person_clusters"("galleryId");

-- AddForeignKey
ALTER TABLE "photo_analyses" ADD CONSTRAINT "photo_analyses_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_analyses" ADD CONSTRAINT "photo_analyses_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_clusters" ADD CONSTRAINT "person_clusters_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

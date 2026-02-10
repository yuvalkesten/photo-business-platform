-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "watermarkedUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "watermarkOpacity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "watermarkPosition" TEXT NOT NULL DEFAULT 'center',
ADD COLUMN     "watermarkUrl" TEXT;

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "rekognitionCollectionId" TEXT;

-- AlterTable
ALTER TABLE "person_clusters" ADD COLUMN     "rekognitionFaceIds" TEXT[],
ADD COLUMN     "representativeFaceId" TEXT;

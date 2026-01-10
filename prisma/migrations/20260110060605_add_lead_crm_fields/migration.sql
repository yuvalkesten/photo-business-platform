-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('BUDGET', 'TIMING', 'COMPETITOR', 'NO_RESPONSE', 'SCOPE_MISMATCH', 'PERSONAL_REASONS', 'OTHER');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "bookedAt" TIMESTAMP(3),
ADD COLUMN     "budgetMax" DECIMAL(10,2),
ADD COLUMN     "budgetMin" DECIMAL(10,2),
ADD COLUMN     "closeProbability" INTEGER DEFAULT 50,
ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "lastContactDate" TIMESTAMP(3),
ADD COLUMN     "leadTemperature" "LeadTemperature",
ADD COLUMN     "lostNotes" TEXT,
ADD COLUMN     "lostReason" "LostReason",
ADD COLUMN     "nextFollowUpDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "projects_userId_leadTemperature_idx" ON "projects"("userId", "leadTemperature");

-- CreateIndex
CREATE INDEX "projects_userId_nextFollowUpDate_idx" ON "projects"("userId", "nextFollowUpDate");

-- CreateIndex
CREATE INDEX "projects_userId_eventDate_idx" ON "projects"("userId", "eventDate");

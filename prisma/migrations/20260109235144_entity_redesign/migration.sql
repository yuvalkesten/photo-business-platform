/*
  Warnings:

  - You are about to drop the column `bookingId` on the `galleries` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `galleries` table. All the data in the column will be lost.
  - You are about to drop the `bookings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `contactId` to the `galleries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `galleries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('LEAD', 'CLIENT', 'PAST_CLIENT', 'COLLABORATOR', 'SUPPLIER', 'REFERRAL_SOURCE');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('COMPANY', 'NGO', 'VENUE', 'VENDOR', 'AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('WEDDING', 'ENGAGEMENT', 'PORTRAIT', 'FAMILY', 'NEWBORN', 'CORPORATE', 'EVENT', 'COMMERCIAL', 'REAL_ESTATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('INQUIRY', 'PROPOSAL_SENT', 'BOOKED', 'IN_PROGRESS', 'POST_PRODUCTION', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PhotoSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_clientId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_userId_fkey";

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_userId_fkey";

-- DropForeignKey
ALTER TABLE "galleries" DROP CONSTRAINT "galleries_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "galleries" DROP CONSTRAINT "galleries_clientId_fkey";

-- DropIndex
DROP INDEX "galleries_bookingId_key";

-- DropIndex
DROP INDEX "galleries_clientId_idx";

-- AlterTable
ALTER TABLE "galleries" DROP COLUMN "bookingId",
DROP COLUMN "clientId",
ADD COLUMN     "contactId" TEXT NOT NULL,
ADD COLUMN     "projectId" TEXT NOT NULL;

-- DropTable
DROP TABLE "bookings";

-- DropTable
DROP TABLE "clients";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "ClientStatus";

-- DropEnum
DROP TYPE "EventType";

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organizationId" TEXT,
    "jobTitle" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "website" TEXT,
    "type" "ContactType" NOT NULL DEFAULT 'LEAD',
    "source" TEXT,
    "tags" TEXT[],
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType",
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" "ProjectType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'INQUIRY',
    "totalPrice" DECIMAL(10,2),
    "deposit" DECIMAL(10,2),
    "paidAmount" DECIMAL(10,2),
    "source" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_sessions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "location" TEXT,
    "locationNotes" TEXT,
    "googleEventId" TEXT,
    "googleCalendarId" TEXT,
    "status" "PhotoSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_userId_type_idx" ON "contacts"("userId", "type");

-- CreateIndex
CREATE INDEX "contacts_userId_status_idx" ON "contacts"("userId", "status");

-- CreateIndex
CREATE INDEX "contacts_organizationId_idx" ON "contacts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId_email_key" ON "contacts"("userId", "email");

-- CreateIndex
CREATE INDEX "organizations_userId_idx" ON "organizations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_userId_name_key" ON "organizations"("userId", "name");

-- CreateIndex
CREATE INDEX "projects_userId_status_idx" ON "projects"("userId", "status");

-- CreateIndex
CREATE INDEX "projects_contactId_idx" ON "projects"("contactId");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "photo_sessions_googleEventId_key" ON "photo_sessions"("googleEventId");

-- CreateIndex
CREATE INDEX "photo_sessions_projectId_idx" ON "photo_sessions"("projectId");

-- CreateIndex
CREATE INDEX "photo_sessions_scheduledAt_idx" ON "photo_sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX "galleries_projectId_idx" ON "galleries"("projectId");

-- CreateIndex
CREATE INDEX "galleries_contactId_idx" ON "galleries"("contactId");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_sessions" ADD CONSTRAINT "photo_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

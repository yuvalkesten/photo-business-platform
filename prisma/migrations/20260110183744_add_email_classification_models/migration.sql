-- CreateEnum
CREATE TYPE "EmailClassification" AS ENUM ('INQUIRY', 'URGENT_REQUEST', 'INVOICE', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'CLASSIFIED', 'ACTION_TAKEN', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'RECEIPT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "email_watches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "resourceUri" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_emails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "snippet" TEXT,
    "classification" "EmailClassification",
    "classificationData" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdContactId" TEXT,
    "createdProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processed_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processedEmailId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "vendorName" TEXT,
    "vendorEmail" TEXT,
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_watches_userId_key" ON "email_watches"("userId");

-- CreateIndex
CREATE INDEX "processed_emails_userId_status_idx" ON "processed_emails"("userId", "status");

-- CreateIndex
CREATE INDEX "processed_emails_userId_classification_idx" ON "processed_emails"("userId", "classification");

-- CreateIndex
CREATE INDEX "processed_emails_userId_receivedAt_idx" ON "processed_emails"("userId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "processed_emails_userId_gmailMessageId_key" ON "processed_emails"("userId", "gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_documents_processedEmailId_key" ON "financial_documents"("processedEmailId");

-- CreateIndex
CREATE INDEX "financial_documents_userId_documentType_idx" ON "financial_documents"("userId", "documentType");

-- CreateIndex
CREATE INDEX "financial_documents_userId_status_idx" ON "financial_documents"("userId", "status");

-- AddForeignKey
ALTER TABLE "email_watches" ADD CONSTRAINT "email_watches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_createdContactId_fkey" FOREIGN KEY ("createdContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_createdProjectId_fkey" FOREIGN KEY ("createdProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_processedEmailId_fkey" FOREIGN KEY ("processedEmailId") REFERENCES "processed_emails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

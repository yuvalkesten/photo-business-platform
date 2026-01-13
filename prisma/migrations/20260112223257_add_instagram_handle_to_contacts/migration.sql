-- CreateEnum
CREATE TYPE "MessagePlatform" AS ENUM ('INSTAGRAM');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "instagramHandle" TEXT;

-- CreateTable
CREATE TABLE "instagram_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "pageId" TEXT,
    "pageName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "MessagePlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "platformMessageId" TEXT NOT NULL,
    "platformThreadId" TEXT,
    "senderName" TEXT,
    "senderHandle" TEXT,
    "senderId" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
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

    CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_accounts_userId_key" ON "instagram_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_accounts_instagramUserId_key" ON "instagram_accounts"("instagramUserId");

-- CreateIndex
CREATE INDEX "processed_messages_userId_status_idx" ON "processed_messages"("userId", "status");

-- CreateIndex
CREATE INDEX "processed_messages_userId_classification_idx" ON "processed_messages"("userId", "classification");

-- CreateIndex
CREATE INDEX "processed_messages_userId_receivedAt_idx" ON "processed_messages"("userId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "processed_messages_userId_platform_platformMessageId_key" ON "processed_messages"("userId", "platform", "platformMessageId");

-- CreateIndex
CREATE INDEX "contacts_userId_instagramHandle_idx" ON "contacts"("userId", "instagramHandle");

-- AddForeignKey
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_messages" ADD CONSTRAINT "processed_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_messages" ADD CONSTRAINT "processed_messages_createdContactId_fkey" FOREIGN KEY ("createdContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_messages" ADD CONSTRAINT "processed_messages_createdProjectId_fkey" FOREIGN KEY ("createdProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

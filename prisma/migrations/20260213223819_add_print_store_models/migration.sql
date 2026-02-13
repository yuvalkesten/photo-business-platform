-- CreateEnum
CREATE TYPE "StoreProductCategory" AS ENUM ('PRINT', 'CANVAS', 'FRAMED_PRINT', 'METAL_PRINT', 'ACRYLIC', 'PHOTO_BOOK');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PRINTED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED');

-- DropIndex
DROP INDEX "idx_photo_analyses_search_tags_gin";

-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "priceSheetId" TEXT,
ADD COLUMN     "storeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "defaultMarkupPercent" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "storeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "price_sheets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_sheet_items" (
    "id" TEXT NOT NULL,
    "priceSheetId" TEXT NOT NULL,
    "prodigiSku" TEXT NOT NULL,
    "productCategory" "StoreProductCategory" NOT NULL,
    "productName" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "prodigiCost" DECIMAL(10,2) NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "prodigiOrderId" TEXT,
    "prodigiOrderStatus" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "prodigiCostTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "photographerProfit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingMethod" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippingAddress" JSONB,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "photoId" TEXT,
    "prodigiSku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "prodigiUnitCost" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "printFileUrl" TEXT,
    "prodigiItemId" TEXT,

    CONSTRAINT "store_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_sheets_userId_idx" ON "price_sheets"("userId");

-- CreateIndex
CREATE INDEX "price_sheet_items_priceSheetId_idx" ON "price_sheet_items"("priceSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_orderNumber_key" ON "store_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_stripeCheckoutSessionId_key" ON "store_orders"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "store_orders_userId_idx" ON "store_orders"("userId");

-- CreateIndex
CREATE INDEX "store_orders_galleryId_idx" ON "store_orders"("galleryId");

-- CreateIndex
CREATE INDEX "store_orders_userId_status_idx" ON "store_orders"("userId", "status");

-- CreateIndex
CREATE INDEX "store_orders_orderNumber_idx" ON "store_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "store_order_items_orderId_idx" ON "store_order_items"("orderId");

-- CreateIndex
CREATE INDEX "store_order_items_photoId_idx" ON "store_order_items"("photoId");

-- CreateIndex
CREATE INDEX "galleries_priceSheetId_idx" ON "galleries"("priceSheetId");

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_priceSheetId_fkey" FOREIGN KEY ("priceSheetId") REFERENCES "price_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_sheets" ADD CONSTRAINT "price_sheets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_sheet_items" ADD CONSTRAINT "price_sheet_items_priceSheetId_fkey" FOREIGN KEY ("priceSheetId") REFERENCES "price_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

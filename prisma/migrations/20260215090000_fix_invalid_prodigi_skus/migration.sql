-- Fix invalid Prodigi SKUs in existing price sheet items
-- FRM (fake) -> CFP (real framed print SKU)
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-CFP-8X10', "productName" = 'Framed Print 8x10"', "prodigiCost" = 35.00 WHERE "prodigiSku" = 'GLOBAL-FRM-8x10-BLK';
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-CFP-11X14', "productName" = 'Framed Print 11x14"', "prodigiCost" = 40.00 WHERE "prodigiSku" = 'GLOBAL-FRM-11x14-BLK';
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-CFP-16X20', "productName" = 'Framed Print 16x20"', "prodigiCost" = 50.00 WHERE "prodigiSku" = 'GLOBAL-FRM-16x20-BLK';
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-CFP-20X30', "productName" = 'Framed Print 20x30"', "prodigiCost" = 70.00 WHERE "prodigiSku" = 'GLOBAL-FRM-20x30-BLK';

-- Remove invalid PHO-11x14-PRO (doesn't exist in Prodigi)
DELETE FROM "price_sheet_items" WHERE "prodigiSku" = 'GLOBAL-PHO-11x14-PRO';

-- MTL (fake) -> FAP (real fine art print SKU) and update category
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-FAP-8X10', "productName" = 'Fine Art Print 8x10"', "productCategory" = 'FINE_ART', "prodigiCost" = 6.00 WHERE "prodigiSku" = 'GLOBAL-MTL-8x10';
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-FAP-12X16', "productName" = 'Fine Art Print 12x16"', "productCategory" = 'FINE_ART', "prodigiCost" = 10.00 WHERE "prodigiSku" = 'GLOBAL-MTL-12x16';
UPDATE "price_sheet_items" SET "prodigiSku" = 'GLOBAL-FAP-16X20', "productName" = 'Fine Art Print 16x20"', "productCategory" = 'FINE_ART', "prodigiCost" = 14.00 WHERE "prodigiSku" = 'GLOBAL-MTL-16x20';

-- ACR (fake) -> delete (no direct replacement, fine art already covers those sizes)
DELETE FROM "price_sheet_items" WHERE "prodigiSku" IN ('GLOBAL-ACR-8x10', 'GLOBAL-ACR-12x16', 'GLOBAL-ACR-16x20');

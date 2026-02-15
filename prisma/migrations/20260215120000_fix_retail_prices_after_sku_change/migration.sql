-- Fix retail prices after SKU cost changes.
-- Previous migration updated prodigiCost but not retailPrice, so items
-- could be priced below cost. Scale retailPrice by (newCost / oldCost)
-- to preserve the photographer's markup percentage.

-- Framed prints: old FRM cost → new CFP cost
-- CFP-8X10:  old $22 → new $35 (ratio 35/22)
-- CFP-11X14: old $30 → new $40 (ratio 40/30)
-- CFP-16X20: old $42 → new $50 (ratio 50/42)
-- CFP-20X30: old $60 → new $70 (ratio 70/60)
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 35.00 / 22.00, 2) WHERE "prodigiSku" = 'GLOBAL-CFP-8X10';
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 40.00 / 30.00, 2) WHERE "prodigiSku" = 'GLOBAL-CFP-11X14';
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 50.00 / 42.00, 2) WHERE "prodigiSku" = 'GLOBAL-CFP-16X20';
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 70.00 / 60.00, 2) WHERE "prodigiSku" = 'GLOBAL-CFP-20X30';

-- Fine art prints (replaced metal): old MTL cost → new FAP cost
-- FAP-8X10:  old $18 → new $6 (ratio 6/18)
-- FAP-12X16: old $28 → new $10 (ratio 10/28)
-- FAP-16X20: old $40 → new $14 (ratio 14/40)
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 6.00 / 18.00, 2) WHERE "prodigiSku" = 'GLOBAL-FAP-8X10';
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 10.00 / 28.00, 2) WHERE "prodigiSku" = 'GLOBAL-FAP-12X16';
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("retailPrice" * 14.00 / 40.00, 2) WHERE "prodigiSku" = 'GLOBAL-FAP-16X20';

-- Safety net: ensure no item is priced below cost (shouldn't happen with proportional scaling)
UPDATE "price_sheet_items" SET "retailPrice" = ROUND("prodigiCost" * 1.50, 2) WHERE "retailPrice" < "prodigiCost";

# Current Task

## Status: COMPLETED

## Recent: Prodigi Quote API Integration + SKU Fix (Feb 15, 2026)
Integrated Prodigi Quote API into checkout flow and fixed all invalid product SKUs.

### Quote integration:
1. **`create-checkout.ts`**: Calls `getProdigiQuote()` before Stripe session. Extracts real shipping/tax, stores in StoreOrder, passes to Stripe.
2. **`checkout.ts`**: Added `taxAmount` param → "Tax" line item in Stripe session.
3. **`CartDrawer.tsx`**: Debounced (800ms) quote fetch on address entry. Shows subtotal/shipping/tax/total breakdown.
4. **`get-shipping-quote.ts`**: Returns `tax` in quote response.

### SKU + API response fixes:
5. **`types.ts`**: Fixed `ProdigiQuoteResponse` to use actual API fields (`totalCost`/`totalTax` not `total`/`tax`). Added `getDefaultProdigiAttributes(sku)` helper.
6. **Catalog SKUs**: Replaced invalid `GLOBAL-FRM-*` → `GLOBAL-CFP-*` (framed), removed `GLOBAL-MTL-*`/`GLOBAL-ACR-*` (don't exist), added `GLOBAL-FAP-*` (fine art).
7. **Attributes**: Each product type requires specific attributes (photo→finish, canvas→wrap, frame→color). All quote/checkout/order code now uses the shared helper.
8. **DB migration**: Added `FINE_ART` to `StoreProductCategory` enum.
9. **Data migration**: Replaced invalid SKUs in existing price sheets (FRM→CFP, MTL→FAP, removed ACR/PHO-11x14-PRO).

## Previous: Print Store Feature (Feb 14, 2026)
Full print store implementation for selling physical products (prints, canvas, framed prints) directly from client galleries. Uses Prodigi for fulfillment and Stripe for payments.

### What was built:
1. **Database**: PriceSheet, PriceSheetItem, StoreOrder, StoreOrderItem models + StoreProductCategory/StoreOrderStatus enums
2. **Prodigi client** (`src/lib/prodigi/`): products, orders, quotes, webhooks, submit-order
3. **Stripe client** (`src/lib/stripe/`): checkout sessions, webhook verification (lazy init for build safety)
4. **Cart store** (`src/stores/cart-store.ts`): Zustand + localStorage persistence
5. **Dashboard**: Store overview, settings, price sheet CRUD with Prodigi catalog browser, gallery store toggle
6. **Public gallery**: Store tab, Buy Print button in lightbox, cart drawer with shipping form + live quote
7. **Checkout flow**: Price validation, Prodigi quote for shipping/tax, StoreOrder creation, Stripe Checkout Session
8. **Webhooks**: Stripe (payment → Prodigi submission) + Prodigi (status updates, tracking)
9. **Order management**: Orders list with earnings, order detail with financials/timeline, cancel+refund

### Env vars needed:
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PRODIGI_API_KEY`, `PRODIGI_SANDBOX_API_KEY`, `PRODIGI_WEBHOOK_SECRET`

## Previous: Hybrid CV + LLM Face Detection (AWS Rekognition)
Replaced pure-LLM face detection/clustering with AWS Rekognition CV backbone:
- **Rekognition DetectFaces** for precise bounding boxes (confidence-filtered >=70%)
- **Rekognition IndexFaces/SearchFaces** for visual similarity clustering
- **Gemini Vision** retained for scene understanding (descriptions, tags, roles, mood)
- 3-stage pipeline: CV Detection → LLM Annotation → Face Indexing
- Graceful degradation: if Rekognition unavailable, falls back to LLM-only

## Next Up: Gallery Enhancement Features
Based on competitive analysis (Unscripted + Pixieset):

### 1. Enhanced Client Proofing
- Favorite limits (photographer sets max # of selections per client)
- Client notes/comments on individual photos
- CSV export of selected favorites
- Preset favorite lists (e.g., "Album Picks", "Prints")

### 2. Gallery Expiry & Reminders
- Gallery expiry date field
- Automated reminder emails before expiry (30d, 7d, 1d)
- Expired gallery shows "gallery has expired" message

## What's Working
- Full gallery workflow: upload → AI analysis → public gallery with search
- Print store: browse → add to cart → live shipping/tax quote → Stripe checkout → Prodigi fulfillment
- Instagram OAuth + webhook DM processing
- Email classification and detail view
- All dashboards with real-time updates

## Last Updated
2026-02-15

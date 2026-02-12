# Scalability & Production-Readiness Audit

**Date:** February 2026
**Target Scale:** 20,000 photographers, ~10 gallery views/week per photographer

---

## 1. Executive Summary

**Current state: Early product — suitable for ~50-200 photographers.**

The platform is well-architected for a small user base: clean server action patterns, proper auth split for edge, good use of presigned URLs for uploads, and a working AI pipeline. However, it has **no infrastructure for scale** — no caching, no CDN, no job queue, no rate limiting, no monitoring, and several unbounded queries that will crash under load.

### Scale Ceiling Estimates

| Component | Current Ceiling | Bottleneck |
|-----------|----------------|------------|
| Gallery views | ~500/hour | Unbounded photo query loads all photos + JSON into memory per view |
| Photo uploads | ~50 concurrent | `Promise.all()` image processing with no concurrency limit |
| AI analysis | ~1 photo/second | Batch size 3, 2s delay, sequential pipeline |
| Database | ~100 connections | Neon default limits, no connection pooler configured |
| Search | ~100/hour (complex) | LLM ranking call per complex search |

### Top 5 Risks at Scale

1. **Gallery view loads entire photo set into memory** — 1,000-photo gallery = multi-MB payload per view
2. **No job queue** — AI analysis, image processing, and email classification all run in-request
3. **No CDN** — Every image served through S3 direct URLs or API proxy
4. **No rate limiting** — All endpoints open to abuse
5. **AI costs are unbounded** — No per-user quotas, no cost tracking, no circuit breakers

---

## 2. Scale Profile

For **20,000 photographers** with **~10 clients/week** each:

### Traffic Projections

| Metric | Per Month | Per Day | Per Hour (peak) |
|--------|-----------|---------|-----------------|
| Gallery views | 800,000 | 27,000 | 5,400 |
| New galleries | 50,000 | 1,700 | 340 |
| Photos uploaded | 15,000,000 | 500,000 | 100,000 |
| AI analyses triggered | 50,000 galleries | 1,700 | 340 |
| Photos analyzed | 15,000,000 | 500,000 | 100,000 |
| Photo downloads | ~1,500,000 | 50,000 | 10,000 |
| Search queries | ~400,000 | 13,000 | 2,600 |

### Storage Growth

| Item | Per Month | After 1 Year |
|------|-----------|--------------|
| Original photos (5MB avg) | 75 TB | 900 TB |
| Thumbnails (50KB avg) | 750 GB | 9 TB |
| Watermarked (200KB avg) | 3 TB | 36 TB |
| PhotoAnalysis JSON | ~15 GB | ~180 GB |
| Database (other) | ~5 GB | ~60 GB |

---

## 3. Database Layer

### 3.1 Connection Pooling — NOT CONFIGURED

**File:** `src/lib/prisma/client.ts`

The Prisma client uses default connection settings. The `DATABASE_URL` points to Neon without an explicit pooler endpoint. Neon's free tier supports 10 connections; Pro supports 100.

**At scale:** Each Vercel serverless function creates a new Prisma client on cold start. With 5,400 gallery views/hour at peak, concurrent function instances could easily exceed 100 connections, causing connection refused errors.

**Fix:** Use Neon's connection pooler URL (`-pooler` suffix) and configure Prisma's `connection_limit` parameter.

### 3.2 Unbounded Queries — CRITICAL

**`getPublicGallery()` in `src/actions/galleries/get-public-gallery.ts:8-72`**

This is the single most-called query — executed on every gallery view. It fetches:
- ALL photos with `orderBy: { order: "asc" }`
- Each photo's `analysis` (searchTags, description, faceData JSON, faceCount)
- All photoSets, personClusters, project, and user data

For a 1,000-photo gallery with AI analysis, this is ~5-10 MB of JSON per request. At 5,400 views/hour, that's 27-54 GB/hour of data serialized from the database.

**No pagination, no cursor, no lazy loading.**

**`person-clustering.ts:23-35`** — Loads ALL `PhotoAnalysis` records for a gallery with `faceData` JSON into memory, then iterates to build face arrays. A gallery with 5,000 analyzed photos with 3 faces each = 15,000 face objects in memory.

**`find-person/route.ts:105-120`** — Same pattern. Unbounded `findMany` loading all analysis records, then looping through each.

### 3.3 Missing Database Indexes

The Prisma schema has basic indexes but is missing several that will matter at scale:

| Missing Index | Table | Query Pattern |
|--------------|-------|---------------|
| `Photo(galleryId, order)` compound | Photo | Every gallery view orders by `order` |
| `PhotoAnalysis(galleryId, status)` compound | PhotoAnalysis | AI pipeline filters by both |
| `DownloadEvent(galleryId, createdAt)` compound | DownloadEvent | Stats queries filter by both |
| GIN index on `PhotoAnalysis.searchTags` | PhotoAnalysis | Array overlap search |
| GIN index on `PhotoAnalysis.description` (tsvector) | PhotoAnalysis | Full-text search |

Note: The raw SQL search in `photo-search.ts:50-70` uses `to_tsvector()` and array `&&` overlap, but these GIN indexes must be created via raw migrations — Prisma doesn't generate them automatically.

### 3.4 JSON Field Bloat

`PhotoAnalysis.faceData` and `PhotoAnalysis.analysisData` are JSON columns storing potentially large objects. These are fetched on every gallery view (via `getPublicGallery`). At scale, they should be lazy-loaded only when the user actually opens AI features.

### 3.5 Unbounded Growth Tables

- **DownloadEvent** — Every download creates a record. No archival or TTL. At 1.5M downloads/month, this table grows by 18M rows/year.
- **ProcessedEmail** — Every synced email creates a record with `classificationData` JSON.
- **PersonCluster.photoIds** — Unbounded array field that grows with gallery size.

---

## 4. AI Pipeline

### 4.1 Throughput Bottleneck

**File:** `src/lib/ai/analyze-gallery.ts:6-11`

```
BATCH_SIZE = 3
BATCH_DELAY_MS = 2000
```

Maximum throughput: **3 photos every ~4-5 seconds** (2s delay + processing time) = **~0.6-0.75 photos/second**.

For a 500-photo gallery: **~11-14 minutes** of analysis time.
At scale (500,000 photos/day): **~185 hours of serial processing per day** — clearly impossible without parallelism.

### 4.2 No Job Queue

Analysis runs inside Next.js `after()` callbacks (`src/app/api/galleries/[id]/analyze/route.ts`). This means:
- Processing is tied to the serverless function lifecycle
- No persistence — if the function crashes, progress is lost (partially mitigated by per-photo status tracking)
- No concurrency control — 100 simultaneous gallery analyses = 100 parallel Gemini API floods
- No visibility — no dashboard to monitor queue depth, failure rates, or costs
- Vercel function timeout (60s default, 300s Pro) will kill long analyses

### 4.3 Sequential Per-Photo Pipeline

**File:** `src/lib/ai/analyze-photo.ts`

Each photo goes through 4 sequential stages:
1. **Fetch photo from S3** (~1-3s for a 5MB image)
2. **Rekognition DetectFaces** (~0.5-1s)
3. **Gemini Vision analysis** (~3-8s)
4. **Rekognition IndexFaces** per detected face (~0.5-1s each)

Total: **~5-13 seconds per photo**. Steps 2 and 3 could run in parallel but don't.

### 4.4 Full Image Fetch for Analysis

`analyze-photo.ts:25-41` fetches the **full original photo** from S3 (up to 50MB), converts to base64, and sends to Gemini. Using thumbnails (600px, ~50KB) would be 100x less data with minimal quality loss for scene/tag detection.

### 4.5 Cost Projections

**Per-gallery costs (300 photos average):**

| Operation | Unit Cost | Count | Gallery Cost |
|-----------|-----------|-------|-------------|
| Gemini Vision (analysis) | ~$0.001 | 300 | $0.30 |
| Gemini Flash (search ranking) | ~$0.0002 | 50 searches | $0.01 |
| Rekognition DetectFaces | $0.001 | 300 | $0.30 |
| Rekognition IndexFaces | $0.001 | ~450 faces | $0.45 |
| Rekognition SearchFaces | $0.001 | ~100 unique | $0.10 |
| **Total per gallery** | | | **~$1.16** |

**At scale (50,000 galleries/month):**

| Service | Monthly Cost |
|---------|-------------|
| Gemini API | $15,500 |
| Rekognition | $42,500 |
| **AI subtotal** | **~$58,000/month** |

This is substantial. Without per-user quotas or opt-in controls, a single photographer uploading large galleries could rack up significant costs.

### 4.6 No Circuit Breaker

If Gemini or Rekognition has an outage, the system will:
- Keep retrying (3 retries with 2-8s backoff per photo)
- Accumulate errors across all galleries
- Waste compute on doomed requests
- No alert — just `console.error` logs

---

## 5. Storage & CDN

### 5.1 No CDN — CRITICAL

All images are served directly from S3 URLs. Gallery thumbnails, watermarked images, and originals are all `https://{bucket}.s3.{region}.amazonaws.com/...` URLs.

**Impact at scale:**
- S3 GET requests: 800,000 gallery views × ~100 thumbnails = 80M S3 GETs/month = **$3,200/month** in request costs alone
- Data transfer: 80M × 50KB avg = 4 PB outbound = **$368,640/month** at standard S3 pricing

A CloudFront CDN would reduce this by 60-80% and dramatically improve latency for global users.

### 5.2 In-Process Image Resizing

**File:** `src/app/api/galleries/upload/complete/route.ts:77-149`

Thumbnail and watermark generation runs inside the upload completion API route:
- All photos in a batch processed via `Promise.all()` with **no concurrency limit**
- Each photo: fetch from S3 → Sharp resize → upload thumbnail → Sharp resize → watermark → upload watermarked
- For 100 photos: 100 concurrent S3 fetches + 200 Sharp operations + 200 S3 uploads

This will exceed Vercel's memory limits (1024MB default) and timeout limits (60s default).

**Fix:** Move to a dedicated image processing service (AWS Lambda with SQS trigger, or a worker process).

### 5.3 Download Resizing — Every Time

**File:** `src/app/api/galleries/[id]/download/route.ts:80-86`

When a user downloads a photo at a specific resolution (web_1024, web_2048, etc.), the server:
1. Fetches the full original from S3
2. Resizes with Sharp in-memory
3. Streams to client

This resize happens on **every download request** — no caching of resized variants. If 100 clients download the same photo at web_2048, it's resized 100 times.

### 5.4 Storage Cost Projections

| Item | Monthly Growth | Monthly Cost | After 1 Year |
|------|---------------|-------------|--------------|
| Original photos | 75 TB | $1,725 | $20,700/yr growing |
| Thumbnails | 750 GB | $17 | $207/yr growing |
| Watermarked | 3 TB | $69 | $828/yr growing |
| S3 requests | 100M+ | $4,000+ | Growing |
| Data transfer (no CDN) | 4+ PB | $368,000+ | Growing |
| **Data transfer (with CDN)** | **4+ PB** | **~$80,000** | **Growing** |

Data transfer is by far the largest cost. A CDN is not optional at this scale — it's a **$280,000/month savings**.

---

## 6. Authentication & Security

### 6.1 Auth Strategy — GOOD

JWT-based sessions (NextAuth v5) mean session validation doesn't hit the database. This scales well. The edge-compatible auth config split is correct for Vercel deployment.

**Concern:** NextAuth v5 is still in **beta** (`5.0.0-beta.30`). Production stability isn't guaranteed.

### 6.2 Rate Limiting — NONE

No rate limiting exists anywhere in the codebase. Vulnerable endpoints:

| Endpoint | Risk |
|----------|------|
| `/api/auth/[...nextauth]` | Credential brute-force |
| `/api/galleries/upload` | Presigned URL generation abuse |
| `/api/galleries/[id]/analyze` | AI cost exploitation |
| `/api/galleries/[id]/download` | Bandwidth abuse |
| `/api/webhooks/gmail` | Denial of service |
| `searchGalleryPhotosAction` | Gemini API cost exploitation |

A single bad actor could trigger unlimited AI analyses or downloads.

### 6.3 Gallery Password in URL

**File:** `src/app/gallery/[token]/PasswordForm.tsx`

```
router.push(`/gallery/${token}?password=${encodeURIComponent(password)}`)
```

The gallery password is passed as a URL query parameter. This appears in browser history, server logs, and analytics tools. Should use a cookie or server-side session instead.

### 6.4 No Abuse Prevention

- No per-user upload quotas
- No per-user AI analysis quotas
- No per-gallery download limits
- No IP-based throttling
- No CAPTCHA on public endpoints

---

## 7. Frontend Performance

### 7.1 No Image Optimization

**File:** `src/app/gallery/[token]/GalleryView.tsx`

All images use raw `<img>` tags instead of Next.js `<Image>`:
- No automatic WebP/AVIF conversion
- No responsive `srcset`
- No lazy loading (`loading="lazy"`)
- No blur placeholder

A gallery with 500 photos loads **all 500 thumbnail URLs immediately** — ~25MB of images hitting S3 simultaneously.

### 7.2 Monolithic Gallery Component

`GalleryView.tsx` is **876 lines** — a single client component handling grid rendering, lightbox, slideshow, favorites, search, downloads, person filtering, and theming. No code splitting, no `React.lazy()`, no dynamic imports.

### 7.3 No Data Pagination on the Client

The `getPublicGallery` action returns ALL photos in one payload. A gallery with 2,000 photos sends the entire array to the client. Should implement:
- Server-side pagination (load 50-100 photos per page)
- Infinite scroll or virtualized list
- Lazy-load analysis data only when search is used

### 7.4 next.config.ts — Empty

```typescript
const nextConfig: NextConfig = {
  /* config options here */
};
```

Missing all optimization opportunities:
- `images.remotePatterns` for Next.js Image optimization
- `compress: true`
- `experimental.optimizePackageImports` for tree-shaking large libraries
- `headers()` for cache-control on static assets

---

## 8. Observability

### 8.1 No Monitoring — CRITICAL

- **No error tracking** (no Sentry, Bugsnag, or similar)
- **No structured logging** (only `console.error` scattered through code)
- **No APM/tracing** (no Datadog, New Relic, or Vercel Analytics integration)
- **No health check endpoint**
- **No alerting** for failures, high error rates, or cost spikes

At scale, you won't know when things break until users complain.

### 8.2 No Error Boundaries

No `error.tsx` files found in the app directory. A crash in the gallery view component produces a blank white page with no recovery path.

### 8.3 Silent Failures

Several critical operations use `.catch(() => {})` or `.catch(console.error)`:
- Download event tracking (`download/route.ts:90-97`)
- Email processing (`webhooks/gmail/route.ts:94-102`)
- Watermark generation failures are swallowed (`upload/complete/route.ts:123-125`)

---

## 9. Background Processing

### 9.1 No Job Queue — CRITICAL

The platform has three categories of background work, all running in-request:

| Work Type | Current Pattern | Problem |
|-----------|----------------|---------|
| AI photo analysis | `after()` callback | Tied to function lifecycle, no concurrency control |
| Image processing | `Promise.all()` in API route | Blocks response, can timeout/OOM |
| Email classification | Fire-and-forget in webhook | Lost on failure, no retry persistence |

**Required:** A proper job queue (BullMQ + Redis, AWS SQS, or Inngest/Trigger.dev for serverless).

### 9.2 Email Processing

**File:** `src/lib/email/processing/process-email.ts`

Each email calls Gemini for classification (5-15 seconds). This runs inside the Gmail webhook handler. Google Pub/Sub expects a response within 10 seconds — the classification call alone can exceed this.

`retryFailedEmails()` processes failed emails 10 at a time, but there's no automatic scheduler. It depends on being called manually or via a cron job.

### 9.3 Cron Jobs

Only one cron job found: `/api/cron/renew-gmail-watches` for Gmail push notification renewal. No cron for:
- Retrying failed email processing
- Cleaning up stale analysis records
- Archiving old download events
- Monitoring cost thresholds

---

## 10. Cost Projections at Scale

### Monthly Costs at 20,000 Photographers

| Category | Service | Estimated Monthly Cost |
|----------|---------|----------------------|
| **AI - Analysis** | Gemini Vision (15M photos) | $15,000 |
| **AI - Faces** | Rekognition (detect + index + search) | $42,500 |
| **AI - Search** | Gemini Flash (400K searches) | $80 |
| **Storage** | S3 (originals + thumbnails + watermarks) | $1,800 (growing monthly) |
| **Bandwidth** | S3 data transfer (no CDN) | $368,000 |
| **Bandwidth** | CloudFront (if added) | ~$80,000 |
| **Database** | Neon Pro | $69+ (compute-based) |
| **Compute** | Vercel Pro | $20 base + usage ($2-5K est.) |
| **Email** | Gmail API | Free (within quotas) |
| | | |
| **Total (no CDN)** | | **~$430,000/month** |
| **Total (with CDN)** | | **~$142,000/month** |

### Cost per Photographer per Month

| Scenario | Cost |
|----------|------|
| Without CDN | ~$21.50/photographer/month |
| With CDN | ~$7.10/photographer/month |
| Without AI | ~$4.10/photographer/month |

### Key Cost Levers

1. **CDN is the biggest single savings** — reduces bandwidth from $368K to $80K
2. **AI is opt-in potential** — making analysis opt-in per gallery could cut AI costs 50-80%
3. **S3 storage class** — moving old galleries to S3 Infrequent Access saves 45% on storage
4. **Thumbnail-based analysis** — analyzing 50KB thumbnails instead of 5MB originals cuts Gemini token costs ~60%
5. **Download caching** — caching resized downloads avoids re-processing and reduces compute

---

## 11. Recommendations

### CRITICAL — Fix Before Scaling Past ~200 Users

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | **Add CloudFront CDN** for all S3 assets | 1-2 days | Saves $280K/month at scale, 50-100ms latency improvement globally |
| 2 | **Paginate gallery photo loading** — server-side cursor pagination in `getPublicGallery`, infinite scroll on client | 2-3 days | Prevents multi-MB payloads, enables galleries with 10K+ photos |
| 3 | **Add a job queue** (Inngest, Trigger.dev, or BullMQ) for AI analysis, image processing, email classification | 3-5 days | Prevents timeouts, enables retries, provides visibility |
| 4 | **Rate limiting** on all API endpoints (Vercel's built-in or upstash/ratelimit) | 1-2 days | Prevents abuse, protects AI costs |
| 5 | **Connection pooling** — use Neon pooler URL, configure `connection_limit` | 1 hour | Prevents connection exhaustion under load |
| 6 | **Error monitoring** — add Sentry or equivalent | 1 day | Know when things break before users report |

### HIGH — Address Before 1,000 Users

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 7 | **Use `next/image`** for all gallery images with lazy loading + responsive srcset | 2-3 days | 60-80% bandwidth reduction, better Core Web Vitals |
| 8 | **Increase AI batch size** to 10-15 and reduce delay to 500ms | 1 hour | 5x throughput improvement |
| 9 | **Use thumbnails for AI analysis** instead of full originals | 2-3 hours | 60% reduction in Gemini API costs |
| 10 | **Cache resized downloads** — pre-generate popular resolutions, store as S3 variants | 1-2 days | Eliminates repeated Sharp processing |
| 11 | **Add per-user AI quotas** and make analysis opt-in per gallery | 1-2 days | Cost predictability, prevents runaway spending |
| 12 | **Add compound database indexes** on high-query columns | 2-3 hours | 10-100x query speedup for filtered searches |
| 13 | **Fix gallery password** — use cookies instead of URL query params | 3-4 hours | Security fix |
| 14 | **Add error boundaries** (`error.tsx`) to all route segments | 2-3 hours | Graceful error handling instead of white screens |

### MEDIUM — Before 5,000 Users

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 15 | **Split GalleryView.tsx** into smaller components with dynamic imports | 2-3 days | Smaller JS bundles, better code maintainability |
| 16 | **Add caching layer** — `unstable_cache` or Redis for gallery data, download stats | 2-3 days | 80% reduction in database load for read-heavy paths |
| 17 | **Lazy-load analysis data** — only fetch faceData/searchTags when user opens search | 1 day | Smaller initial payload, faster gallery load |
| 18 | **Archive old DownloadEvents** — move records older than 90 days to cold storage | 1 day | Keeps analytics queries fast |
| 19 | **Configure `next.config.ts`** — image optimization, compression, package optimizations | 2-3 hours | Better defaults for performance |
| 20 | **Add structured logging** with request IDs and context | 1-2 days | Debuggability at scale |
| 21 | **Upgrade NextAuth** to stable v5 when available (or latest beta) | 1-2 hours | Reduces risk of beta-quality auth in production |

### FUTURE — Before 10,000+ Users

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 22 | **Read replicas** — Neon supports read replicas for query distribution | 1-2 days | Horizontal database scaling |
| 23 | **S3 Intelligent-Tiering** — auto-move cold gallery assets to cheaper storage | 1 day | 45% storage savings on inactive galleries |
| 24 | **Dedicated image processing service** — AWS Lambda + SQS for thumbnail/watermark generation | 3-5 days | Decouples compute from web tier |
| 25 | **Pre-compute search indexes** — move from runtime FTS to materialized views or dedicated search (OpenSearch) | 1-2 weeks | Sub-100ms search at any scale |
| 26 | **Multi-region deployment** — CloudFront + regional edge functions | 1-2 weeks | <100ms TTFB globally |
| 27 | **Cost monitoring dashboard** — track AI spend per user, per gallery | 2-3 days | Billing, usage-based pricing decisions |

---

## 12. Architecture Changes Summary

### Current Architecture
```
Client → Vercel Edge → Next.js API/Actions → Neon DB
                                           → S3 (direct URLs)
                                           → Gemini API (in-request)
                                           → Rekognition (in-request)
```

### Target Architecture for Scale
```
Client → CloudFront CDN → S3 (static assets)
       → Vercel Edge → Next.js API/Actions → Neon DB (pooled, with read replicas)
                                           → Redis (caching, rate limiting)
                                           → Job Queue (Inngest/SQS)
                                                → AI Worker → Gemini API
                                                → AI Worker → Rekognition
                                                → Image Worker → Sharp → S3
                                           → Sentry (error tracking)
                                           → Datadog/Axiom (logging + APM)
```

### Key Architectural Shifts

1. **Push image serving to CDN** — no images should be served through API routes
2. **Push heavy compute to job queues** — AI analysis, image processing, email classification
3. **Add a caching layer** — Redis or Vercel KV for hot data (gallery metadata, download stats)
4. **Add observability** — structured logging, error tracking, cost monitoring
5. **Add rate limiting and quotas** — protect both the system and your costs

---

## 13. Quick Wins (< 1 Day Each)

These require minimal code changes but meaningfully improve production readiness:

1. **`next.config.ts`** — Add image remote patterns, compression, and package optimizations
2. **Database connection** — Switch to Neon pooler URL
3. **`BATCH_SIZE = 10`** in `analyze-gallery.ts` — Immediate 3x throughput gain
4. **`loading="lazy"`** on gallery `<img>` tags — Prevents 500 simultaneous image loads
5. **Error boundary** — Add `error.tsx` to `app/gallery/[token]/` directory
6. **Password fix** — Move from URL query param to cookie-based validation
7. **`take: 200`** guard — Add to `getPublicGallery` photo query as a safety limit

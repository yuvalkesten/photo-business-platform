# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Resilience (READ THIS FIRST)

This project runs on an EC2 instance where sessions may terminate unexpectedly. Follow this workflow:

1. **At session start:** Pull latest from main and read `CURRENT_TASK.md` to understand ongoing work
2. **When starting a task:** Update `CURRENT_TASK.md` with task description, steps, and context
3. **After each logical step:** Commit and push to main (file edits, migrations, feature completion)
4. **Before risky operations:** Always commit and push first
5. **Use descriptive commits:** Messages should capture intent so next session understands the work

The `CURRENT_TASK.md` file tracks:
- Current task status (IN_PROGRESS, PAUSED, COMPLETED)
- What's being worked on and current focus
- Completed and remaining steps
- Important context for continuity

## Build and Development Commands

```bash
# Development
npm run dev              # Start development server at http://localhost:3000
npm run build            # Build for production (includes prisma generate)
npm run lint             # Run ESLint

# Testing
npm run test             # Run tests once with Vitest
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Database
npx prisma migrate dev   # Apply migrations (creates migration if schema changed)
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open database GUI at http://localhost:5555
```

## Architecture Overview

This is a photography business management platform built with Next.js 16 (App Router). It provides CRM, project management, booking/scheduling, photo galleries, and email integration.

### Key Directories

- `src/app/` - Next.js App Router pages and API routes
- `src/actions/` - Server Actions for mutations (contacts, projects, sessions, galleries, calendar, email)
- `src/components/ui/` - shadcn/ui components (always use these, never raw HTML elements)
- `src/components/features/` - Feature-specific components organized by domain
- `src/lib/` - Utilities including auth, Google APIs, S3, email, and validations
- `prisma/` - Database schema and migrations

### Tech Stack

- **Framework:** Next.js 16 with App Router
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Auth:** NextAuth.js v5 with Google OAuth
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS
- **Storage:** AWS S3 for photos
- **APIs:** Google Calendar and Gmail for sync/email
- **State:** Zustand (client), TanStack Query (server)
- **Forms:** React Hook Form + Zod validation

### Authentication Split Configuration

Due to Vercel's 1MB edge function limit, auth is split:
- `/src/auth.ts` - Full config with Prisma adapter (API routes, server actions)
- `/src/lib/auth/auth.config.ts` - Edge-compatible config (middleware only)

Always use `requireAuth()` from `/src/lib/auth/utils` in server actions.

### Server Action Pattern

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth/utils"
import { prisma } from "@/lib/db"

export async function actionName(data: unknown) {
  try {
    const user = await requireAuth()
    const validated = schema.parse(data)
    const result = await prisma.model.create({
      data: { ...validated, userId: user.id }
    })
    revalidatePath("/dashboard/path")
    return { success: true, data: result }
  } catch (error) {
    return { error: "Failed to complete action" }
  }
}
```

### Database Conventions

- All queries must filter by `userId` (row-level security pattern)
- Indexes exist on `userId`, `status`, and common query patterns
- Use Decimal type for money fields (totalPrice, deposit, paidAmount)
- Contact uniqueness: `@@unique([userId, email])`

### S3 Upload Flow

1. Client requests presigned URL from `/api/galleries/upload`
2. Server generates signed URL (1-hour expiration)
3. Client uploads directly to S3
4. Client notifies server of completion
5. Server creates Photo record

### Project Status Workflow

`INQUIRY → PROPOSAL_SENT → BOOKED → IN_PROGRESS → POST_PRODUCTION → DELIVERED → COMPLETED`

Booking confirmation emails are auto-sent when status changes to BOOKED.

### Key Enums (from Prisma schema)

- **ContactType:** LEAD, CLIENT, PAST_CLIENT, COLLABORATOR, SUPPLIER, REFERRAL_SOURCE
- **ProjectType:** WEDDING, ENGAGEMENT, PORTRAIT, FAMILY, NEWBORN, CORPORATE, EVENT, COMMERCIAL, REAL_ESTATE, OTHER
- **ProjectStatus:** INQUIRY, PROPOSAL_SENT, BOOKED, IN_PROGRESS, POST_PRODUCTION, DELIVERED, COMPLETED, CANCELLED, ARCHIVED
- **LeadTemperature:** HOT, WARM, COLD

### UI Component Requirements

Always use shadcn/ui components from `/src/components/ui/`. Never use raw HTML elements for standard UI (buttons, inputs, cards, dialogs, etc.).

```tsx
// Correct
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Wrong - never do this
<button className="...">
<div className="card">
```

### Path Alias

Use `@/` to import from `src/`:
```typescript
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
```

### Print Store Architecture

Photographers sell physical prints (via Prodigi fulfillment) from client galleries. Stripe handles payments.

**Checkout flow:**
1. Customer adds items to cart (Zustand store with localStorage persistence)
2. CartDrawer fetches live Prodigi shipping/tax quote on address entry (debounced 800ms)
3. `createCheckout` server action validates prices against PriceSheet, calls Prodigi Quote API for real shipping/tax
4. Creates StoreOrder with accurate pricing: subtotal (retail), shippingCost, taxAmount, totalAmount, prodigiCostTotal, photographerProfit
5. Creates Stripe Checkout Session with product line items + shipping + tax as separate line items
6. Stripe webhook (payment_intent.succeeded) → marks PAID → `submitOrderToProdigi()`
7. Prodigi webhook → status updates (PROCESSING → SHIPPED → COMPLETE), tracking info

**Key directories:**
- `src/lib/prodigi/` — HTTP client, types, products, orders, quotes, webhooks, submit-order
- `src/lib/stripe/` — Lazy proxy init client, checkout sessions, webhook verification
- `src/stores/cart-store.ts` — Zustand cart with localStorage
- `src/actions/store/` — Server actions: create-checkout, get-shipping-quote, store products, orders
- `src/components/features/store/` — CartDrawer, product cards, store UI

**Pricing model:**
- Photographer sets retail prices via PriceSheet with markup over Prodigi base cost
- Shipping/tax are pass-through from Prodigi (charged to customer at cost)
- `photographerProfit` = retail subtotal - Prodigi item cost (excludes shipping/tax)
- Server always validates prices against PriceSheet (never trusts client)

**Public store actions don't require auth** (like other public gallery actions).

## Environment Variables Required

- `DATABASE_URL` - Neon PostgreSQL connection string
- `NEXTAUTH_URL` - App URL
- `NEXTAUTH_SECRET` - Session encryption secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` - S3
- `AWS_REKOGNITION_COLLECTION_PREFIX` - Rekognition face collection prefix (optional)
- `GEMINI_API_KEY` - Gemini AI (email classification + photo analysis)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` - Stripe payments
- `PRODIGI_API_KEY` / `PRODIGI_SANDBOX_API_KEY` / `PRODIGI_WEBHOOK_SECRET` - Prodigi fulfillment

### AI Photo Search Architecture

Gallery photos are analyzed by Gemini Vision and indexed for search. The system lives in `src/lib/ai/`.

**Indexing pipeline:**
1. `analyze-gallery.ts` orchestrates batch processing (5 concurrent, 1s delay between batches)
2. `analyze-photo.ts` fetches thumbnail from S3, sends to Gemini Vision via `gemini-vision.ts`
3. Gemini returns structured JSON (description, people, activities, objects, scene, mood, tags)
4. Results stored in `PhotoAnalysis` model with flattened `searchTags` for fast queries
5. `person-clustering.ts` groups faces by role then LLM appearance matching → `PersonCluster` model

**Search (two-stage RAG):**
1. Postgres full-text search on descriptions + array overlap on `searchTags` → up to 50 candidates
2. Gemini Flash ranks candidates by relevance to query → sorted results with scores

**Triggers:**
- Auto: fires after upload completion if >2 photos (throttled to 1hr per gallery)
- Manual: POST `/api/galleries/[id]/analyze` from admin dashboard

**Key models:** `PhotoAnalysis` (1:1 with Photo), `PersonCluster` (groups same person), Gallery fields (`aiSearchEnabled`, `analysisProgress`, `lastAnalysisTriggeredAt`)

**Public gallery search actions don't require auth** (like other public gallery actions).

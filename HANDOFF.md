# Session Handoff - Photo Business Platform

## Current Status
✅ **App is fully deployed and working!**
- Google OAuth login is functional
- Database connection is working
- All environment variables are properly configured
- **Gallery photos are populated with demo images**
- **S3 bucket configured for public read access**

## Live URLs
- **Production:** https://photo-business-platform.vercel.app
- **GitHub:** https://github.com/yuvalkesten/photo-business-platform

## What Was Done

### Initial Setup (Previous Sessions)
1. Set up GitHub repo and deployed to Vercel
2. Fixed multiple TypeScript build errors (Suspense boundaries, serialized types, etc.)
3. Fixed middleware edge function size issue (split auth config into edge-compatible version)
4. Fixed GOOGLE_CLIENT_ID newline issue in Vercel env var
5. Re-added clean env vars: DATABASE_URL, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET
6. Redeployed to apply environment variable changes - **this fixed the Configuration error**

### Gallery Photos Session (Jan 10, 2026)
7. Added demo photos to all 3 mock galleries:
   - **Nakamura Family Portraits**: 3 family photos
   - **Baby Garcia - Newborn Session**: 3 newborn photos
   - **Amanda & Josh - Engagement**: 3 engagement photos
8. Created `prisma/seed-photos.ts` script to populate galleries with Unsplash photos
9. Created `scripts/fix-s3-permissions.ts` to configure S3 bucket policy for public access
10. Fixed S3 bucket permissions - added public read policy for `galleries/*` path
11. Fixed gallery share URL to use production domain (`NEXTAUTH_URL`) instead of localhost
12. Added `@google/genai` and `tsx` dependencies (for future AI image generation)

### Calendar Feature (Jan 10, 2026)
13. Added Google Calendar-synced calendar view at `/dashboard/calendar`
14. Installed FullCalendar packages for Month/Week/Day views
15. Created `CalendarView` component with shadcn/ui styling
16. Created `QuickAddSessionSheet` for quick session creation from calendar
17. Added `listCalendarEvents` function to fetch events from Google Calendar API
18. Created server actions: `getCalendarEvents`, `getProjectsForCalendar`
19. Updated dashboard navigation to include Calendar link

**Calendar Features:**
- Month, Week, and Day views
- Click on any date/time to quick-add a new session
- Events display with project names and contact info
- Status-based color coding (scheduled, completed, rescheduled, cancelled)
- Synced with Google Calendar in real-time

## Technical Architecture
- **Auth:** NextAuth v5 with Google OAuth + Credentials provider
- **Database:** Neon PostgreSQL with Prisma ORM
- **Storage:** AWS S3 for photos
- **Deployment:** Vercel with edge-compatible middleware

The auth was split into two configs because Prisma is too large for edge functions (Vercel's 1MB limit):
- `/src/auth.ts` - Full auth config with Prisma adapter (used in API routes)
- `/src/lib/auth/auth.config.ts` - Edge-compatible config (used in middleware)

## Environment Variables in Vercel (Production)
- DATABASE_URL
- NEXTAUTH_URL = https://photo-business-platform.vercel.app
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME

## Google Cloud Console Settings
OAuth redirect URI:
```
https://photo-business-platform.vercel.app/api/auth/callback/google
```

## Key Files Reference
- Prisma schema: `/prisma/schema.prisma`
- Auth config: `/src/auth.ts` and `/src/lib/auth/auth.config.ts`
- API route: `/src/app/api/auth/[...nextauth]/route.ts`
- Middleware: `/src/middleware.ts`
- Calendar view: `/src/app/dashboard/calendar/page.tsx`
- Calendar component: `/src/components/features/calendar/CalendarView.tsx`
- Google Calendar lib: `/src/lib/google/calendar.ts`

## Useful Commands
```bash
# Deploy to Vercel
PATH="/opt/homebrew/opt/node@20/bin:$PATH" vercel --prod --yes

# Check Vercel logs
PATH="/opt/homebrew/opt/node@20/bin:$PATH" npx vercel logs photo-business-platform.vercel.app

# Test database connection
PATH="/opt/homebrew/opt/node@20/bin:$PATH" npx prisma db pull
```

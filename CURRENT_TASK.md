# Current Task

## Status: COMPLETED

## Recent Completions

### AI-Powered Photo Search (Feb 11, 2026)
Full AI search system for client galleries using Gemini Vision:

1. **Photo Indexing Pipeline** - Gemini Vision analyzes each photo's thumbnail, returns structured JSON with description, people/faces, activities, objects, scene, mood, composition, and 10-30 searchable tags. Stored in `PhotoAnalysis` model.
2. **Natural Language Search (RAG)** - Two-stage: Postgres full-text search + tag matching retrieves candidates, then Gemini Flash ranks by relevance. Simple queries use instant client-side tag filtering.
3. **Face Search (Find Person)** - Person clustering groups same person across gallery photos by role + LLM appearance matching. Click "Find Person" in lightbox to find all photos of someone.
4. **Search UI** - Search bar in public gallery (when `aiSearchEnabled`), debounced input, instant/AI modes, result count badge.
5. **Admin Controls** - AI Analysis card on gallery admin page: progress bar, analyze/re-analyze buttons, enable/disable toggle for viewers.
6. **Auto-trigger** - Analysis fires automatically after upload (>2 photos), throttled to once per hour per gallery.

DB migrations: `add_photo_ai_analysis`, `add_fts_index` (GIN index for full-text search)

Key files:
- `src/lib/ai/` - All AI logic (types, gemini-vision client, prompt, analyze-photo, analyze-gallery, photo-search, person-clustering)
- `src/app/api/galleries/[id]/analyze/route.ts` - Manual trigger + status API
- `src/app/api/galleries/[id]/find-person/route.ts` - Face search API
- `src/actions/galleries/search-photos.ts` - Public search server action
- `src/app/gallery/[token]/GallerySearch.tsx` - Search UI component
- `src/components/features/galleries/AIAnalysisCard.tsx` - Admin card

### Gallery Feature Expansion (Feb 10, 2026)
Six major gallery features: Photo Upload, Photo Management, Social Sharing, Client Email Gate, Watermark Application, Favorites/Proofing.

### Earlier Features
- Invoice generation with PDF and email (Jan 2026)
- Instagram DM integration with AI classification (Jan 2026)
- Email detail view with AI analysis (Jan 2026)
- Real-time updates via React Query polling (Jan 2026)

## What's Working
- Full gallery workflow: upload → AI analysis → public gallery with search
- Instagram OAuth + webhook DM processing
- Email classification and detail view
- All dashboards with real-time updates

## Environment Setup

### Required Environment Variables
```
# Database
DATABASE_URL="neon-connection-string"

# Auth
NEXTAUTH_URL="https://your-app-url"
NEXTAUTH_SECRET="your-secret"
GOOGLE_CLIENT_ID="your-id"
GOOGLE_CLIENT_SECRET="your-secret"

# AWS S3
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_S3_BUCKET_NAME="your-bucket"

# AI (Gemini - used for email classification AND photo analysis)
GEMINI_API_KEY="your-key"

# Meta/Instagram
META_APP_ID="816961488060840"
META_APP_SECRET="your-secret"
INSTAGRAM_WEBHOOK_VERIFY_TOKEN="your-token"
```

### S3 Bucket CORS
The S3 bucket needs CORS configured for browser uploads:
```json
[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","HEAD"],"AllowedOrigins":["https://your-vercel-domain","http://localhost:3000"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
```

### Vercel Deployment
- Build command includes `prisma generate` (via `npm run build`)
- Migrations must be applied to production DB separately or via build hook
- Watch for trailing newlines in env vars (common paste issue)

## Last Updated
2026-02-11

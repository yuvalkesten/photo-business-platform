# Session Handoff - Photo Business Platform

Quick reference for current project state.

---

## Current Status

**App is fully deployed and working!**

All core features are implemented and functional.

---

## Live URLs

- **Production:** https://photo-business-platform.vercel.app
- **Local Dev:** http://localhost:3000
- **GitHub:** https://github.com/yuvalkesten/photo-business-platform

---

## Implemented Features

### Authentication
- Google OAuth with Calendar and Gmail permissions
- Email/password fallback (Credentials provider)
- JWT sessions with route protection

### Contact Management (CRM)
- Contact CRUD with status workflow
- Search and filtering
- Status: Lead → Active → Past → Archived

### Project Management
- Project CRUD linked to contacts
- Project types: Wedding, Portrait, Event, etc.
- Status: Inquiry → Booked → Completed
- Pricing and deposit tracking

### Sessions & Calendar
- Session management with Google Calendar sync
- Calendar view (Month/Week/Day) using FullCalendar
- Quick-add sessions by clicking dates
- Two-way sync with Google Calendar

### Photo Galleries
- S3 direct upload with presigned URLs
- Public sharing with unique tokens
- Password protection option
- Expiration dates
- Lightbox viewer with keyboard navigation
- Individual and bulk download

### Email Integration
- Booking confirmation emails (auto on project booking)
- Gallery ready notifications (manual send)
- Professional HTML templates
- Uses Gmail API with OAuth tokens

---

## Key Files Reference

### Configuration
| File | Purpose |
|------|---------|
| `/src/auth.ts` | Full NextAuth config with Prisma adapter |
| `/src/lib/auth/auth.config.ts` | Edge-compatible auth config for middleware |
| `/src/middleware.ts` | Route protection |
| `/prisma/schema.prisma` | Database schema |

### Google Integration
| File | Purpose |
|------|---------|
| `/src/lib/google/calendar.ts` | Google Calendar API functions |
| `/src/lib/google/gmail.ts` | Gmail API functions |

### Server Actions
| Directory | Purpose |
|-----------|---------|
| `/src/actions/contacts/` | Contact CRUD |
| `/src/actions/projects/` | Project CRUD |
| `/src/actions/sessions/` | Session CRUD |
| `/src/actions/galleries/` | Gallery CRUD |
| `/src/actions/calendar/` | Calendar queries |

### Pages
| Route | Purpose |
|-------|---------|
| `/dashboard` | Dashboard home |
| `/dashboard/contacts` | Contact management |
| `/dashboard/projects` | Project management |
| `/dashboard/calendar` | Calendar view |
| `/dashboard/galleries` | Gallery management |
| `/gallery/[token]` | Public gallery view |

---

## Environment Variables

### Required in `.env.local` and Vercel:

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME
NEXT_PUBLIC_APP_URL
```

---

## Google Cloud Console

**OAuth Redirect URIs:**
- Dev: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://photo-business-platform.vercel.app/api/auth/callback/google`

**Required Scopes:**
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/gmail.send`

---

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npx prisma studio              # Database GUI

# Database
npx prisma migrate dev --name <name>   # New migration
npx prisma generate            # Generate client

# Deployment
vercel --prod                  # Deploy to production
```

---

## Technical Notes

### Auth Split Configuration
Auth is split into two configs due to Vercel's 1MB edge function limit:
- `/src/auth.ts` - Full config with Prisma (API routes, server actions)
- `/src/lib/auth/auth.config.ts` - Edge-compatible (middleware only)

### S3 Bucket Policy
Bucket has public read access for `galleries/*` path to allow public gallery viewing.

### Database
Using Neon PostgreSQL with pooled connection. Connection string must:
- Include `-pooler` in hostname
- Include `.c-2.` in hostname
- Remove `channel_binding=require` parameter

---

## Future Enhancements

- Contracts with e-signing
- Payment processing (Stripe)
- Invoice generation
- AI photo culling
- PWA support

---

**Status:** Production ready
**Last Updated:** January 10, 2026

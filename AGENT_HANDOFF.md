# Agent Handoff Document

This document provides context for continuing development on the photo-business-platform project.

## Quick Start

1. Read `README.md` for project overview
2. Read `ARCHITECTURE.md` for system design
3. Read `PROJECT_STATUS.md` for current state
4. Read `SETUP.md` for local development

## Current State Summary

### Email Classification System - COMPLETE & WORKING

The email classification system is fully functional:

- **Gmail Webhook**: `/api/webhooks/gmail` receives push notifications from Gmail
- **Gemini AI Classifier**: Categorizes emails as INQUIRY, INVOICE, RECEIPT, URGENT, or OTHER
- **Entity Creation**: Auto-creates Contacts and Projects from inquiry emails
- **Dashboard**: `/dashboard/emails` shows classified emails with filters and stats

**Verification**: The webhook is receiving and processing emails. Test by sending an email to the connected Gmail account.

### Instagram DM Integration - FOUNDATION COMPLETE

Phase 1 (infrastructure) is done. Phase 2 requires user action.

**What's built:**
- Prisma models: `InstagramAccount`, `ProcessedMessage`, `MessagePlatform` enum
- Webhook endpoint: `/api/webhooks/instagram` with GET verification and POST handler
- Type definitions: `src/lib/instagram/types.ts`

**What's needed from user:**
1. Verify Instagram account is Business/Creator type
2. Link Instagram to a Facebook Page
3. Configure webhook in Meta Developer Dashboard (App ID: `816961488060840`)
4. Submit for App Review for `instagram_manage_messages` permission

**Environment variables set:**
```
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=a8aa3c43c6b25422b67f26aa53a8c6b93ed9b83170cc94af0e67107244e2fc13
META_APP_ID=816961488060840
META_APP_SECRET= (needs to be added from Meta Developer Dashboard)
```

**Webhook URL for Meta Dashboard:**
```
https://photo-business-platform.vercel.app/api/webhooks/instagram
```

**Next steps for Instagram:**
1. Create OAuth flow (`src/app/api/auth/instagram/route.ts`)
2. Create message processing pipeline (`src/lib/instagram/processing.ts`)
3. Update dashboard to show both emails and Instagram DMs

## Documentation References

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `ARCHITECTURE.md` | System architecture and data flow |
| `PROJECT_STATUS.md` | Feature completion status |
| `SETUP.md` | Local development setup instructions |
| `HANDOFF.md` | Previous handoff notes |
| `SESSION_LOG.md` | Development session history |
| `docs/EMAIL_CLASSIFICATION_SETUP.md` | Email system setup guide |
| `docs/REMOTE_DEV_GUIDE.md` | Remote development instructions |

## Key Files

### Email Classification
- `src/app/api/webhooks/gmail/route.ts` - Gmail webhook endpoint
- `src/lib/email/classifier/` - Gemini AI classification
- `src/lib/email/processing/` - Email processing pipeline
- `src/actions/email/` - Server actions for email features

### Instagram (in progress)
- `src/app/api/webhooks/instagram/route.ts` - Instagram webhook
- `src/lib/instagram/types.ts` - Instagram API types
- `prisma/schema.prisma` - Database models (InstagramAccount, ProcessedMessage)

## Environment Variables

Required variables in `.env.local`:

```
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AWS S3
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=photo-business-uploads-yuval

# Gemini AI
GEMINI_API_KEY=...

# Google Cloud (Gmail push)
GOOGLE_CLOUD_PROJECT_ID=photo-business-platform

# Meta/Instagram
META_APP_ID=816961488060840
META_APP_SECRET= # Get from Meta Developer Dashboard
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=a8aa3c43c6b25422b67f26aa53a8c6b93ed9b83170cc94af0e67107244e2fc13
```

## Plan File

There's a detailed implementation plan at:
```
~/.claude/plans/snuggly-spinning-tide.md
```

This contains the full Instagram DM integration plan with phases, code snippets, and file structure.

## Common Commands

```bash
# Start development server
pnpm dev

# Run database migrations
pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate

# View production logs
vercel logs photo-business-platform.vercel.app --follow

# Deploy to Vercel
vercel --prod
```

## Notes

- The Neon PostgreSQL database may pause after inactivity. It auto-wakes on first request.
- Vercel deployments auto-trigger on GitHub push to main.
- Email classification is working - check logs with `vercel logs` to verify.

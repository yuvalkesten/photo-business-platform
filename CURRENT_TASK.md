# Current Task

## Status: IN_PROGRESS

## Task Description
Instagram DM Integration - Testing OAuth Flow Locally

## Current Focus
Test the Instagram OAuth connection flow on local machine

## Context for Local Development
The Instagram integration code is complete and builds successfully. The remaining work is testing the OAuth flow with Facebook/Meta.

### What's Been Done
- Instagram messages dashboard at `/dashboard/messages`
- OAuth flow for connecting Instagram Business accounts (`/api/auth/instagram`)
- DM message processing pipeline with AI classification
- Auto-creation of contacts/projects from DM inquiries
- All TypeScript errors fixed, build passes

### What Needs Testing
1. Instagram OAuth flow - connecting an Instagram Business account
2. Webhook verification with Facebook
3. End-to-end DM processing

### Facebook/Meta App Configuration Required
The Meta app (ID: 816961488060840) needs these URLs configured:

**For localhost testing:**
1. **App Domains** (Settings → Basic): `localhost`
2. **Valid OAuth Redirect URIs** (Facebook Login → Settings):
   - `http://localhost:3000/api/auth/instagram/callback`
3. **Webhook URL** (Webhooks): Cannot use localhost directly - need ngrok or similar for HTTPS

**Webhook Verify Token:**
```
a8aa3c43c6b25422b67f26aa53a8c6b93ed9b83170cc94af0e67107244e2fc13
```

### Google OAuth Configuration
Add to Google Cloud Console (APIs & Services → Credentials → OAuth Client):
- `http://localhost:3000/api/auth/callback/google`

### Environment Variables (.env.local)
Ensure these are set correctly:
- `NEXTAUTH_URL="http://localhost:3000"`
- `META_APP_ID="816961488060840"` (no trailing newline!)
- `META_APP_SECRET` - your Facebook app secret
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` - for webhook verification

### Known Issues
1. Facebook OAuth requires the ngrok domain to be added to "App Domains" - may need ngrok for testing
2. Webhooks require HTTPS - need ngrok or deploy to Vercel for webhook testing

### Commands
```bash
# Start dev server (use increased memory for builds)
NODE_OPTIONS="--max-old-space-size=2560" npm run dev

# Build
NODE_OPTIONS="--max-old-space-size=2560" npm run build

# If using ngrok for HTTPS testing
ngrok http 3000
# Then update NEXTAUTH_URL in .env.local to the ngrok URL
```

## Completed Steps
- [x] Added Instagram messages dashboard and components
- [x] Fixed TypeScript errors in Instagram integration
- [x] Set up EC2 with swap (2GB) and memory limits
- [x] Tested remote access via ngrok
- [x] Identified Facebook app domain configuration requirements

## Next Steps
- [ ] Configure Facebook app domains for localhost (or ngrok)
- [ ] Test Instagram OAuth flow
- [ ] Verify webhook setup
- [ ] Test end-to-end DM classification

## Files to Review
- `src/app/dashboard/messages/page.tsx` - Messages dashboard
- `src/app/api/auth/instagram/route.ts` - OAuth initiation
- `src/app/api/auth/instagram/callback/route.ts` - OAuth callback
- `src/app/api/webhooks/instagram/route.ts` - Webhook handler
- `src/lib/instagram/` - Instagram client and utilities

## Last Updated
2026-01-17

# Email Classification System Setup

This guide explains how to set up the Gmail email classification system with Google Cloud Pub/Sub.

## Overview

The email classification system:
1. Listens for new emails via Gmail Push Notifications (Pub/Sub)
2. Classifies emails using Gemini AI (inquiry, urgent, invoice, receipt)
3. Automatically creates CRM entities (Contacts, Projects, Financial Documents)

## Prerequisites

- Google Cloud Project with billing enabled
- Vercel Pro account (recommended for 60s function timeout)
- Existing Google OAuth configured in the app

## Step 1: Google Cloud Project Setup

### 1.1 Enable Required APIs

```bash
# Enable Pub/Sub API
gcloud services enable pubsub.googleapis.com

# Enable Gmail API (should already be enabled for OAuth)
gcloud services enable gmail.googleapis.com
```

### 1.2 Create Pub/Sub Topic

```bash
# Create the topic for Gmail notifications
gcloud pubsub topics create gmail-push
```

### 1.3 Grant Gmail Permission to Publish

Gmail needs permission to publish messages to your Pub/Sub topic:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-push \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

### 1.4 Create Push Subscription

Create a subscription that pushes to your Vercel webhook:

```bash
# Generate a secure verification token
VERIFICATION_TOKEN=$(openssl rand -hex 32)
echo "Save this token: $VERIFICATION_TOKEN"

# Create the push subscription
gcloud pubsub subscriptions create gmail-push-subscription \
  --topic=gmail-push \
  --push-endpoint="https://YOUR_VERCEL_DOMAIN/api/webhooks/gmail?token=$VERIFICATION_TOKEN" \
  --ack-deadline=60
```

Replace `YOUR_VERCEL_DOMAIN` with your actual Vercel domain (e.g., `photo-business-platform.vercel.app`).

## Step 2: Environment Variables

Add these environment variables to your Vercel project:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | Your GCP project ID | `my-photo-business` |
| `PUBSUB_VERIFICATION_TOKEN` | Token from Step 1.4 | `a1b2c3d4...` |
| `GEMINI_API_KEY` | Google AI API key | `AIza...` |
| `CRON_SECRET` | Secret for cron job auth | `random-secret-string` |

### Add to Vercel

```bash
# Using Vercel CLI
vercel env add GOOGLE_CLOUD_PROJECT_ID
vercel env add PUBSUB_VERIFICATION_TOKEN
vercel env add CRON_SECRET
```

Or add via Vercel Dashboard: Settings → Environment Variables

### Local Development (.env.local)

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
PUBSUB_VERIFICATION_TOKEN=your-verification-token

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Cron (optional for local)
CRON_SECRET=local-dev-secret
```

## Step 3: Deploy and Verify

### 3.1 Deploy to Vercel

```bash
vercel --prod
```

### 3.2 Verify Webhook Endpoint

Test that the webhook is accessible:

```bash
curl "https://YOUR_VERCEL_DOMAIN/api/webhooks/gmail?token=YOUR_TOKEN"
```

Expected response:
```json
{"status":"verified","message":"Gmail webhook endpoint is active"}
```

### 3.3 Verify Cron Job

The cron job runs daily at 2:00 AM UTC. You can trigger it manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://YOUR_VERCEL_DOMAIN/api/cron/renew-gmail-watches"
```

## Step 4: Enable Email Classification for Users

Users need to:

1. **Re-authenticate with Google** (to grant new Gmail permissions)
   - Sign out and sign back in
   - Accept the new permission scopes (gmail.readonly, gmail.modify)

2. **Enable email classification** in their dashboard
   - Call the `setupEmailWatch` server action
   - This creates a Gmail watch subscription

### Example: Enable via Dashboard

```tsx
import { setupEmailWatch } from "@/actions/email";

async function handleEnableEmailClassification() {
  const result = await setupEmailWatch();

  if (result.success) {
    console.log("Email classification enabled!");
    console.log("Watch expires:", result.watch.expiration);
  } else {
    console.error("Failed:", result.error);
  }
}
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Gmail Inbox   │────▶│  Google Pub/Sub  │────▶│ Vercel Webhook  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Create Entity  │◀────│  Classify Email  │◀────│   Fetch Email   │
│ (Contact/Project│     │   (Gemini AI)    │     │   (Gmail API)   │
│ /Financial Doc) │     └──────────────────┘     └─────────────────┘
└─────────────────┘
```

## Troubleshooting

### "Invalid token" error on webhook

- Verify `PUBSUB_VERIFICATION_TOKEN` matches the token in the Pub/Sub subscription URL
- Check that the token is passed as `?token=...` in the subscription endpoint

### "Watch setup failed" error

- Ensure Pub/Sub topic exists and has correct permissions
- Verify `GOOGLE_CLOUD_PROJECT_ID` is correct
- Check that the user has granted Gmail permissions

### Emails not being classified

1. Check if watch is active: `getEmailWatchStatus()` action
2. Check Vercel function logs for errors
3. Verify Pub/Sub subscription is active in GCP Console

### Token refresh errors

- User needs to re-authenticate (sign out and sign in)
- Check that OAuth consent screen has correct scopes

## Gmail Watch Lifecycle

1. **Creation**: Watch is created when user enables email classification
2. **Duration**: Watches expire after 7 days (Gmail limit)
3. **Renewal**: Cron job renews watches expiring within 24 hours
4. **Manual Renewal**: Users can re-enable in dashboard if expired

## Cost Considerations

| Service | Cost |
|---------|------|
| Pub/Sub | ~$0.40 per million messages |
| Gemini 1.5 Flash | ~$0.075 per 1M input tokens |
| Vercel | Based on function invocations |

For a typical user receiving 100 emails/day:
- ~3,000 Pub/Sub messages/month: < $0.01
- ~3,000 Gemini classifications/month: ~$0.10

## Security Notes

1. **Verification Token**: Always use a strong, random token
2. **Cron Secret**: Protects cron endpoint from unauthorized access
3. **User Isolation**: Each user's emails are processed separately
4. **No Email Storage**: Email bodies are not stored, only metadata and classification

## Files Reference

| File | Purpose |
|------|---------|
| `/api/webhooks/gmail/route.ts` | Pub/Sub webhook endpoint |
| `/api/cron/renew-gmail-watches/route.ts` | Daily watch renewal |
| `/lib/email/gmail/` | Gmail API integration |
| `/lib/email/classifier/` | Gemini AI classification |
| `/lib/email/processing/` | Email processing pipeline |
| `/actions/email/` | Server actions for UI |
| `vercel.json` | Cron job configuration |

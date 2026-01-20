# Current Task

## Status: COMPLETED

## Recent Completions

### Invoice Generation (Jan 20, 2026)
- Invoice model with line items stored as JSON
- Create invoices from projects with custom line items
- Professional invoice preview and email template
- Send invoices via Gmail API
- PDF generation with React-PDF
- Invoice status tracking (Draft, Sent, Paid, Overdue)
- Invoice list with statistics dashboard
- Create Invoice button on project detail page
- Invoices navigation in sidebar

### Instagram DM Integration (Jan 20, 2026)
- Instagram Business account OAuth via Facebook Login for Business
- Real-time webhook processing for incoming DMs
- AI classification of DMs using Gemini
- Auto-creation of contacts/projects from inquiries
- Messages dashboard with filtering and stats
- Real-time polling (10-second refresh)

### Email Detail View (Jan 20, 2026)
- Clickable email rows open side drawer
- Full email content displayed from Gmail API
- AI analysis details (confidence, summary, suggested action)
- Manual re-classification support
- Linked entities display (contacts, projects, financial docs)

### Real-time Updates (Jan 20, 2026)
- React Query polling for both emails and Instagram messages
- 10-second auto-refresh when tab is active
- Visual indicator during background refresh

## What's Working
- Instagram OAuth flow with Facebook Login for Business
- Instagram webhooks receiving and processing DMs
- Email classification and detail view
- All dashboards with real-time updates

## Environment Setup

### Required Environment Variables
```
# Meta/Instagram
META_APP_ID="816961488060840"
META_APP_SECRET="your-secret"
INSTAGRAM_WEBHOOK_VERIFY_TOKEN="your-token"

# AI Classification
GEMINI_API_KEY="your-key"

# Standard NextAuth + Database + AWS vars...
```

### Meta Developer Console
- App ID: 816961488060840
- Facebook Login for Business configured
- Webhooks subscribed to `messages` field
- App must be in "published" state for webhooks to work

### Local Development with ngrok
```bash
# Start ngrok
ngrok http 3000

# Update .env.local
NEXTAUTH_URL="https://your-ngrok-url.ngrok-free.dev"

# Add ngrok domain to Meta app settings
```

## Key Files
- `src/app/dashboard/invoices/page.tsx` - Invoice list dashboard
- `src/app/dashboard/invoices/new/page.tsx` - Create new invoice
- `src/app/dashboard/invoices/[id]/page.tsx` - View invoice
- `src/components/features/invoices/` - Invoice components
- `src/actions/invoices/` - Invoice CRUD actions
- `src/lib/invoices/InvoicePDF.tsx` - PDF template
- `src/lib/email/templates/invoice.ts` - Email template
- `src/app/api/invoices/[id]/pdf/route.ts` - PDF generation API
- `src/app/dashboard/messages/page.tsx` - Instagram messages dashboard
- `src/app/dashboard/emails/page.tsx` - Email dashboard
- `src/components/features/emails/EmailDetailSheet.tsx` - Email detail drawer
- `src/components/features/instagram/InstagramMessagesClient.tsx` - Real-time messages
- `src/app/api/webhooks/instagram/route.ts` - Instagram webhook handler
- `src/lib/email/classifier/` - AI classification logic

## Last Updated
2026-01-20

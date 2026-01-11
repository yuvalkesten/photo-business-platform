# Photo Business Platform

A mobile-first, all-in-one photography business management platform built with Next.js 16, featuring CRM, project management, booking/scheduling with Google Calendar sync, photo galleries with S3 storage, and Gmail-integrated client communication.

## Features

### CRM & Project Management
- **Contact Management** - Track clients with status (Lead, Active, Past, Archived)
- **Project Tracking** - Manage photography projects from inquiry to completion
- **Status Workflow** - INQUIRY → BOOKED → COMPLETED flow with automatic email notifications

### Booking & Calendar
- **Google Calendar Sync** - Two-way sync with Google Calendar
- **Calendar View** - Month, Week, and Day views using FullCalendar
- **Quick Add Sessions** - Click on any date/time to create sessions
- **Session Management** - Track photo sessions with location, pricing, and notes

### Photo Galleries
- **S3 Storage** - Direct upload to AWS S3 with presigned URLs
- **Public Sharing** - Shareable gallery links with unique tokens
- **Password Protection** - Optional password protection for galleries
- **Expiration Dates** - Set gallery access expiration
- **Lightbox Viewer** - Full-screen photo viewing with navigation
- **Download Options** - Allow or disable client downloads

### Gmail Integration
- **Booking Confirmations** - Automatic emails when projects are booked
- **Gallery Notifications** - Send gallery-ready emails to clients
- **Professional Templates** - HTML email templates with plain text fallback

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3 + shadcn/ui
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Authentication:** NextAuth.js v5 with Google OAuth
- **Storage:** AWS S3
- **Calendar:** Google Calendar API
- **Email:** Gmail API
- **Deployment:** Vercel

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yuvalkesten/photo-business-platform.git
cd photo-business-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

See [SETUP.md](./SETUP.md) for detailed setup instructions.

Required environment variables:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `NEXTAUTH_URL` - App URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` - Random secret for session encryption
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `AWS_REGION` - AWS region (us-east-2)
- `AWS_ACCESS_KEY_ID` - AWS IAM access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Protected dashboard routes
│   │   ├── calendar/      # Calendar view
│   │   ├── contacts/      # Contact management
│   │   ├── projects/      # Project management
│   │   └── galleries/     # Gallery management
│   ├── gallery/[token]/   # Public gallery view
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── features/         # Feature-specific components
├── actions/              # Server actions
├── lib/                  # Utilities and configs
│   ├── google/           # Google Calendar & Gmail
│   ├── s3/               # AWS S3 utilities
│   └── auth/             # Auth configuration
└── types/                # TypeScript types
```

## Documentation

- [SETUP.md](./SETUP.md) - Complete setup instructions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture details
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current progress and roadmap
- [SESSION_LOG.md](./SESSION_LOG.md) - Development session logs
- [HANDOFF.md](./HANDOFF.md) - Quick reference for current state

## Deployment

The app is deployed on Vercel with automatic deployments from the main branch.

**Production URL:** https://photo-business-platform.vercel.app

See [SETUP.md](./SETUP.md#8-production-deployment-vercel) for deployment instructions.

## License

Private project - All rights reserved.

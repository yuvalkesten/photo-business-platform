# Architecture Documentation

Technical architecture and design decisions for the Photo Business Platform.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Mobile     │  │   Tablet     │  │   Desktop    │      │
│  │  (Primary)   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS (Vercel CDN)
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Application Server                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ App Router (React Server Components)                 │   │
│  │  ├── Pages (Server Components)                       │   │
│  │  ├── API Routes (Route Handlers)                     │   │
│  │  └── Server Actions                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware Layer                                      │   │
│  │  ├── Authentication (NextAuth.js)                    │   │
│  │  ├── Route Protection                                │   │
│  │  └── Security Headers                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                │                │
         │                │                │
    ┌────▼───┐      ┌────▼────┐     ┌────▼────┐
    │Neon DB │      │ AWS S3  │     │ Google  │
    │Postgres│      │ Storage │     │   APIs  │
    └────────┘      └─────────┘     └─────────┘
```

---

## Technology Stack

### Frontend

**Framework:** Next.js 16 (App Router)
- Server Components for static/dynamic rendering
- Client Components for interactivity
- Server Actions for mutations
- Streaming and Suspense for loading states

**UI Library:** shadcn/ui (Radix UI primitives)
- Accessible, customizable components
- Tailwind CSS styling
- No runtime overhead

**State Management:**
- Server state via React Query (TanStack Query)
- Client state via React hooks (useState, useContext)
- Form state via React Hook Form

### Backend

**Runtime:** Next.js API Routes & Server Actions
- Server Actions for form mutations
- API Routes for webhooks and file uploads

**Database:** PostgreSQL (Neon) + Prisma ORM
- Serverless PostgreSQL with connection pooling
- Type-safe database queries
- Auto-generated migrations

**Authentication:** NextAuth.js v5
- Google OAuth (primary)
- Credentials provider (email/password fallback)
- JWT session strategy

### External Services

**AWS S3:** Photo storage
- Direct upload via presigned URLs
- Public read access for gallery photos
- Organized by `galleries/{galleryId}/{filename}`

**Google Calendar API:** Schedule sync
- Two-way sync for sessions
- Create/update/delete events
- Uses OAuth refresh tokens

**Gmail API:** Client communication
- Booking confirmation emails
- Gallery notification emails
- Uses OAuth access tokens

---

## Database Schema

### Core Models

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  businessName  String?
  businessEmail String?
  businessPhone String?
  accounts      Account[]
  contacts      Contact[]
  projects      Project[]
  galleries     Gallery[]
}

model Contact {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String?
  phone     String?
  status    ContactStatus @default(LEAD)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  projects  Project[]
}

model Project {
  id          String        @id @default(cuid())
  name        String
  projectType ProjectType
  status      ProjectStatus @default(INQUIRY)
  totalPrice  Float?
  deposit     Float?
  contactId   String
  contact     Contact       @relation(fields: [contactId], references: [id])
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  sessions    PhotoSession[]
  galleries   Gallery[]
}

model PhotoSession {
  id            String         @id @default(cuid())
  title         String
  startTime     DateTime
  endTime       DateTime
  location      String?
  status        SessionStatus  @default(SCHEDULED)
  googleEventId String?
  projectId     String
  project       Project        @relation(fields: [projectId], references: [id])
}

model Gallery {
  id            String    @id @default(cuid())
  title         String
  shareToken    String    @unique @default(cuid())
  password      String?   // Hashed password for protection
  allowDownload Boolean   @default(true)
  expiresAt     DateTime?
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id])
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  photos        Photo[]
}

model Photo {
  id           String  @id @default(cuid())
  filename     String
  s3Url        String
  thumbnailUrl String?
  width        Int?
  height       Int?
  galleryId    String
  gallery      Gallery @relation(fields: [galleryId], references: [id])
}
```

### Enums

```prisma
enum ContactStatus {
  LEAD
  ACTIVE
  PAST
  ARCHIVED
}

enum ProjectStatus {
  INQUIRY
  BOOKED
  COMPLETED
  CANCELLED
}

enum ProjectType {
  WEDDING
  PORTRAIT
  EVENT
  COMMERCIAL
  FAMILY
  NEWBORN
  ENGAGEMENT
  OTHER
}

enum SessionStatus {
  SCHEDULED
  COMPLETED
  RESCHEDULED
  CANCELLED
}
```

---

## Application Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   └── galleries/upload/    # Photo upload API
│   ├── auth/
│   │   ├── signin/              # Sign in page
│   │   └── error/               # Auth error page
│   ├── dashboard/
│   │   ├── layout.tsx           # Dashboard shell with navigation
│   │   ├── page.tsx             # Dashboard home
│   │   ├── calendar/            # Calendar view
│   │   ├── contacts/            # Contact CRUD pages
│   │   ├── projects/            # Project CRUD pages
│   │   └── galleries/           # Gallery CRUD pages
│   ├── gallery/[token]/         # Public gallery view
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
│
├── actions/                      # Server Actions
│   ├── contacts/                # Contact mutations
│   ├── projects/                # Project mutations
│   ├── sessions/                # Session mutations
│   ├── galleries/               # Gallery mutations
│   └── calendar/                # Calendar queries
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── providers/               # Context providers
│   └── features/                # Feature components
│       ├── contacts/
│       ├── projects/
│       ├── sessions/
│       ├── galleries/
│       └── calendar/
│
├── lib/
│   ├── auth/
│   │   └── auth.config.ts       # NextAuth edge config
│   ├── google/
│   │   ├── calendar.ts          # Google Calendar API
│   │   └── gmail.ts             # Gmail API
│   ├── s3/
│   │   ├── client.ts            # S3 client
│   │   └── upload.ts            # Presigned URL generation
│   ├── email/templates/         # HTML email templates
│   ├── validations/             # Zod schemas
│   └── db.ts                    # Prisma client
│
├── types/                        # TypeScript types
│   └── next-auth.d.ts           # NextAuth type extensions
│
├── auth.ts                       # NextAuth full config
└── middleware.ts                 # Route protection
```

---

## Authentication Architecture

### Split Auth Configuration

Due to Vercel's 1MB edge function limit, auth is split into two configs:

**`/src/auth.ts`** - Full auth with Prisma adapter
- Used in API routes and server actions
- Includes Prisma adapter for database storage
- Handles token storage and user creation

**`/src/lib/auth/auth.config.ts`** - Edge-compatible config
- Used in middleware
- No Prisma (too large for edge)
- Session validation only

### OAuth Flow

```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent
3. User grants permissions (Calendar, Gmail)
4. Callback to /api/auth/callback/google
5. NextAuth creates/updates user and account
6. Access token and refresh token stored
7. JWT session created with user ID
8. Redirect to /dashboard
```

### Google API Token Management

```typescript
// In server actions, get fresh access token
const account = await prisma.account.findFirst({
  where: { userId, provider: "google" }
})

// Use access_token for API calls
// If expired, refresh using refresh_token
```

---

## File Upload Architecture

### S3 Direct Upload Flow

```
1. Client selects files
2. Client requests presigned URL from API
3. Server generates signed URL (expires in 1 hour)
4. Client uploads directly to S3
5. Client notifies server of upload completion
6. Server creates Photo record with S3 URL
```

### S3 Bucket Structure

```
photo-business-uploads-yuval/
└── galleries/
    └── {galleryId}/
        ├── original/
        │   └── {filename}
        └── thumbnails/
            └── {filename}
```

---

## Google Calendar Integration

### Sync Strategy

**Session Creation:**
```typescript
// 1. Create session in database
const session = await prisma.photoSession.create(...)

// 2. Create Google Calendar event
const event = await calendar.events.insert({
  calendarId: "primary",
  requestBody: {
    summary: session.title,
    start: { dateTime: session.startTime },
    end: { dateTime: session.endTime },
    location: session.location
  }
})

// 3. Store event ID for future updates
await prisma.photoSession.update({
  where: { id: session.id },
  data: { googleEventId: event.data.id }
})
```

**Calendar View:**
```typescript
// Fetch events from Google Calendar
const googleEvents = await calendar.events.list({
  calendarId: "primary",
  timeMin: startDate.toISOString(),
  timeMax: endDate.toISOString()
})

// Match with local sessions by googleEventId
const sessions = await prisma.photoSession.findMany({
  where: { googleEventId: { in: googleEventIds } }
})
```

---

## Gmail Integration

### Email Sending Flow

```typescript
// 1. Get Gmail client with user's OAuth tokens
const gmail = await getGmailClient(userId)

// 2. Build MIME message
const message = [
  `To: ${to}`,
  `Subject: ${subject}`,
  `Content-Type: text/html; charset=utf-8`,
  "",
  htmlBody
].join("\n")

// 3. Send via Gmail API
await gmail.users.messages.send({
  userId: "me",
  requestBody: {
    raw: Buffer.from(message).toString("base64url")
  }
})
```

### Email Templates

Located in `/src/lib/email/templates/`:

- `booking-confirmation.ts` - Sent when project status → BOOKED
- `gallery-ready.ts` - Sent manually when gallery is shared

---

## UI Component Standards

### shadcn/ui Requirements

ALL UI components MUST use shadcn/ui. No custom HTML elements for standard UI.

**Correct:**
```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

<Card>
  <CardContent>
    <Input type="email" />
    <Button>Submit</Button>
  </CardContent>
</Card>
```

**Incorrect:**
```tsx
<div className="card">
  <input type="email" />
  <button>Submit</button>
</div>
```

### Available Components

Core components in `/src/components/ui/`:
- Button, Input, Label, Textarea
- Card, Dialog, Sheet, Dropdown
- Table, Badge, Avatar
- Form (with React Hook Form integration)
- Toast (via Sonner)
- Calendar (date picker)

---

## Security Measures

### Authentication
- JWT tokens with httpOnly cookies
- CSRF protection (built into NextAuth)
- OAuth state validation

### Authorization
- All server actions verify user ownership
- Row-level security pattern: `where: { userId: user.id }`

### Input Validation
- Zod schemas for all inputs
- Validation on client (UX) and server (security)

### File Uploads
- Presigned URLs expire after 1 hour
- File type validation
- Size limits enforced

---

## Performance Optimizations

### Rendering
- Server Components by default
- Client Components only for interactivity
- Streaming with Suspense for loading states

### Database
- Connection pooling via Neon
- Indexed queries on userId, status
- Pagination for lists

### Images
- Direct S3 URLs (CDN optional)
- Thumbnail generation for grids
- Lazy loading in galleries

---

## Error Handling

### Server Actions
```typescript
try {
  // Action logic
  return { success: true, data: result }
} catch (error) {
  console.error("Action failed:", error)
  return { error: "Failed to complete action" }
}
```

### Client Components
```tsx
const { error, isError } = useQuery(...)

if (isError) {
  return <ErrorMessage message={error.message} />
}
```

### Global Error Boundary
- Next.js error.tsx files for route errors
- Toast notifications for user feedback

---

**Document Version:** 2.0
**Last Updated:** January 10, 2026

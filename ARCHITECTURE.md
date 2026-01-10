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
- **Why:** Industry standard, excellent DX, built-in optimizations
- **App Router:** Modern approach, RSC support, better performance
- **TypeScript:** Type safety, better IDE support, fewer runtime errors

**UI Library:** React 18
- **Server Components:** Default for pages, reduce client bundle
- **Client Components:** Only when needed (interactivity)

**Styling:** Tailwind CSS 3
- **Why:** Utility-first, mobile-first, highly customizable
- **Design System:** Custom theme extending Tailwind defaults

**Component Library:** shadcn/ui (Radix UI)
- **Why:** Accessible, customizable, no runtime overhead
- **Components:** Built on Radix primitives
- **Not a library:** Copy-paste components (full control)
- **CRITICAL:** ALL UI components MUST use shadcn/ui - no custom CSS/HTML components

**Icons:** Lucide React
- **Why:** Modern, tree-shakeable, MIT licensed

### Backend

**Runtime:** Next.js API Routes & Server Actions
- **API Routes:** REST endpoints, webhooks
- **Server Actions:** Form mutations, direct from components

**Database ORM:** Prisma
- **Why:** Type-safe, great DX, migrations, Prisma Studio
- **Database:** PostgreSQL (Neon - serverless)

**Authentication:** NextAuth.js v5
- **Why:** Industry standard for Next.js, supports multiple providers
- **Providers:** Google OAuth (Calendar + Gmail), Email/Password
- **Session:** JWT strategy

### Data & State Management

**Server State:** TanStack Query (React Query)
- **Why:** Caching, background refetching, optimistic updates
- **Use Cases:** API data, server state synchronization

**Client State:** Zustand
- **Why:** Simple, minimal boilerplate, good TypeScript support
- **Use Cases:** UI state, user preferences

**Forms:** React Hook Form + Zod
- **Why:** Performance, minimal re-renders, schema validation
- **Validation:** Zod for runtime type safety

### Storage & External Services

**File Storage:** AWS S3
- **Why:** Industry standard, scalable, cost-effective
- **Strategy:** Direct uploads via presigned URLs
- **CDN:** CloudFront (optional, for faster delivery)
- **Processing:** Sharp for image optimization

**Database:** Neon PostgreSQL
- **Why:** Serverless, auto-scaling, generous free tier
- **Region:** us-east-2 (same as S3)
- **Connection:** Pooled for serverless compatibility

**Calendar:** Google Calendar API
- **Why:** Industry standard, user familiarity
- **Integration:** Two-way sync (create, update, delete)

**Email:** Gmail API
- **Why:** Integrated with OAuth, user's own email
- **Use Cases:** Client communication, notifications

### DevOps & Deployment

**Hosting:** Vercel
- **Why:** Built by Next.js team, zero-config deployment
- **Features:** Edge network, preview deployments, analytics
- **CI/CD:** Auto-deploy from GitHub

**Version Control:** Git + GitHub
- **Why:** Industry standard, integrates with Vercel

---

## Database Schema Design

### Entity Relationship Diagram

```
┌─────────────┐
│    User     │
│ (Photogr.)  │
└─────┬───────┘
      │
      │ 1:N
      │
      ├──────────┬──────────┬──────────┐
      │          │          │          │
  ┌───▼───┐  ┌──▼──┐  ┌────▼────┐ ┌──▼──┐
  │Client │  │Book.│  │ Gallery │ │Acct │
  └───┬───┘  └──┬──┘  └────┬────┘ └─────┘
      │         │           │
      │ 1:N     │ 1:1       │ 1:N
      │         │           │
      └────┬────┴───────┬───┘
           │            │
       ┌───▼───┐    ┌───▼───┐
       │Gallery│    │ Photo │
       └───────┘    └───────┘
```

### Key Models

**User**
- Primary entity for photographers
- Stores business settings (name, logo, email, phone)
- Manages authentication via NextAuth

**Account** (NextAuth)
- OAuth provider accounts (Google)
- Stores access/refresh tokens for Google APIs
- One-to-many with User

**Client**
- CRM entity for photographer's clients
- Status: LEAD → ACTIVE → PAST → ARCHIVED
- Supports tagging and categorization

**Booking**
- Event/session scheduling
- Integrates with Google Calendar (stores googleEventId)
- Links to Client, optionally to Gallery
- Pricing information (total price, deposit)

**Gallery**
- Container for photo collections
- Access control (public/private, password, expiration)
- Unique shareToken for public access
- Links to Client and optional Booking

**Photo**
- Individual photos within Gallery
- Stores S3 URLs (original + thumbnail)
- Metadata (dimensions, file size, MIME type)
- Organization (order, favorites, tags)

### Indexing Strategy

**Performance Indexes:**
- `clients`: `[userId, status]`, `[userId, email]`
- `bookings`: `[userId, startTime]`, `[userId, status]`, `[clientId]`
- `galleries`: `[userId]`, `[clientId]`, `[shareToken]`
- `photos`: `[galleryId, order]`

**Why:** Optimize common queries (list by user, filter by status, sort by date)

---

## Application Structure

### Directory Organization

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (layout)
│   │   ├── signin/
│   │   └── error/
│   ├── dashboard/                # Protected routes
│   │   ├── layout.tsx           # Dashboard shell
│   │   ├── clients/             # CRM pages
│   │   ├── bookings/            # Booking pages
│   │   └── galleries/           # Gallery pages
│   ├── gallery/[token]/         # Public gallery
│   ├── api/                     # API routes
│   │   ├── auth/[...nextauth]/  # NextAuth
│   │   └── galleries/upload/    # File upload
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── layouts/                 # Layout components
│   │   ├── MobileNav.tsx
│   │   └── DesktopSidebar.tsx
│   └── features/                # Feature components
│       ├── clients/
│       ├── bookings/
│       └── galleries/
│
├── lib/                         # Utilities & configs
│   ├── auth/                    # Auth utilities
│   │   ├── auth.config.ts
│   │   └── utils.ts
│   ├── prisma/                  # Prisma client
│   │   └── client.ts
│   ├── s3/                      # S3 utilities
│   │   ├── client.ts
│   │   ├── upload.ts
│   │   └── presigned-url.ts
│   ├── google/                  # Google APIs
│   │   ├── calendar.ts
│   │   └── gmail.ts
│   └── validations/             # Zod schemas
│       └── client.schema.ts
│
├── actions/                     # Server Actions
│   ├── clients/
│   │   ├── create-client.ts
│   │   ├── update-client.ts
│   │   └── delete-client.ts
│   ├── bookings/
│   └── galleries/
│
├── hooks/                       # Custom React hooks
├── types/                       # TypeScript types
└── middleware.ts                # Next.js middleware
```

### File Naming Conventions

- **Pages:** `page.tsx` (Next.js convention)
- **Layouts:** `layout.tsx` (Next.js convention)
- **Components:** `PascalCase.tsx` (e.g., `ClientForm.tsx`)
- **Utilities:** `kebab-case.ts` (e.g., `auth.config.ts`)
- **Server Actions:** `kebab-case.ts` (e.g., `create-client.ts`)
- **Hooks:** `use-something.ts` (e.g., `use-client.ts`)

---

## UI Component Standards

### ⚠️ CRITICAL REQUIREMENT: shadcn/ui Only

**ALL UI components in this application MUST use shadcn/ui components. NO exceptions.**

**Why this is mandatory:**
- **Consistency:** Unified design language across the entire app
- **Accessibility:** WCAG compliant out of the box (Radix UI primitives)
- **Customization:** Full control over component code (not a library)
- **Type Safety:** Full TypeScript support
- **Mobile-First:** Responsive by default
- **Performance:** No runtime overhead, tree-shakeable

**What this means:**
- ✅ Use `<Button>` from `@/components/ui/button`
- ✅ Use `<Input>` from `@/components/ui/input`
- ✅ Use `<Card>` from `@/components/ui/card`
- ❌ DO NOT create custom `<button>` elements
- ❌ DO NOT use plain HTML inputs
- ❌ DO NOT write custom component CSS

**Available Components:**
Installed components are in `src/components/ui/`:
- `button.tsx` - Buttons with variants
- `card.tsx` - Cards with header, content, footer
- `input.tsx` - Text inputs
- `label.tsx` - Form labels
- `form.tsx` - Form wrapper with validation
- `table.tsx` - Data tables
- `dialog.tsx` - Modals and dialogs
- `dropdown-menu.tsx` - Dropdown menus
- `toast.tsx` - Toast notifications
- `avatar.tsx` - User avatars
- `badge.tsx` - Status badges
- `separator.tsx` - Visual separators

**Installing Additional Components:**
```bash
npx shadcn@latest add [component-name]
```

**Example Usage:**
```tsx
// ✅ CORRECT
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

function MyComponent() {
  return (
    <Card>
      <Input type="email" placeholder="Email" />
      <Button>Submit</Button>
    </Card>
  )
}

// ❌ WRONG - Don't do this!
function MyComponent() {
  return (
    <div className="card">
      <input type="email" placeholder="Email" />
      <button className="btn">Submit</button>
    </div>
  )
}
```

**When you need a component that's not installed:**
1. Check if shadcn/ui has it: https://ui.shadcn.com/docs/components
2. Install it: `npx shadcn@latest add [component-name]`
3. Use it from `@/components/ui/[component-name]`

**Custom Components:**
Only create custom components when:
- Combining multiple shadcn/ui components (e.g., `ClientCard` using `Card`, `Avatar`, `Badge`)
- Business logic wrappers (e.g., `ClientForm` using `Form`, `Input`, `Button`)
- Feature-specific components that compose shadcn/ui primitives

**Never create custom versions of standard UI elements (buttons, inputs, cards, etc.)**

---

## Design Patterns

### Server Components First

**Default:** Use Server Components for all pages
- Faster initial load
- Reduced client bundle size
- Direct database access
- SEO friendly

**Client Components:** Only when needed
- User interaction (forms, buttons)
- Browser APIs (localStorage, geolocation)
- State management (useState, useContext)
- Effects (useEffect)

### Server Actions for Mutations

**Why:** Type-safe, no API route boilerplate
```typescript
// actions/clients/create-client.ts
"use server"

export async function createClient(data: ClientFormData) {
  const user = await requireAuth()
  const validated = clientSchema.parse(data)
  const client = await prisma.client.create({
    data: { ...validated, userId: user.id }
  })
  revalidatePath('/dashboard/clients')
  return client
}
```

**Usage in Client Component:**
```typescript
"use client"
import { createClient } from '@/actions/clients/create-client'

function ClientForm() {
  const onSubmit = async (data) => {
    const client = await createClient(data)
    router.push(`/dashboard/clients/${client.id}`)
  }
}
```

### Progressive Enhancement

**Forms work without JavaScript:**
```tsx
<form action={createClientAction}>
  <input name="firstName" required />
  <button type="submit">Create</button>
</form>
```

**Enhanced with JavaScript:**
- Validation before submission
- Optimistic updates
- Loading states
- Error handling

### Authentication Flow

1. **User visits protected route** (`/dashboard/clients`)
2. **Middleware checks session** (`middleware.ts`)
3. **No session?** Redirect to `/auth/signin`
4. **Has session?** Continue to page
5. **Page/Action** verifies auth with `requireAuth()`

### Authorization Pattern

**Every server action/API route:**
```typescript
const user = await requireAuth()
const client = await prisma.client.findUnique({
  where: { id, userId: user.id } // Security: userId check
})
```

**Never trust client input:**
- Always check userId matches logged-in user
- Validate all inputs with Zod
- Sanitize before database operations

---

## API Design

### RESTful Routes

**Naming:** Plural resources
```
GET    /api/clients       # List clients
POST   /api/clients       # Create client
GET    /api/clients/:id   # Get client
PATCH  /api/clients/:id   # Update client
DELETE /api/clients/:id   # Delete client
```

**Response Format:**
```typescript
// Success
{ data: {...}, meta: { page, total } }

// Error
{ error: { message: "...", code: "..." } }
```

### Server Actions

**Naming:** Verb-noun format
```
createClient, updateClient, deleteClient
createBooking, syncToCalendar
uploadPhotos, generateShareLink
```

**Return Format:**
```typescript
// Success
{ success: true, data: {...} }

// Error (throw)
throw new Error("Client not found")
```

---

## Security Architecture

### Authentication

**NextAuth.js v5:**
- JWT strategy (stateless)
- Secure cookie (httpOnly, secure, sameSite)
- CSRF protection (built-in)

**Password Hashing:**
- bcryptjs with salt rounds: 10
- Never store plaintext passwords

### Authorization

**Row-Level Security Pattern:**
```typescript
// Every query checks userId
const clients = await prisma.client.findMany({
  where: { userId: user.id }
})
```

**Middleware Protection:**
```typescript
// middleware.ts
if (pathname.startsWith('/dashboard')) {
  const token = await getToken({ req })
  if (!token) return NextResponse.redirect('/auth/signin')
}
```

### Input Validation

**Zod Schemas:**
```typescript
const clientSchema = z.object({
  firstName: z.string().min(1),
  email: z.string().email(),
  // ...
})
```

**Double Validation:**
1. Client-side (React Hook Form + Zod)
2. Server-side (Server Action + Zod)

### File Upload Security

**S3 Direct Upload:**
1. Client requests presigned URL from API
2. Server generates signed URL (expires in 1 hour)
3. Client uploads directly to S3
4. Client notifies server of successful upload
5. Server validates and creates Photo record

**Validation:**
- File type (MIME checking)
- File size limits
- Virus scanning (future)

### CORS Configuration

**S3 Bucket:**
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

**API Routes:**
- Same-origin by default
- Explicit CORS headers for public endpoints

### Environment Variables

**Never commit:**
- `.env.local` in `.gitignore`
- Use Vercel environment variables for production

**Access:**
- Server: All env vars
- Client: Only `NEXT_PUBLIC_*` vars

---

## Performance Optimization

### Rendering Strategy

**Static Generation:** Landing page, docs
**Server-Side Rendering:** Dashboard pages (dynamic data)
**Incremental Static Regeneration:** Public galleries (revalidate: 3600)

### Image Optimization

**Sharp Processing:**
- Resize to max 4000px width
- Generate thumbnails (400x400)
- Optimize JPEG quality (80-85%)
- WebP format for modern browsers

**Next.js Image Component:**
```tsx
<Image
  src={photo.s3Url}
  alt={photo.filename}
  width={800}
  height={600}
  priority={isAboveFold}
/>
```

### Database Query Optimization

**Indexes:** On frequently queried fields
**Select Only Needed Fields:**
```typescript
const clients = await prisma.client.findMany({
  select: { id: true, firstName: true, lastName: true }
})
```

**Pagination:**
```typescript
const clients = await prisma.client.findMany({
  take: 20,
  skip: page * 20
})
```

### Caching Strategy

**React Query:**
- Cache server data
- Background refetching
- Stale-while-revalidate

**Next.js:**
- Static assets (CDN)
- API routes (`Cache-Control` headers)

---

## Mobile-First Design

### Responsive Breakpoints

```typescript
// tailwind.config.ts
theme: {
  screens: {
    'sm': '640px',   // Tablet
    'md': '768px',   // Small desktop
    'lg': '1024px',  // Desktop
    'xl': '1280px',  // Large desktop
  }
}
```

### Mobile Navigation

**Bottom Tab Bar** (< 768px)
- Fixed position at bottom
- 44px touch targets
- Icons + labels
- Accessible (ARIA labels)

**Desktop Sidebar** (>= 768px)
- Fixed left sidebar
- Collapsible
- Nested navigation

### Touch Targets

**Minimum:** 44x44px (Apple HIG, Material Design)
```css
.button {
  @apply min-h-[44px] min-w-[44px]
}
```

### Performance Budget

**Mobile:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Total Bundle Size: < 300KB (gzipped)

---

## Error Handling

### Client Errors

**React Error Boundaries:**
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Dashboard />
</ErrorBoundary>
```

**Toast Notifications:**
```typescript
toast.error("Failed to create client")
toast.success("Client created successfully")
```

### Server Errors

**Server Actions:**
```typescript
try {
  const client = await createClient(data)
  return { success: true, client }
} catch (error) {
  console.error(error)
  throw new Error("Failed to create client")
}
```

**API Routes:**
```typescript
try {
  // ...
} catch (error) {
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}
```

### Logging

**Development:** Console logs
**Production:** Error tracking service (Sentry, LogRocket)

---

## Testing Strategy (Future)

### Unit Tests
- Utility functions
- Validation schemas
- Pure components

### Integration Tests
- API routes
- Server actions
- Database operations

### End-to-End Tests
- Critical user flows
- Authentication
- Photo upload

**Tools:**
- Jest for unit tests
- React Testing Library for components
- Playwright for E2E

---

## Monitoring & Analytics (Future)

### Application Monitoring
- Vercel Analytics (speed insights)
- Error tracking (Sentry)
- User analytics (privacy-friendly)

### Database Monitoring
- Neon dashboard (query performance)
- Slow query logs

### Infrastructure
- Vercel deployment logs
- AWS S3 metrics
- Google API quotas

---

## Scalability Considerations

### Database
- Neon auto-scales
- Connection pooling (PgBouncer)
- Read replicas (future)

### File Storage
- S3 scales infinitely
- CloudFront CDN for global delivery

### Application
- Vercel edge functions
- Serverless (auto-scaling)
- Stateless architecture

### Costs
- Neon: Free tier → Pro ($19/month)
- Vercel: Free tier → Pro ($20/month)
- AWS S3: Pay per GB (estimate: $3-10/month)

---

## Future Enhancements

### Phase 2 Features
- Contracts & e-signing (DocuSign)
- Payment processing (Stripe)
- AI photo selection
- Advanced analytics

### Technical Improvements
- PWA (offline support)
- Native mobile apps (React Native)
- Real-time collaboration
- Advanced caching strategies

---

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Next Review:** After Phase 1 completion

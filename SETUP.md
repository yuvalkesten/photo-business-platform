# Setup Guide - Photo Business Platform

Complete setup instructions for local development and production deployment.

---

## Prerequisites

- Node.js v20+ (v18 minimum)
- Git
- Google Account (for OAuth)
- AWS Account (for S3 storage)
- Vercel Account (for deployment)

---

## 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yuvalkesten/photo-business-platform.git
cd photo-business-platform

# Install dependencies
npm install
```

---

## 2. Neon PostgreSQL Database Setup

### Create Account & Database

1. Go to https://neon.tech
2. Sign up for free account
3. Create new project: `photo-business-platform`
4. Region: `us-east-2` (Ohio) - same as S3
5. PostgreSQL version: Latest (default)

### Get Connection String

1. After project creation, go to Dashboard
2. Click "Connection string"
3. Copy the **pooled connection** string
4. Format: `postgresql://user:pass@endpoint-pooler.c-2.region.aws.neon.tech/neondb?sslmode=require`

**Important:**
- Use **pooled connection** (includes `-pooler` in hostname)
- Remove `&channel_binding=require` parameter (not compatible with Prisma)

---

## 3. Google Cloud Platform Setup

### Create Project

1. Go to https://console.cloud.google.com
2. Create new project: `Photo Business Platform`
3. Select the project

### Enable APIs

1. Navigate to "APIs & Services" > "Library"
2. Search and enable:
   - Google Calendar API
   - Gmail API

### Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. User Type: **External**
3. Fill in app details
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/gmail.send`
5. Add test users (your email)

### Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Create "OAuth client ID" > "Web application"
3. Add redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.vercel.app/api/auth/callback/google`
4. Save Client ID and Client Secret

---

## 4. AWS S3 Setup

### Create IAM User

1. Go to AWS IAM Console
2. Create user: `photo-platform-app`
3. Attach policy: `AmazonS3FullAccess`
4. Create access key and save credentials

### Create S3 Bucket

1. Go to S3 Console
2. Create bucket with unique name (e.g., `photo-business-uploads-yourname`)
3. Region: `us-east-2`
4. Uncheck "Block all public access"

### Configure CORS

Add to bucket CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-domain.vercel.app"
        ],
        "ExposeHeaders": ["ETag"]
    }
]
```

### Configure Bucket Policy (for public gallery access)

Add bucket policy for public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGalleries",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/galleries/*"
        }
    ]
}
```

---

## 5. Environment Variables

Create `.env.local` file in project root:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@endpoint-pooler.c-2.region.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-run-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"

# AWS S3
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="your-bucket-name"

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 6. Database Setup

```bash
# Apply migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# (Optional) Seed database with demo data
npx prisma db seed
```

---

## 7. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 8. Production Deployment (Vercel)

### Deploy to Vercel

1. Push code to GitHub
2. Go to https://vercel.com
3. Import repository
4. Add environment variables (same as `.env.local` but with production values):
   - `NEXTAUTH_URL` = `https://your-domain.vercel.app`
   - `NEXT_PUBLIC_APP_URL` = `https://your-domain.vercel.app`
5. Deploy

### Post-Deployment

1. Update Google OAuth redirect URI to production URL
2. Update S3 CORS with production domain
3. Verify all features work

---

## 9. Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes (dev only)

# Deployment
vercel                   # Deploy to preview
vercel --prod            # Deploy to production
```

---

## 10. Common Issues

### Database Connection Failed

- Verify connection string format (must include `.c-2.`)
- Use pooled connection (includes `-pooler`)
- Remove `&channel_binding=require` parameter

### Google OAuth Not Working

- Check redirect URI matches exactly
- Ensure scopes are added to consent screen
- Add your email as test user

### S3 Upload Fails

- Verify CORS includes your origin
- Check IAM user has S3 access
- Verify bucket policy for public access

### Build Errors on Vercel

- Ensure all environment variables are set
- Check for TypeScript errors locally first
- Review Vercel build logs

---

## Support

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Neon Docs](https://neon.tech/docs)

---

**Last Updated:** January 10, 2026

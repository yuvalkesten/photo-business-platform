# Setup Guide - Photo Business Platform

Complete setup instructions for local development and production deployment.

---

## Prerequisites

- macOS with Homebrew installed
- Node.js v20+ (installed via Homebrew)
- Git
- Web browser
- Terminal

---

## 1. Node.js v20 Installation

```bash
# Install Node.js v20
brew install node@20

# Link to make it default
brew link node@20 --force --overwrite

# Verify installation
/opt/homebrew/opt/node@20/bin/node --version
# Should show: v20.19.6
```

**Note:** Your terminal may still show Node v18. Use the full path `/opt/homebrew/opt/node@20/bin/node` or `/opt/homebrew/opt/node@20/bin/npm` for commands.

---

## 2. Neon PostgreSQL Database Setup

### Create Account & Database

1. Go to https://neon.tech
2. Sign up for free account
3. Create new project: `photo-business-platform`
4. Region: `us-east-2` (Ohio)
5. PostgreSQL version: Latest (default)

### Get Connection String

1. After project creation, go to Dashboard
2. Click "Connection string" or "Connection details"
3. Copy the **pooled connection** string
4. Format: `postgresql://user:pass@endpoint-pooler.c-2.region.aws.neon.tech/neondb?sslmode=require`

**Important Notes:**
- Use **pooled connection** (includes `-pooler` in hostname)
- Remove `&channel_binding=require` parameter (not compatible with Prisma)
- Keep `.c-2.` in the hostname
- Save this for `.env.local`

### Connection String Format

```
postgresql://[username]:[password]@[endpoint]-pooler.c-2.[region].aws.neon.tech/neondb?sslmode=require
```

---

## 3. Google Cloud Platform Setup

### Create Project

1. Go to https://console.cloud.google.com
2. Click project dropdown → "New Project"
3. Name: `Photo Business Platform`
4. Click "Create"
5. Wait for creation, then select the project

### Enable APIs

1. Navigate to "APIs & Services" → "Library"
2. Search for "Google Calendar API" → Click → "Enable"
3. Search for "Gmail API" → Click → "Enable"

### Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. User Type: **External**
3. Click "Create"
4. Fill in:
   - App name: `Photo Business Platform`
   - User support email: Your email
   - Developer contact: Your email
5. Click "Save and Continue"
6. **Scopes:** Click "Add or Remove Scopes"
   - Select: `../auth/userinfo.email`
   - Select: `../auth/userinfo.profile`
   - Select: `openid`
   - Manually add: `https://www.googleapis.com/auth/calendar`
   - Manually add: `https://www.googleapis.com/auth/gmail.send`
7. Click "Update" → "Save and Continue"
8. **Test users:** Add your email address
9. Click "Save and Continue"

### Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `Photo Business Platform Web Client`
5. **Authorized redirect URIs:**
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google` (add later)
6. Click "Create"
7. **Save the credentials:**
   - Client ID: `YOUR_CLIENT_ID.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-YOUR_SECRET`

**File Location:** Credentials saved to Downloads as JSON file

---

## 4. AWS S3 Setup

### Create AWS Account

1. Go to https://aws.amazon.com
2. Sign up (requires credit card but free tier available)
3. Sign in to AWS Console

### Create IAM User

1. Search for "IAM" in AWS Console
2. Click "Users" → "Create user"
3. User name: `photo-platform-app`
4. Click "Next"
5. Permissions: Select "Attach policies directly"
6. Search and select: `AmazonS3FullAccess`
7. Click "Next" → "Create user"
8. Click on the user name
9. Go to "Security credentials" tab
10. Scroll to "Access keys" → "Create access key"
11. Use case: "Application running outside AWS"
12. Click "Next" → "Create access key"
13. **Save credentials:**
    - Access Key ID: `YOUR_ACCESS_KEY_ID`
    - Secret Access Key: `YOUR_SECRET_ACCESS_KEY`
14. Download CSV file

**File Location:** Saved to Downloads as `photo-platform-app_accessKeys.csv`

### Create S3 Bucket

1. Search for "S3" in AWS Console
2. Click "Create bucket"
3. Bucket name: `photo-business-uploads-yuval` (must be globally unique)
4. AWS Region: **us-east-2** (Ohio) - same as database
5. **Block Public Access:** Uncheck "Block all public access"
   - Check acknowledgment box
6. Keep other settings default
7. Click "Create bucket"

### Configure CORS

1. Click on bucket name
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Click "Edit"
5. Paste this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3000"],
        "ExposeHeaders": ["ETag"]
    }
]
```

6. Click "Save changes"

**Production Note:** Update `AllowedOrigins` to include production domain

---

## 5. Environment Variables Setup

Create `.env.local` file in project root:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://[user]:[password]@[endpoint]-pooler.c-2.[region].aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here-run-openssl-rand-base64-32"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"

# AWS S3 (from IAM user)
AWS_REGION="us-east-2"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="your-bucket-name"
AWS_CLOUDFRONT_DOMAIN="" # Optional: Add if you set up CloudFront

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate new NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 6. Project Installation

```bash
# Navigate to code directory
cd /Users/yuvalkesten/code

# Create Next.js project (already done)
# npx create-next-app@latest photo-business-platform --typescript --tailwind --app --use-npm --eslint --no-git

# Enter project directory
cd photo-business-platform

# Install dependencies (already done)
# npm install

# Initialize Prisma (already done)
# npx prisma init --datasource-provider postgresql

# Run migration
/opt/homebrew/opt/node@20/bin/npx prisma migrate dev --name init

# Generate Prisma Client
/opt/homebrew/opt/node@20/bin/npx prisma generate
```

---

## 7. Verify Setup

### Check Database Connection

```bash
/opt/homebrew/opt/node@20/bin/npx prisma studio
```

This opens a database GUI at http://localhost:5555. You should see all your tables.

### Run Development Server

```bash
/opt/homebrew/opt/node@20/bin/npm run dev
```

Open http://localhost:3000 in your browser.

---

## 8. Production Deployment (Vercel)

### Prepare for Deployment

1. Initialize Git repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Push to GitHub:
```bash
gh repo create photo-business-platform --private --source=. --push
# Or create repo manually on GitHub and push
```

### Deploy to Vercel

1. Go to https://vercel.com
2. Sign up/in with GitHub
3. Click "Add New" → "Project"
4. Import `photo-business-platform` repository
5. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. **Environment Variables:** Add all from `.env.local`:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (update to production URL)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_S3_BUCKET_NAME`
   - `NEXT_PUBLIC_APP_URL` (update to production URL)
7. Click "Deploy"

### Post-Deployment Configuration

1. **Update Google OAuth:**
   - Go to Google Cloud Console
   - Add production redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`

2. **Update S3 CORS:**
   - Add production domain to `AllowedOrigins`

3. **Update Environment Variables:**
   - `NEXTAUTH_URL` = `https://your-domain.vercel.app`
   - `NEXT_PUBLIC_APP_URL` = `https://your-domain.vercel.app`

---

## 9. Common Issues & Solutions

### Prisma Can't Connect to Database

**Problem:** `P1001: Can't reach database server`

**Solutions:**
- Verify connection string format (must include `.c-2.`)
- Use pooled connection (includes `-pooler`)
- Remove `&channel_binding=require` parameter
- Check `.env.local` is in project root
- Verify Neon database is active (check dashboard)

### Node Version Mismatch

**Problem:** `EBADENGINE Unsupported engine`

**Solution:** Use full path to Node v20:
```bash
/opt/homebrew/opt/node@20/bin/npm run dev
```

Or add to PATH permanently in `~/.zshrc`:
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```

### Google OAuth Not Working

**Problem:** Redirect URI mismatch

**Solutions:**
- Verify redirect URI exactly matches in Google Console
- Check for trailing slashes
- Ensure protocol (http vs https) matches

### S3 Upload Fails

**Problem:** CORS errors

**Solutions:**
- Verify CORS configuration includes your origin
- Check bucket permissions
- Verify IAM user has S3 access

---

## 10. Development Workflow

### Daily Development

```bash
# Start development server
/opt/homebrew/opt/node@20/bin/npm run dev

# In separate terminal: Open Prisma Studio
/opt/homebrew/opt/node@20/bin/npx prisma studio
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create and apply migration
/opt/homebrew/opt/node@20/bin/npx prisma migrate dev --name <description>

# 3. Generate Prisma Client
/opt/homebrew/opt/node@20/bin/npx prisma generate
```

### Installing New Packages

```bash
# Production dependency
/opt/homebrew/opt/node@20/bin/npm install <package-name>

# Dev dependency
/opt/homebrew/opt/node@20/bin/npm install -D <package-name>
```

---

## 11. Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit credentials to Git
- [ ] Use environment variables for all secrets
- [ ] Rotate credentials periodically
- [ ] Use different credentials for dev/production
- [ ] Enable 2FA on all service accounts
- [ ] Review IAM permissions (principle of least privilege)
- [ ] Monitor AWS billing for unexpected usage
- [ ] Keep dependencies updated (`npm audit`)

---

## 12. Backup & Recovery

### Database Backup (Neon)

Neon provides automatic backups. To export:
```bash
/opt/homebrew/opt/node@20/bin/npx prisma db pull
# Creates schema from existing database
```

### Credentials Backup

Store credentials securely:
1. Use a password manager (1Password, LastPass, etc.)
2. Keep `.env.local` backup in secure location
3. Document service access in team wiki

---

## Support & Resources

- **Neon Docs:** https://neon.tech/docs
- **Google Cloud Docs:** https://cloud.google.com/docs
- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **NextAuth.js Docs:** https://next-auth.js.org/

---

**Setup Completed:** January 10, 2026
**Last Verified:** January 10, 2026

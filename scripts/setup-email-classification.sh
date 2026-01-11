#!/bin/bash

# Email Classification System - Google Cloud Setup Script
# This script sets up the Google Cloud Pub/Sub infrastructure for Gmail push notifications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Email Classification Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# Step 1: Check prerequisites
# ============================================
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo -e "${GREEN}  ✓ gcloud CLI is installed${NC}"

# Check if authenticated
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
    echo -e "${RED}Error: No active gcloud account found.${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi
echo -e "${GREEN}  ✓ Authenticated as: ${ACTIVE_ACCOUNT}${NC}"

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No default project set.${NC}"
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: Project ID is required.${NC}"
        exit 1
    fi
    gcloud config set project "$PROJECT_ID"
fi
echo -e "${GREEN}  ✓ Using project: ${PROJECT_ID}${NC}"

echo ""

# ============================================
# Step 2: Get Vercel domain
# ============================================
echo -e "${YELLOW}Step 2: Configure webhook endpoint...${NC}"
echo ""
echo "Enter your Vercel domain (e.g., photo-business-platform.vercel.app)"
echo "This is where Gmail will send push notifications."
read -p "Vercel domain: " VERCEL_DOMAIN

if [ -z "$VERCEL_DOMAIN" ]; then
    echo -e "${RED}Error: Vercel domain is required.${NC}"
    exit 1
fi

# Remove https:// if provided
VERCEL_DOMAIN=$(echo "$VERCEL_DOMAIN" | sed 's|https://||' | sed 's|http://||' | sed 's|/$||')
echo -e "${GREEN}  ✓ Using domain: ${VERCEL_DOMAIN}${NC}"
echo ""

# ============================================
# Step 3: Enable APIs
# ============================================
echo -e "${YELLOW}Step 3: Enabling required APIs...${NC}"

echo "  Enabling Pub/Sub API..."
gcloud services enable pubsub.googleapis.com --quiet
echo -e "${GREEN}  ✓ Pub/Sub API enabled${NC}"

echo "  Enabling Gmail API..."
gcloud services enable gmail.googleapis.com --quiet
echo -e "${GREEN}  ✓ Gmail API enabled${NC}"
echo ""

# ============================================
# Step 4: Create Pub/Sub topic
# ============================================
echo -e "${YELLOW}Step 4: Creating Pub/Sub topic...${NC}"

TOPIC_NAME="gmail-push"

# Check if topic already exists
if gcloud pubsub topics describe "$TOPIC_NAME" &>/dev/null; then
    echo -e "${GREEN}  ✓ Topic '${TOPIC_NAME}' already exists${NC}"
else
    gcloud pubsub topics create "$TOPIC_NAME"
    echo -e "${GREEN}  ✓ Created topic: ${TOPIC_NAME}${NC}"
fi
echo ""

# ============================================
# Step 5: Grant Gmail permission to publish
# ============================================
echo -e "${YELLOW}Step 5: Granting Gmail permission to publish...${NC}"

gcloud pubsub topics add-iam-policy-binding "$TOPIC_NAME" \
    --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
    --role="roles/pubsub.publisher" \
    --quiet

echo -e "${GREEN}  ✓ Gmail can now publish to the topic${NC}"
echo ""

# ============================================
# Step 6: Generate verification token
# ============================================
echo -e "${YELLOW}Step 6: Generating secure verification token...${NC}"

VERIFICATION_TOKEN=$(openssl rand -hex 32)
echo -e "${GREEN}  ✓ Token generated${NC}"
echo ""

# ============================================
# Step 7: Create push subscription
# ============================================
echo -e "${YELLOW}Step 7: Creating push subscription...${NC}"

SUBSCRIPTION_NAME="gmail-push-subscription"
WEBHOOK_URL="https://${VERCEL_DOMAIN}/api/webhooks/gmail?token=${VERIFICATION_TOKEN}"

# Check if subscription already exists
if gcloud pubsub subscriptions describe "$SUBSCRIPTION_NAME" &>/dev/null; then
    echo -e "${YELLOW}  Subscription '${SUBSCRIPTION_NAME}' already exists.${NC}"
    read -p "  Do you want to delete and recreate it? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ] || [ "$RECREATE" = "Y" ]; then
        gcloud pubsub subscriptions delete "$SUBSCRIPTION_NAME" --quiet
        gcloud pubsub subscriptions create "$SUBSCRIPTION_NAME" \
            --topic="$TOPIC_NAME" \
            --push-endpoint="$WEBHOOK_URL" \
            --ack-deadline=60
        echo -e "${GREEN}  ✓ Recreated subscription: ${SUBSCRIPTION_NAME}${NC}"
    else
        echo -e "${YELLOW}  Keeping existing subscription. Note: You may need to update the push endpoint manually.${NC}"
    fi
else
    gcloud pubsub subscriptions create "$SUBSCRIPTION_NAME" \
        --topic="$TOPIC_NAME" \
        --push-endpoint="$WEBHOOK_URL" \
        --ack-deadline=60
    echo -e "${GREEN}  ✓ Created subscription: ${SUBSCRIPTION_NAME}${NC}"
fi
echo ""

# ============================================
# Step 8: Generate CRON_SECRET
# ============================================
echo -e "${YELLOW}Step 8: Generating cron secret...${NC}"
CRON_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}  ✓ Cron secret generated${NC}"
echo ""

# ============================================
# Output environment variables
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Add these environment variables to Vercel:${NC}"
echo ""
echo -e "${YELLOW}----------------------------------------${NC}"
echo "GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID}"
echo "PUBSUB_VERIFICATION_TOKEN=${VERIFICATION_TOKEN}"
echo "CRON_SECRET=${CRON_SECRET}"
echo -e "${YELLOW}----------------------------------------${NC}"
echo ""
echo -e "${YELLOW}Also make sure you have:${NC}"
echo "GEMINI_API_KEY=<your-gemini-api-key>"
echo ""

# Save to .env.local.example
ENV_FILE="$(dirname "$0")/../.env.email-classification"
cat > "$ENV_FILE" << EOF
# Email Classification Environment Variables
# Generated on $(date)
# Add these to your Vercel project settings

GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID}
PUBSUB_VERIFICATION_TOKEN=${VERIFICATION_TOKEN}
CRON_SECRET=${CRON_SECRET}

# You also need to set (not included for security):
# GEMINI_API_KEY=<your-gemini-api-key>
EOF

echo -e "${GREEN}Environment variables saved to: ${ENV_FILE}${NC}"
echo ""

# ============================================
# Verification commands
# ============================================
echo -e "${YELLOW}To verify your setup after deploying to Vercel:${NC}"
echo ""
echo "1. Test webhook endpoint:"
echo -e "   ${BLUE}curl \"https://${VERCEL_DOMAIN}/api/webhooks/gmail?token=${VERIFICATION_TOKEN}\"${NC}"
echo ""
echo "2. Test cron endpoint:"
echo -e "   ${BLUE}curl -H \"Authorization: Bearer ${CRON_SECRET}\" \"https://${VERCEL_DOMAIN}/api/cron/renew-gmail-watches\"${NC}"
echo ""
echo "3. Check Pub/Sub subscription:"
echo -e "   ${BLUE}gcloud pubsub subscriptions describe ${SUBSCRIPTION_NAME}${NC}"
echo ""

echo -e "${GREEN}Next steps:${NC}"
echo "1. Add the environment variables to Vercel (Dashboard > Settings > Environment Variables)"
echo "2. Deploy your app: vercel --prod"
echo "3. Sign out and sign back in to grant new Gmail permissions"
echo "4. Enable email classification from /dashboard/emails"
echo ""

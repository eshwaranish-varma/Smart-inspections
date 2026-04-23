#!/bin/bash
# Smart Inspections - Production Deployment Setup Script
# This script sets up GitHub Actions secrets and validates your deployment configuration
# Run this ONCE before your first production deployment

set -e

echo "======================================"
echo "Smart Inspections Deployment Setup"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function for prompts
prompt_input() {
    local prompt="$1"
    local default="$2"
    local value=""
    
    if [ -z "$default" ]; then
        read -p "$prompt: " value
    else
        read -p "$prompt [$default]: " value
        value=${value:-$default}
    fi
    
    echo "$value"
}

prompt_secret() {
    local prompt="$1"
    local value=""
    read -sp "$prompt: " value
    echo ""
    echo "$value"
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ git not found. Please install git.${NC}"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found. Install from: https://cli.github.com${NC}"
    exit 1
fi

echo -e "${GREEN}✓ git and GitHub CLI installed${NC}"
echo ""

# Verify GitHub authentication
echo -e "${YELLOW}Verifying GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub. Run: gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ GitHub authentication verified${NC}"
echo ""

# Collect deployment information
echo -e "${YELLOW}Collecting Render configuration...${NC}"
RENDER_API_KEY=$(prompt_secret "Render API Key (from https://dashboard.render.com/account/api-tokens)")
RENDER_BACKEND_SERVICE_ID=$(prompt_input "Render Backend Service ID (from https://dashboard.render.com/services)")
echo ""

echo -e "${YELLOW}Collecting Supabase configuration...${NC}"
SUPABASE_URL=$(prompt_input "Supabase URL (https://xxxx.supabase.co)")
SUPABASE_ANON_KEY=$(prompt_secret "Supabase Anon Key")
SUPABASE_SERVICE_KEY=$(prompt_secret "Supabase Service Role Key (for backend)")
DATABASE_URL=$(prompt_secret "Database Connection String (postgresql://...)")
echo ""

echo -e "${YELLOW}Collecting API Keys...${NC}"
OPENAI_API_KEY=$(prompt_secret "OpenAI API Key (optional, press Enter to skip)" || true)
GOOGLE_API_KEY=$(prompt_secret "Google API Key (optional, press Enter to skip)" || true)
echo ""

echo -e "${YELLOW}Collecting Vercel configuration...${NC}"
VERCEL_TOKEN=$(prompt_secret "Vercel API Token (from https://vercel.com/account/tokens)")
VERCEL_PROJECT_ID=$(prompt_input "Vercel Project ID (from Vercel dashboard)")
VERCEL_ORG_ID=$(prompt_input "Vercel Organization ID (optional, leave blank if personal account)" || true)
echo ""

echo -e "${YELLOW}Collecting Frontend configuration...${NC}"
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(prompt_secret "Supabase Anon Key for Frontend (usually same as above)")
NEXT_PUBLIC_API_BASE_URL=$(prompt_input "API Base URL" "https://smart-inspection-api.onrender.com")
echo ""

echo -e "${YELLOW}Optional: Slack notifications...${NC}"
SLACK_WEBHOOK=$(prompt_input "Slack Webhook URL (optional, for deployment notifications)" || true)
echo ""

# Summary and confirmation
echo "======================================"
echo -e "${YELLOW}Configuration Summary${NC}"
echo "======================================"
echo "Render API Key: ${RENDER_API_KEY:0:20}..."
echo "Render Service ID: $RENDER_BACKEND_SERVICE_ID"
echo "Supabase URL: $SUPABASE_URL"
echo "Vercel Token: ${VERCEL_TOKEN:0:20}..."
echo "Vercel Project ID: $VERCEL_PROJECT_ID"
echo "API Base URL: $NEXT_PUBLIC_API_BASE_URL"
echo ""

read -p "Proceed with setting GitHub secrets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Set GitHub secrets
echo ""
echo -e "${YELLOW}Setting GitHub Secrets...${NC}"

SECRETS=(
    "RENDER_API_KEY:$RENDER_API_KEY"
    "RENDER_BACKEND_SERVICE_ID:$RENDER_BACKEND_SERVICE_ID"
    "NEXT_PUBLIC_SUPABASE_URL:$SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:$NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "DATABASE_URL:$DATABASE_URL"
    "SUPABASE_URL:$SUPABASE_URL"
    "SUPABASE_KEY:$SUPABASE_SERVICE_KEY"
    "VERCEL_TOKEN:$VERCEL_TOKEN"
    "VERCEL_PROJECT_ID:$VERCEL_PROJECT_ID"
    "NEXT_PUBLIC_API_BASE_URL:$NEXT_PUBLIC_API_BASE_URL"
)

# Add optional secrets
if [ -n "$OPENAI_API_KEY" ]; then
    SECRETS+=("OPENAI_API_KEY:$OPENAI_API_KEY")
fi

if [ -n "$GOOGLE_API_KEY" ]; then
    SECRETS+=("GOOGLE_API_KEY:$GOOGLE_API_KEY")
fi

if [ -n "$VERCEL_ORG_ID" ]; then
    SECRETS+=("VERCEL_ORG_ID:$VERCEL_ORG_ID")
fi

if [ -n "$SLACK_WEBHOOK" ]; then
    SECRETS+=("SLACK_WEBHOOK_URL:$SLACK_WEBHOOK")
fi

# Set each secret
FAILED=0
for SECRET in "${SECRETS[@]}"; do
    IFS=':' read -r name value <<< "$SECRET"
    
    if gh secret set "$name" --body "$value" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name"
    else
        echo -e "${RED}✗${NC} $name"
        ((FAILED++))
    fi
done

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All GitHub secrets configured successfully!${NC}"
else
    echo -e "${RED}⚠ $FAILED secrets failed to set. Please try manually in GitHub Settings.${NC}"
fi

echo ""
echo "======================================"
echo -e "${YELLOW}Next Steps${NC}"
echo "======================================"
echo "1. Verify GitHub secrets:"
echo "   https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo ""
echo "2. Configure Render environment variables:"
echo "   https://dashboard.render.com/services/{SERVICE_ID}/environment"
echo ""
echo "3. Configure Vercel environment variables:"
echo "   https://vercel.com/YOUR_ORG/smart-inspection/settings/environment-variables"
echo ""
echo "4. Test the deployment:"
echo "   git commit --allow-empty -m 'test: trigger deployment'"
echo "   git push origin main"
echo ""
echo "5. Monitor the deployment:"
echo "   - GitHub Actions: https://github.com/YOUR_USERNAME/YOUR_REPO/actions"
echo "   - Render: https://dashboard.render.com/services/$RENDER_BACKEND_SERVICE_ID"
echo "   - Vercel: https://vercel.com/YOUR_ORG/smart-inspection/deployments"
echo ""
echo -e "${GREEN}Deployment setup complete!${NC}"

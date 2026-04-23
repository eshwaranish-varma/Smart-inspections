#!/bin/bash
# Smart Inspections - Health Check & Monitoring Script
# Run this periodically (via cron, GitHub Actions, etc.) to verify production health

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-https://smart-inspection-api.onrender.com}"
FRONTEND_URL="${FRONTEND_URL:-https://smart-inspection.vercel.app}"
DATABASE_URL="${DATABASE_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

# Helper function to check endpoint
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    echo -n "Checking $name... "
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$status" = "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} ($status)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (Expected $expected_code, got $status)"
        ((FAILED++))
        return 1
    fi
}

# Helper function to check database
check_database() {
    local name="$1"
    
    echo -n "Checking $name... "
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⊘${NC} (DATABASE_URL not set)"
        return 0
    fi
    
    if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (Connection failed)"
        ((FAILED++))
        return 1
    fi
}

# Helper function for Slack notifications
notify_slack() {
    local status="$1"
    local message="$2"
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        return
    fi
    
    local color="danger"
    if [ "$status" = "success" ]; then
        color="good"
    fi
    
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
            \"attachments\": [{
                \"color\": \"$color\",
                \"title\": \"Production Health Check - $status\",
                \"text\": \"$message\",
                \"ts\": $(date +%s)
            }]
        }" 2>/dev/null || true
}

echo "======================================"
echo "Smart Inspections - Production Health Check"
echo "======================================"
echo ""

# Backend checks
echo -e "${YELLOW}Backend Checks${NC}"
check_endpoint "API Health" "$BACKEND_URL/api/health"
check_endpoint "API Root" "$BACKEND_URL/api/"

# Frontend checks
echo ""
echo -e "${YELLOW}Frontend Checks${NC}"
check_endpoint "Frontend" "$FRONTEND_URL"

# Database checks
echo ""
echo -e "${YELLOW}Database Checks${NC}"
check_database "PostgreSQL Connection"

# Summary
echo ""
echo "======================================"
echo -e "${YELLOW}Summary${NC}"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASSED"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed:${NC} $FAILED"
fi
echo ""

# Determine overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    notify_slack "success" "All production services are healthy. Passed: $PASSED/3"
    exit 0
else
    echo -e "${RED}✗ Some checks failed!${NC}"
    notify_slack "failure" "Production health check failed. Passed: $PASSED/3, Failed: $FAILED"
    exit 1
fi

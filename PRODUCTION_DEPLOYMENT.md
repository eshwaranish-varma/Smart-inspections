# Production Deployment Guide: Render + Vercel + GitHub Actions

**Last Updated:** April 15, 2026  
**Tech Stack:** FastAPI (Python) | Next.js (React) | PostgreSQL | Supabase | GitHub Actions

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Render Backend Deployment](#render-backend-deployment)
4. [Vercel Frontend Deployment](#vercel-frontend-deployment)
5. [GitHub Actions CI/CD Pipeline](#github-actions-cicd-pipeline)
6. [Database Management](#database-management)
7. [Environment Variables](#environment-variables)
8. [Monitoring & Observability](#monitoring--observability)
9. [Rollback & Disaster Recovery](#rollback--disaster-recovery)
10. [Cost Optimization](#cost-optimization)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  (with GitHub Actions: test, build, deploy automation)      │
└────────────┬────────────────────────────┬────────────────────┘
             │                            │
             ▼                            ▼
    ┌─────────────────┐        ┌──────────────────┐
    │  Render.com     │        │   Vercel.com     │
    │  (Backend)      │        │  (Frontend)      │
    │  FastAPI:8000   │        │  Next.js:3000    │
    └────────┬────────┘        └────────┬─────────┘
             │                          │
             └──────────┬───────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │  Supabase PostgreSQL   │
            │  (Single shared DB)    │
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ Supabase Storage       │
            │ (for RAG data files)   │
            └────────────────────────┘
```

### Key Components

| Component | Platform | Purpose | URL |
|-----------|----------|---------|-----|
| **Backend API** | Render | FastAPI microservice with OCR, AI, citations | `https://smart-inspection-api.onrender.com` |
| **Frontend** | Vercel | Next.js GUI with workflow & dashboard | `https://smart-inspection.vercel.app` |
| **Database** | Supabase | PostgreSQL with built-in auth & storage | Connection pooler enabled |
| **CI/CD** | GitHub Actions | Automated testing, building, deployment | Triggered on `main` push |

---

## Pre-Deployment Checklist

### Phase 1: Preparation (Day 1)

- [ ] Create Supabase project (if not already done)
  ```bash
  # Get credentials from Supabase dashboard
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres
  ```

- [ ] Run database migrations
  ```bash
  # See "Database Management" section
  psql "$DATABASE_URL" < data/pipeline_logging_schema.sql
  psql "$DATABASE_URL" < data/title21_rag_paragraphs.jsonl
  ```

- [ ] Upload large RAG files to Supabase Storage
  ```bash
  # Backend will download on startup, not committed to repo
  supabase storage create rag-data
  supabase storage upload rag-data data/title21_rag_paragraphs.jsonl
  supabase storage upload rag-data data/title21_rag_section_chunks.jsonl
  ```

- [ ] Create `.env.production` (locally, never commit)
  ```bash
  # Backend vars
  ENVIRONMENT=production
  DATABASE_URL=your_supabase_pooler_url
  SUPABASE_URL=your_supabase_url
  SUPABASE_KEY=your_service_role_key
  OPENAI_API_KEY=sk-...
  GOOGLE_API_KEY=AIza...
  LLM_PROVIDER=google
  
  # Frontend vars (Vercel will use its dashboard)
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  NEXT_PUBLIC_API_BASE_URL=https://smart-inspection-api.onrender.com
  ```

- [ ] Test locally with Docker Compose
  ```bash
  docker-compose -f docker-compose.yml up -d
  # Test http://localhost:3000 and http://localhost:8000/api/health
  ```

### Phase 2: Platform Setup (Day 2)

- [ ] Create Render account & connect GitHub repo
- [ ] Create Vercel account & connect GitHub repo
- [ ] Set up GitHub Actions secrets (see below)
- [ ] Configure GitHub branch protection rules

---

## Render Backend Deployment

### Step 1: Create Web Service on Render

1. Go to [https://render.com](https://render.com) → Dashboard
2. **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:

```
Service Name:        smart-inspection-backend
Environment:         Docker
Build Command:       (leave as default - uses Dockerfile)
Start Command:       (leave as default - uses Dockerfile ENTRYPOINT)
Root Directory:      backend/
Plan:                Standard ($7/month - 0.5 CPU, 512 MB RAM)
```

### Step 2: Set Environment Variables

Go to **Environment** tab in Render dashboard and add:

```env
# Database
DATABASE_URL=postgresql://user:password@your-host:6543/postgres
DATABASE_POOLER_URL=postgresql://user:password@pooler.host:6543/postgres

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...

# AI/ML
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...
LLM_PROVIDER=google

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=["https://smart-inspection.vercel.app"]

# Workers (for Render's resource limits)
WORKERS=2
WORKER_CLASS=uvicorn.workers.UvicornWorker
MAX_REQUESTS=1000
MAX_REQUESTS_JITTER=100
```

### Step 3: Configure Auto-Deploy

1. **Settings** → **Build Command**
   ```bash
   pip install -r requirements-prod.txt
   ```

2. **Deployments** → Enable "Auto-Deploy on Push"
   - Branch: `main`
   - Auto-deploy on Push: Checked

3. **Notifications** → Slack/Email on deploy (optional)

### Step 4: Health Checks

Render automatically checks `http://localhost:10000` every 30 seconds. Ensure your FastAPI has:

```python
# backend/app/routers/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

# Include in main.py
app.include_router(router)
```

---

## Vercel Frontend Deployment

### Step 1: Create Project on Vercel

1. Go to [https://vercel.com](https://vercel.com) → Dashboard
2. **Add New** → **Project**
3. Import from Git repository
4. Configure:

```
Project Name:        smart-inspection
Framework:           Next.js
Root Directory:      frontend/
Build Command:       npm run build
Output Directory:    .next  (Next.js default)
Node Version:        18.x (LTS)
```

### Step 2: Set Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_BASE_URL=https://smart-inspection-api.onrender.com

# For CI/CD secret validation
VERCEL_TOKEN=your_vercel_token_for_api
```

### Step 3: Configure Deployment Settings

- **Production Branch:** `main`
- **Preview Branches:** `develop`, `staging`
- **Auto-deploy on push:** Enabled
- **Automatic failback:** Enabled

### Step 4: Domains & SSL

1. Add domain (if applicable)
   ```
   Domain:  smart-inspection.example.com
   SSL:     Auto (Vercel-managed)
   ```

2. Set DNS records (Vercel provides instructions)

3. **Security Headers** (already in `vercel.json`):
   ```json
   {
     "X-Content-Type-Options": "nosniff",
     "X-Frame-Options": "DENY",
     "X-XSS-Protection": "1; mode=block",
     "Strict-Transport-Security": "max-age=63072000; includeSubDomains"
   }
   ```

---

## GitHub Actions CI/CD Pipeline

### Step 1: Create Workflow Files

Create `.github/workflows/`:

**File 1: Test & Lint**  
Create `.github/workflows/test.yml` (see template below)

**File 2: Deploy Backend**  
Create `.github/workflows/deploy-backend.yml` (see template below)

**File 3: Deploy Frontend**  
Create `.github/workflows/deploy-frontend.yml` (see template below)

### Step 2: Set GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

```
RENDER_API_KEY=rnd_...
RENDER_SERVICE_ID=srv_...
SUPABASE_ACCESS_TOKEN=sbp_...
DATABASE_URL=postgresql://...
VERCEL_TOKEN=...
VERCEL_PROJECT_ID=...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
```

### Step 3: Trigger Deployments

1. **On every `main` branch push:**
   - Run tests
   - Build Docker images (if using Render native Docker)
   - Deploy to backends

2. **On PR:**
   - Run linting, type checks
   - Run unit tests
   - Skip deployment

3. **Manual trigger:**
   ```bash
   gh workflow run deploy-backend.yml --ref main
   gh workflow run deploy-frontend.yml --ref main
   ```

---

## Database Management

### Schema Migrations

```bash
# 1. Create migration (locally)
psql "$DATABASE_URL" << EOF
  -- Add new tables, columns, etc.
  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255),
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
  );
EOF

# 2. Export migration
pg_dump "$DATABASE_URL" --schema-only > data/migrations/001_audit_logs.sql

# 3. Test in staging
psql "$STAGING_DATABASE_URL" < data/migrations/001_audit_logs.sql

# 4. Commit & push (CI/CD runs on Render startup)
git add data/migrations/
git commit -m "Add audit logs table"
git push origin main
```

### Backup Strategy

**Daily automated backups via Supabase:**

1. Enable Backups in Supabase → **Settings** → **Backups**
   - Backup frequency: Daily
   - Retention: 30 days
   - Auto-restore on corruption: Yes

2. **Manual backup before major deployments:**
   ```bash
   pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   # Upload to secure location (AWS S3, Google Drive, etc.)
   ```

3. **Restore from backup:**
   ```bash
   psql "$DATABASE_URL" < backup_20260415_120000.sql
   ```

---

## Environment Variables

### Backend (Render)

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `ENVIRONMENT` | string | `production` | Yes |
| `DATABASE_URL` | URI | `postgresql://...` | Yes |
| `SUPABASE_URL` | URI | `https://xxxxx.supabase.co` | Yes |
| `SUPABASE_KEY` | string | `eyJ...` | Yes |
| `OPENAI_API_KEY` | string | `sk-...` | Optional* |
| `GOOGLE_API_KEY` | string | `AIza...` | Optional* |
| `LLM_PROVIDER` | string | `google` or `openai` | Yes |
| `LOG_LEVEL` | string | `INFO` | No |
| `CORS_ORIGINS` | JSON | `["https://smart-inspection.vercel.app"]` | Yes |
| `WORKERS` | int | `2` | No (default: 1) |

*At least one LLM API key required

### Frontend (Vercel)

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URI | `https://xxxxx.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | `eyJ...` | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | URI | `https://smart-inspection-api.onrender.com` | Yes |

**Note:** `NEXT_PUBLIC_*` variables are exposed to the browser (use only non-sensitive data)

---

## Monitoring & Observability

### 1. Error Tracking (Sentry)

**Backend setup:**
```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    environment=os.getenv("ENVIRONMENT"),
    traces_sample_rate=0.1,
)
```

**Add to Render environment:**
```
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

### 2. Logging

**Render logs:** View in Render dashboard → **Logs**
```bash
# Remote viewing
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/{SERVICE_ID}/logs
```

### 3. Performance Monitoring

**Frontend (Vercel Analytics):**
- Automatically enabled in Next.js 13+
- View at Vercel dashboard → **Analytics**

**Backend metrics:**
```python
# Add Prometheus metrics
from prometheus_client import Counter, Histogram

request_count = Counter('api_requests_total', 'Total requests', ['method', 'endpoint'])
request_duration = Histogram('api_request_duration_seconds', 'Request duration')

@app.middleware("http")
async def add_metrics(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    request_count.labels(method=request.method, endpoint=request.url.path).inc()
    request_duration.observe(duration)
    return response
```

### 4. Uptime Monitoring

Use **UptimeRobot** (free tier available):

1. Create monitors for:
   - `https://smart-inspection-api.onrender.com/api/health`
   - `https://smart-inspection.vercel.app`

2. Set alert frequency: Every 5 minutes
3. Notification channels: Slack, Email

---

## Rollback & Disaster Recovery

### Quick Rollback on Render

1. **Via Dashboard:**
   - Render dashboard → **Deployments**
   - Select previous successful deployment
   - Click **Deploy**

2. **Via CLI:**
   ```bash
   # List deployments
   curl -H "Authorization: Bearer $RENDER_API_KEY" \
     https://api.render.com/v1/services/{SERVICE_ID}/deploys
   
   # Redeploy specific version
   curl -X POST \
     -H "Authorization: Bearer $RENDER_API_KEY" \
     https://api.render.com/v1/services/{SERVICE_ID}/deploys/{DEPLOY_ID}/rollback
   ```

### Quick Rollback on Vercel

1. **Via Dashboard:**
   - Vercel dashboard → **Deployments**
   - Select previous successful deployment
   - Click **Promote to Production**

2. **Via CLI:**
   ```bash
   vercel promote --production {DEPLOYMENT_ID}
   ```

### Database Rollback

```bash
# List available backups
# (Supabase dashboard → Backups)

# Restore from specific backup
pg_restore -d "$DATABASE_URL" backup_20260415_120000.sql
```

### Incident Playbook

**If production is down:**

1. **Immediate (0-5 min):**
   - Check Render service status
   - Check Vercel status
   - Check database connection
   - View error logs

2. **Diagnosis (5-15 min):**
   ```bash
   # SSH into Render (if available)
   curl https://smart-inspection-api.onrender.com/api/health
   
   # Check database
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

3. **Recovery (15+ min):**
   - If recent code is broken: Rollback to previous deploy
   - If database is corrupted: Restore from backup
   - If external service down (e.g., Supabase): Wait & monitor

4. **Post-mortem:**
   - Document timeline
   - Update runbooks
   - Add monitoring alerts to prevent recurrence

---

## Cost Optimization

### Current Estimate (Monthly)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Render (Backend) | Standard | $7-12 | 0.5 CPU, 512 MB RAM |
| Vercel (Frontend) | Pro | $20 | Recommended for production |
| Supabase (Database) | Pro | $25 | 2 GB storage, auto-backups |
| **Total** | | **~$52-57/month** | |

### Cost Reduction Strategies

1. **Render:**
   - Use smaller instance if load is low (`Starter: $0.01/hour`)
   - Auto-scaling: Set max instances to 2-3

2. **Vercel:**
   - Hobby tier: Free, but limited to 1 concurrent build
   - Pro tier: $20/month, unlimited builds

3. **Supabase:**
   - Free tier: 500 MB storage (for development)
   - Pro tier: $25/month (recommended for production)

4. **Database Optimization:**
   - Enable connection pooling (already configured)
   - Regular vacuum & reindex (Supabase auto-runs)
   - Archive old data to cold storage

---

## Deployment Runbook

### Deploy a New Feature

1. **Locally test:**
   ```bash
   cd backend && python -m pytest tests/
   cd ../frontend && npm test
   ```

2. **Commit & push:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

3. **Monitor GitHub Actions:**
   - Watch tests pass in GitHub dashboard
   - Verify Docker build succeeds
   - Render auto-deploys on merge

4. **Verify in production:**
   ```bash
   curl https://smart-inspection-api.onrender.com/api/health
   curl https://smart-inspection.vercel.app
   ```

5. **Monitor errors (Sentry/Vercel Analytics)** for 30 min

### Rollback if Issues Found

```bash
# Revert commit
git revert {COMMIT_HASH}
git push origin main

# Or manually rollback
# (see "Rollback & Disaster Recovery" section)
```

---

## Troubleshooting

### "Database connection refused"
```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Verify Render environment variable is set
# (Render dashboard → Environment)
```

### "CORS error in browser"
```bash
# Update CORS_ORIGINS on Render
# Add your Vercel domain: ["https://smart-inspection.vercel.app"]

# Restart Render service
# (Render dashboard → Settings → Restart Service)
```

### "Large files not deployed"
```bash
# Check .dockerignore
cat backend/.dockerignore

# If RAG files needed, upload to Supabase Storage
supabase storage upload rag-data data/title21_rag_paragraphs.jsonl

# Backend downloads on startup (see app/main.py)
```

### "Deployment stuck"

1. Cancel current deployment (Render/Vercel dashboard)
2. Check GitHub Actions logs
3. Fix issue in code
4. Push again

---

## Additional Resources

- **Render Documentation:** https://render.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **FastAPI Deployment:** https://fastapi.tiangolo.com/deployment/
- **Next.js Production Checklist:** https://nextjs.org/docs/going-to-production

---

**Questions?** Review this guide, check logs, and test locally before deploying to production.

# Production Deployment Reference & Quick Start

**Status:** Ready for Production  
**Last Updated:** April 15, 2026  
**Maintained By:** DevOps Team

---

## 📊 Deployment Architecture Overview

```
GitHub Repository (main branch)
    ↓
GitHub Actions (automated CI/CD)
    ├─→ Test Suite (Python/Node)
    ├─→ Linting & Type Checks
    ├─→ Docker Build Validation
    ├─→ Security Scans
    ↓
Render (FastAPI Backend)          Vercel (Next.js Frontend)
    ↓                                    ↓
https://smart-inspection-api.onrender.com   https://smart-inspection.vercel.app
    ↓                                    ↓
    └──────────────┬──────────────┘
                   ↓
        Supabase (PostgreSQL + Storage)
```

---

## 🚀 Quick Start: First Time Setup (15 minutes)

### Step 1: Install Prerequisites
```bash
# macOS
brew install gh git node tsc

# Windows (via Chocolatey)
choco install gh git nodejs

# Ubuntu
sudo apt-get install -y gh git nodejs npm
```

### Step 2: Authenticate & Clone
```bash
# Login to GitHub
gh auth login

# Clone and setup
git clone https://github.com/YOUR_ORG/smart-inspection-main.git
cd smart-inspection-main
git checkout main
```

### Step 3: Run Automated Setup
```bash
# Make script executable (macOS/Linux)
chmod +x DEPLOYMENT_SETUP.sh

# Run setup (will prompt for credentials)
./DEPLOYMENT_SETUP.sh

# On Windows, run with bash or follow manual steps below
```

### Step 4: Verify Secrets
```bash
# List all configured secrets
gh secret list

# Should see 12+ secrets configured
```

### Step 5: Trigger First Deployment
```bash
# Push empty commit to trigger workflow
git commit --allow-empty -m "ci: trigger initial deployment"
git push origin main

# Monitor
gh run list --workflow=test.yml
gh run list --workflow=deploy-backend.yml
gh run list --workflow=deploy-frontend.yml
```

---

## 📋 Manual Setup (if DEPLOYMENT_SETUP.sh doesn't work)

### 1. Create Render Configuration

```bash
# 1. Go to https://dashboard.render.com
# 2. Click "Create a New Service"
# 3. Select "Web Service"
# 4. Connect GitHub repo
# 5. Configure:
#    Name: smart-inspection-backend
#    Runtime: Docker
#    Root Directory: backend/
#    Plan: Standard ($7/month)
# 6. Get your SERVICE_ID from URL

RENDER_SERVICE_ID="srv_xxxxx"
RENDER_API_KEY="rnd_xxxxx"  # from Account Settings
```

### 2. Create Vercel Configuration

```bash
# 1. Go to https://vercel.com
# 2. Click "Add New Project"
# 3. Import your GitHub repository
# 4. Configure:
#    Framework: Next.js
#    Root Directory: src/gui
#    Node Version: 18.x
# 5. Get your PROJECT_ID and ORG_ID

VERCEL_PROJECT_ID="prj_xxxxx"
VERCEL_ORG_ID="team_xxxxx"
VERCEL_TOKEN="vercel_xxxxxx"  # from Account Settings → Tokens
```

### 3. Configure Supabase (Database)

```bash
# 1. Create project at https://supabase.com (if not done)
# 2. Go to Project Settings → Database
# 3. Copy CONNECTION STRING (set **as pooler**)

SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJ..."  # from Project Settings → API
SUPABASE_KEY="sbp_xxxxx"    # Service Role Key
DATABASE_URL="postgresql://postgres.xxxxx:pwd@pooler.supabase.com:6543/postgres"
```

### 4. Set GitHub Secrets

```bash
# Run for each secret
gh secret set RENDER_API_KEY --body "$RENDER_API_KEY"
gh secret set RENDER_BACKEND_SERVICE_ID --body "$RENDER_SERVICE_ID"
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
gh secret set DATABASE_URL --body "$DATABASE_URL"
gh secret set SUPABASE_URL --body "$SUPABASE_URL"
gh secret set SUPABASE_KEY --body "$SUPABASE_KEY"
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "$SUPABASE_URL"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY"
gh secret set OPENAI_API_KEY --body "$OPENAI_API_KEY"
gh secret set GOOGLE_API_KEY --body "$GOOGLE_API_KEY"
```

---

## 📤 Deploy to Production

### Automated Deployment (Recommended)

```bash
# 1. Make changes locally and test
npm run dev           # Frontend
python -m pytest      # Backend tests

# 2. Commit and push
git add .
git commit -m "feat: new feature description"
git push origin main

# 3. GitHub Actions automatically:
#    - Runs tests
#    - Builds Docker images
#    - Deploys to Render & Vercel
#    - Runs health checks
#    - Notifies Slack

# 4. Monitor
gh run list --workflow=*.yml
```

### Manual Deployment (if needed)

```bash
# Render Backend
curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys

# Vercel Frontend
vercel --prod --token $VERCEL_TOKEN
```

---

## 🔍 Monitoring & Health Checks

### Real-Time Dashboards

| Service | Dashboard | Check |
|---------|-----------|-------|
| **Tests** | https://github.com/YOUR_ORG/smart-inspection/actions | Green checkmarks |
| **Backend** | https://dashboard.render.com | Service status |
| **Frontend** | https://vercel.com/smart-inspection/deployments | Deployments tab |
| **Database** | Supabase. Project Settings | CPU/Memory graphs |
| **Errors** | https://sentry.io (if configured) | Error rates |

### Manual Health Checks

```bash
# Backend
curl -X GET https://smart-inspection-api.onrender.com/api/health
# Expected: {"status": "healthy"}

# Frontend
curl -I https://smart-inspection.vercel.app
# Expected: HTTP/1.1 200 OK

# Database
psql "$DATABASE_URL" -c "SELECT NOW();"
# Expected: current timestamp

# All in one
bash HEALTH_CHECK.sh
```

---

## 🚨 Incident Response

### If Production is Down

**Immediate (0-5 minutes):**
```bash
# Check status
curl https://smart-inspection-api.onrender.com/api/health
curl https://smart-inspection.vercel.app

# View recent deployments
gh run list --limit 5

# Check GitHub Actions logs
gh run view {RUN_ID}
```

**Investigation (5-15 minutes):**
```bash
# View Render logs
# Dashboard → Services → smart-inspection-backend → Logs

# View Vercel logs
# Dashboard → smart-inspection → Deployments → select recent

# Test database
psql "$DATABASE_URL" -c "SELECT 1;"

# Check Sentry errors
# Dashboard → Issues (most recent)
```

**Recovery:**
```bash
# Option 1: Revert code
git revert {BAD_COMMIT_HASH}
git push origin main
# Wait for redeployment

# Option 2: Rollback deployment
# Render: Dashboard → Deployments → select previous → Deploy
# Vercel: Dashboard → Deployments → select previous → Promote to Production

# Option 3: Restore database backup
# (see PRODUCTION_DEPLOYMENT.md → Database Rollback)
```

---

## 📊 Deployment Timeline

Typical deployment takes:

| Stage | Time | Notes |
|-------|------|-------|
| GitHub Push | 0 sec | Code synchronized |
| Tests Run | 2-5 min | Includes Python + Node tests |
| Build Docker | 3-5 min | Cached layers speed this up |
| Render Backend Deploy | 2-10 min | Service starts on port 8000 |
| Vercel Frontend Deploy | 1-3 min | CDN propagation: up to 5 min |
| Health Checks | 1-2 min | Verify services are responding |
| **Total** | **~10-25 min** | Usually completes in < 15 min |

---

## 🔐 Security Checklist

- [ ] Never commit secrets to GitHub
- [ ] All production env vars set via GitHub Secrets
- [ ] Database password strong (>16 chars, mixed case/numbers)
- [ ] CORS origins restricted to your domains
- [ ] API keys rotated quarterly
- [ ] SSL/TLS enforced (Render + Vercel handle this)
- [ ] Backups enabled (Supabase auto-backup)
- [ ] Monitoring enabled (Sentry, UptimeRobot)
- [ ] Rate limiting configured (if needed)
- [ ] SQL injection & XSS mitigated (FastAPI + Next.js built-in)

---

## 📈 Scaling & Optimization

### If Backend Is Slow

1. **Check resource usage:**
   ```bash
   # Render dashboard → Services → Logs
   # Look for CPU/Memory spikes
   ```

2. **Optimize queries:**
   ```bash
   # Connect to database
   psql "$DATABASE_URL"
   
   # Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   ```

3. **Scale up instance:**
   ```bash
   # Render Dashboard → Services → Plan
   # Upgrade from Standard to Pro ($25/month)
   ```

4. **Add caching:**
   ```python
   # backend/app/utils/cache.py
   from functools import lru_cache
   
   @lru_cache(maxsize=256)
   def get_expensive_data(query):
       # Cached results for 1 hour
       return db.query(query)
   ```

### If Frontend Is Slow

1. **Check build size:**
   ```bash
   npm run analyze  # Requires @next/bundle-analyzer
   ```

2. **Optimize images:**
   ```bash
   # Use next/image component
   # Automatic optimization & CDN caching via Vercel
   ```

3. **Enable caching:**
   ```bash
   # Already enabled in vercel.json headers
   ```

---

## 📚 Additional Resources

| Topic | Link |
|-------|------|
| **Render Docs** | https://render.com/docs |
| **Vercel Docs** | https://vercel.com/docs |
| **Supabase Docs** | https://supabase.com/docs |
| **FastAPI Deploy** | https://fastapi.tiangolo.com/deployment |
| **Next.js Production** | https://nextjs.org/docs/going-to-production |
| **GitHub Actions** | https://docs.github.com/en/actions |
| **PostgreSQL Tuning** | https://wiki.postgresql.org/wiki/Performance_Optimization |

---

## 👥 Team & Support

- **Questions:** Check PRODUCTION_DEPLOYMENT.md for detailed guides
- **Issues:** [Create GitHub issue](https://github.com/YOUR_ORG/smart-inspection/issues)
- **On-Call:** [Link to rotation schedule]
- **Slack Channel:** #deployment-alerts

---

## ✅ Implementation Checklist

Before going live, complete these in order:

```bash
# Phase 1: Setup (Day 1)
☐ Run DEPLOYMENT_SETUP.sh
☐ Verify all 12+ secrets set
☐ Create Supabase project & get credentials
☐ Upload RAG data to Supabase Storage
☐ Test locally with docker-compose

# Phase 2: Initial Deployment (Day 2)
☐ Push to main
☐ Monitor GitHub Actions → all green
☐ Verify Render health check passing
☐ Verify Vercel deployment successful
☐ Test API endpoints manually

# Phase 3: Validation (Day 3)
☐ Load test with ~10 concurrent users
☐ Test all major workflows
☐ Verify database constraints
☐ Check error logs (Sentry)
☐ Confirm backups working

# Phase 4: Monitor (Week 1)
☐ Daily health checks passing
☐ No error spikes in Sentry
☐ Monitor database size growth
☐ Verify automated backups running
☐ Team trained on rollback procedure
```

---

**Ready to deploy? Start with:** `./DEPLOYMENT_SETUP.sh`

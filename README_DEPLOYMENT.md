# Deployment Files Structure

This document maps all deployment resources created for your production setup.

## 📁 File Organization

```
your-repo/
├── PRODUCTION_QUICK_START.md          ← START HERE (Quick setup guide)
├── PRODUCTION_DEPLOYMENT.md            ← Complete reference (detailed guide)
├── DEPLOYMENT_CHECKLIST.md             ← Before/during/after checklist
├── DEPLOYMENT_SETUP.sh                 ← Automated setup (runs once)
├── HEALTH_CHECK.sh                     ← Manual health monitoring
├── DOCKER_OPTIMIZATIONS.md             ← Docker best practices & configs
├── backend/
│   ├── Dockerfile.prod                 ← Optimized production build
│   ├── requirements-prod.txt           ← Production dependencies (MUST USE)
│   └── app/
│       ├── main.py                     ← Must have /api/health endpoint
│       └── ...
├── frontend/
│   ├── Dockerfile.prod                 ← Optimized production build
│   ├── vercel.json                     ← Security headers (already configured)
│   └── package.json
├── docker/
│   ├── nginx/
│   │   └── nginx.conf                  ← CORS & routing (update if needed)
│   └── ...
└── .github/
    └── workflows/
        ├── test.yml                    ← Runs on every push (tests & security scans)
        ├── health-check.yml            ← Runs every 30 min (monitors uptime)
        ├── deploy-backend.yml          ← Auto-deploys backend to Render
        └── deploy-frontend.yml         ← Auto-deploys frontend to Vercel
```

---

## 📖 Reading Guide (Choose Your Path)

### 🟢 Path 1: First Time Setup (Complete Beginner)
1. Read: [PRODUCTION_QUICK_START.md](PRODUCTION_QUICK_START.md) (5 min)
2. Run: `./DEPLOYMENT_SETUP.sh` (5 min)
3. Verify: Check GitHub Secrets
4. Deploy: `git push origin main` (15 min)

### 🟡 Path 2: Detailed Understanding (Intermediate)
1. Read: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) (20 min overview)
2. Read: [DOCKER_OPTIMIZATIONS.md](DOCKER_OPTIMIZATIONS.md) (understand Docker setup)
3. Review: [.github/workflows/](../.github/workflows/) (understand CI/CD)
4. Run: `./DEPLOYMENT_SETUP.sh` (5 min)
5. Deploy: Push to main branch

### 🔴 Path 3: Production Maintenance (Operations)
- Daily: Use [HEALTH_CHECK.sh](HEALTH_CHECK.sh)
- Before deployment: Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- During outage: Follow incident playbook in [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#rollback--disaster-recovery)
- Monitoring: Check dashboards in [PRODUCTION_QUICK_START.md](PRODUCTION_QUICK_START.md#monitoring--health-checks)

---

## 🔧 Configuration Files Reference

### GitHub Actions Workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| `test.yml` | Every push (main/develop) | Tests, linting, security scans | 5-10 min |
| `deploy-backend.yml` | Push to main (backend/* changes) | Deploy to Render, run health checks | 15-25 min |
| `deploy-frontend.yml` | Push to main (frontend/* changes) | Deploy to Vercel, run health checks | 5-10 min |
| `health-check.yml` | Every 30 min (scheduled) | Monitor uptime, send Slack alerts | 2-3 min |

### Docker Files

| File | Purpose | Use When |
|------|---------|----------|
| `backend/Dockerfile.prod` | Optimized backend image | Using Render or Docker deployment |
| `frontend/Dockerfile.prod` | Optimized frontend image | Using Docker Compose locally |
| `docker-compose.prod.yml` | (in DOCKER_OPTIMIZATIONS.md) | Running entire stack locally |

### Configuration & Scripts

| File | Purpose | When to Use |
|------|---------|-------------|
| `DEPLOYMENT_SETUP.sh` | One-time GitHub secret setup | First time setup only |
| `HEALTH_CHECK.sh` | Manual health monitoring | On-call troubleshooting |
| `vercel.json` | Vercel config (security headers) | Already configured, don't change |
| `.env.production` | Environment variables template | Reference only (use GitHub Secrets) |

---

## ⚙️ GitHub Secrets Required

All these must be set via: `gh secret set NAME --body VALUE`

### From Render
```
RENDER_API_KEY               # Get from https://dashboard.render.com/account
RENDER_BACKEND_SERVICE_ID    # Found in service URL: services/{ID}
```

### From Supabase
```
SUPABASE_URL                      # https://xxxxx.supabase.co
SUPABASE_KEY                      # Service Role Key (backend only)
NEXT_PUBLIC_SUPABASE_URL          # Same as SUPABASE_URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Anon/Publishable Key (frontend)
DATABASE_URL                      # postgresql://... (with pooler)
```

### From Vercel
```
VERCEL_TOKEN                 # https://vercel.com/account/tokens
VERCEL_PROJECT_ID          # From Vercel dashboard
VERCEL_ORG_ID              # Optional, only for team accounts
```

### API Keys
```
OPENAI_API_KEY             # sk-... (optional, if using OpenAI)
GOOGLE_API_KEY             # AIza... (optional, if using Google Gemini)
```

### Optional
```
SLACK_WEBHOOK_URL          # For deployment notifications
```

---

## 🚀 Deployment Flow (What Happens When You Push)

```
$ git push origin main
  ↓
1. GitHub detects push to main
  ↓
2. test.yml runs IMMEDIATELY
   - Python tests
   - Node tests
   - Linting/type checks
   - Security scans
   ↓ (if all pass)
3. deploy-backend.yml runs
   - Triggers Render deployment
   - Waits for service to be healthy
   - Notifies Slack
   ↓ (parallel with above)
4. deploy-frontend.yml runs
   - Triggers Vercel deployment
   - Checks if frontend is responding
   - Notifies Slack
   ↓ (in background)
5. health-check.yml (every 30 min)
   - Continuously monitors uptime
   - Alerts if any service down
```

**Total time:** ~15-25 minutes

---

## 📋 Checklists by Person

### For Developers
- [ ] Run `npm run dev` / `python -m pytest` before pushing
- [ ] Push to `develop` branch first (not main)
- [ ] Create PR and wait for tests to pass
- [ ] Merge to `main` when approved
- [ ] GitHub Actions automatically deploys

### For DevOps/Operations
- [ ] Run `./DEPLOYMENT_SETUP.sh` once during onboarding
- [ ] Monitor health checks daily (or set up Slack alerts)
- [ ] Have `PRODUCTION_DEPLOYMENT.md` bookmarked
- [ ] Know the rollback procedure (5 minutes)
- [ ] Keep on-call schedule updated

### For SRE/Incident Response
- [ ] Know the [incident playbook](PRODUCTION_DEPLOYMENT.md#incident-playbook)
- [ ] Have access to all dashboards (Render, Vercel, Sentry)
- [ ] Understand database backup/restore process
- [ ] Can rollback in < 5 minutes
- [ ] Document all incidents

---

## 🔍 Verification Steps (Test Your Setup)

### Verify CI/CD Pipeline
```bash
# 1. Check workflows exist
ls -la .github/workflows/

# 2. Verify all secrets set
gh secret list
# Should show 12+ secrets

# 3. Trigger test workflow manually
gh workflow run test.yml --ref main

# 4. Create test commit
git commit --allow-empty -m "test: verify CI/CD"
git push origin main

# 5. Monitor in GitHub
gh run list
gh run view {RUN_ID}
```

### Verify Deployments Work
```bash
# 1. Check deployment endpoints
curl https://smart-inspection-api.onrender.com/api/health
curl https://smart-inspection.vercel.app

# 2. Run health check script
bash HEALTH_CHECK.sh

# 3. Check logs
# Render: https://dashboard.render.com/services/{ID}/logs
# Vercel: https://vercel.com/dashboard/deployments
```

### Verify Database
```bash
# 1. Test connection
psql "$DATABASE_URL" -c "SELECT NOW();"

# 2. List tables
psql "$DATABASE_URL" -c "\dt"

# 3. Check backups
# Supabase dashboard → Backups
```

---

## 🚨 If Something Goes Wrong

### Tests Failing
```bash
# 1. Check the error
gh run view {RUN_ID} --log

# 2. Fix locally
git checkout develop  # or fix branch
# ... make fixes ...
git push origin develop

# 3. Create PR and wait for tests
gh pr create --fill
```

### Backend Won't Deploy
```bash
# 1. Check Render logs
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/{ID}/logs | tail -20

# 2. Check environment variables
# https://dashboard.render.com/services/{ID}/environment

# 3. Restart service
# Dashboard → Settings → Restart Service
```

### Frontend Won't Deploy
```bash
# 1. Check Vercel logs
vercel logs -f smart-inspection-frontend

# 2. Check build command succeeds locally
cd frontend && npm run build

# 3. Check environment variables
# https://vercel.com/smart-inspection/settings/environment-variables
```

### Database Connection Fails
```bash
# 1. Verify DATABASE_URL format
echo $DATABASE_URL

# 2. Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# 3. Check connection pooler is enabled
# Supabase → Settings → Database → Connection Pooler
```

---

## 📚 Quick Reference Links

| Resource | URL |
|----------|-----|
| **Render Dashboard** | https://dashboard.render.com |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **GitHub Actions** | https://github.com/YOUR_ORG/smart-inspection/actions |
| **GitHub Secrets** | https://github.com/YOUR_ORG/smart-inspection/settings/secrets/actions |
| **Render Docs** | https://render.com/docs |
| **Vercel Docs** | https://vercel.com/docs |
| **Supabase Docs** | https://supabase.com/docs |

---

## 💡 Tips & Best Practices

✅ **Do:**
- Test locally before pushing to main
- Use small, focused commits
- Monitor deployments in real-time
- Keep backups of critical data
- Document all production changes
- Have a runbook for common issues

❌ **Don't:**
- Push directly to main (use develop branch & PRs)
- Commit secrets to GitHub
- Skip the health checks
- Deploy during peak usage hours
- Make untested database changes
- Ignore error alerts

---

## 🎓 Learning Resources

- **First time?** Start with [PRODUCTION_QUICK_START.md](PRODUCTION_QUICK_START.md)
- **Want deep dive?** Read [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- **Docker questions?** See [DOCKER_OPTIMIZATIONS.md](DOCKER_OPTIMIZATIONS.md)
- **During deployment?** Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Incident?** Open [incident playbook](PRODUCTION_DEPLOYMENT.md#incident-playbook)

---

**Last Updated:** April 15, 2026  
**Maintainer:** DevOps Team  
**Questions?** Create an issue or slack #deployment-alerts

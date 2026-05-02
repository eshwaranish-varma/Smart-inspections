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
├── src/
│   └── gui/
│       ├── Dockerfile                  ← Frontend container build
│       ├── package.json                ← Next.js frontend package manifest
│       └── next.config.js              ← Frontend runtime/build config
├── docker/
│   ├── nginx/
│   │   └── nginx.conf                  ← CORS & routing (update if needed)
│   └── ...
└── .github/
    └── workflows/
        ├── test.yml                    ← Runs on every push (tests & security scans)
        ├── health-check.yml            ← Runs every 30 min (monitors uptime)
        ├── deploy-backend.yml          ← Backend deployment workflow (align to your DigitalOcean setup)
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
| `deploy-backend.yml` | Push to main (backend/* changes) | Deploy backend, run health checks | 15-25 min |
| `deploy-frontend.yml` | Push to main (`src/gui/*` changes) | Deploy to Vercel, run health checks | 5-10 min |
| `health-check.yml` | Every 30 min (scheduled) | Monitor uptime, send Slack alerts | 2-3 min |

### Docker Files

| File | Purpose | Use When |
|------|---------|----------|
| `backend/Dockerfile.prod` | Optimized backend image | Using DigitalOcean or Docker deployment |
| `src/gui/Dockerfile` | Frontend image definition | Using Docker Compose locally |
| `docker-compose.prod.yml` | (in DOCKER_OPTIMIZATIONS.md) | Running entire stack locally |

### Configuration & Scripts

| File | Purpose | When to Use |
|------|---------|-------------|
| `DEPLOYMENT_SETUP.sh` | One-time GitHub secret setup | First time setup only |
| `HEALTH_CHECK.sh` | Manual health monitoring | On-call troubleshooting |
| *(root `vercel.json` removed)* | — | A legacy `builds`-only `vercel.json` at the repo root caused **empty** Vercel builds (`vercel build` in ~200ms, no `next build`). Use **Root Directory** `src/gui` and a normal Next.js build; do not reintroduce `version: 2` / `builds` config unless you use current Vercel monorepo docs. |
| `.env.production` | Environment variables template | Reference only (use GitHub Secrets) |

---

## ⚙️ GitHub Secrets Required

All these must be set via: `gh secret set NAME --body VALUE`

### Backend hosting
```
# Backend deployment secrets depend on your DigitalOcean setup.
# Keep backend host/domain values aligned with your live DigitalOcean API URL.
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
VERCEL_ORG_ID              # Required by this CI workflow together with VERCEL_PROJECT_ID
```

### Frontend runtime
```
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon/publishable key
NEXT_PUBLIC_API_URL           # Public backend base URL used by the Next.js app
DATABASE_URL                  # PostgreSQL connection string used by server routes
JWT_SECRET                    # JWT signing secret for server-side auth flows
DATABASE_DIRECT_URL           # Optional direct Postgres URL if used in your environment
BACKEND_API_URL               # Optional server-side backend origin for Next.js route handlers
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
   - Triggers backend deployment
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
- [ ] Have access to all dashboards (DigitalOcean, Vercel, Sentry)
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
curl https://your-digitalocean-backend.example.com/api/health
curl https://smart-inspection.vercel.app

# 2. Run health check script
bash HEALTH_CHECK.sh

# 3. Check logs
# Backend hosting logs: DigitalOcean dashboard or your backend host logs
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

## Hostinger Coolify VPS Deployment

This is the recommended layout if you want to run both app services on a Hostinger VPS with Coolify while keeping Supabase on Supabase's hosted cloud platform. Do not install PostgreSQL on the VPS for this setup; Coolify only runs the frontend and backend containers/apps.

The simplest production layout is two Coolify applications from the same Git repository:

```text
Hostinger VPS + Coolify
├─ Frontend: https://app.yourdomain.com  -> src/gui, port 3000
└─ Backend:  https://api.yourdomain.com  -> backend, port 8000

Supabase Cloud / hosted platform
└─ Database: external DATABASE_URL
```

Use two domains/subdomains first. It avoids reverse-proxy ambiguity between Next.js route handlers and FastAPI routes, and it makes CORS easier to reason about.

### Readiness Notes

- Frontend source is `src/gui`; do not point Coolify at `frontend`.
- The frontend package file is `src/gui/package.json`.
- The backend API base must be configured without a trailing `/api`; the frontend helper appends `/api`.
- Supabase is external on Supabase Cloud; do not create a Coolify/Postgres database unless you intentionally migrate away from Supabase.
- The root `vercel.json` is intentionally absent; Coolify should build the service from each app root.

### Hostinger VPS Prerequisites

1. Create a Hostinger VPS with at least 2 vCPU / 4 GB RAM for this app. Use more RAM if OCR, PDF parsing, or AI/RAG workloads are heavy.
2. Point DNS records to the VPS:
   ```text
   app.yourdomain.com  A  <VPS_PUBLIC_IP>
   api.yourdomain.com  A  <VPS_PUBLIC_IP>
   ```
3. Install Coolify on the VPS using the official Coolify installer.
4. Connect Coolify to GitHub so it can pull this repository.
5. Keep the Supabase project on Supabase Cloud and copy its connection values into Coolify environment variables.

### Supabase Cloud Values

Use the Supabase dashboard to collect these values before creating the Coolify apps:

```text
Project URL:       https://vqelqlrstwrqkhqbwmwh.supabase.co
Anon/Publishable:  used only by the frontend as NEXT_PUBLIC_SUPABASE_ANON_KEY
Service role key:  used only by the backend as SUPABASE_KEY
Database URL:      used by both services as DATABASE_URL
```

Use a pooled Supabase Postgres connection string for `DATABASE_URL` when possible. Keep `sslmode=require` if Supabase provides or requires it.

### Backend Application

Create a new Coolify application from the same repository.

```text
Name: smart-inspections-backend
Source: GitHub repository
Branch: main
Base Directory / Root Directory: backend
Build Pack: Dockerfile if detected, otherwise Nixpacks/Python
Port: 8000
Domain: https://api.yourdomain.com
Health Check Path: /api/health
```

If Coolify uses Nixpacks/Python instead of a Dockerfile, use:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend environment variables:

```env
ENVIRONMENT=production
DATABASE_URL=your_supabase_cloud_postgres_connection_string
SUPABASE_URL=https://vqelqlrstwrqkhqbwmwh.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
JWT_SECRET=your_long_random_jwt_secret
CORS_ORIGINS=https://app.yourdomain.com,http://localhost:3000
OPENAI_API_KEY=your_openai_key_if_used
GOOGLE_API_KEY=your_google_key_if_used
LLM_PROVIDER=openai
```

Notes:

- `SUPABASE_KEY` must be the service role key and must stay backend-only.
- `CORS_ORIGINS` must include the exact frontend origin, including `https://`.
- If the backend logs show database connection errors, verify the Supabase pooler connection string and SSL settings.

### Frontend Application

Create a second Coolify application from the same repository.

```text
Name: smart-inspections-frontend
Source: GitHub repository
Branch: main
Base Directory / Root Directory: src/gui
Build Pack: Dockerfile if detected, otherwise Nixpacks/Node
Port: 3000
Domain: https://app.yourdomain.com
```

If Coolify uses Nixpacks/Node instead of a Dockerfile, use:

```bash
npm ci
npm run build
```

Start command:

```bash
npm start
```

Frontend environment variables:

```env
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
BACKEND_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://vqelqlrstwrqkhqbwmwh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
DATABASE_URL=your_supabase_cloud_postgres_connection_string
JWT_SECRET=your_long_random_jwt_secret
```

Notes:

- `NEXT_PUBLIC_API_URL` is exposed to the browser and should be the public backend origin.
- `BACKEND_API_URL` is used by server-side Next.js code and should usually match `NEXT_PUBLIC_API_URL` in Coolify.
- `DATABASE_URL` should point to Supabase Cloud, not to a database on the Hostinger VPS.
- Do not set `NEXT_PUBLIC_API_URL` to the frontend domain unless you intentionally build a single-domain reverse-proxy setup.
- Do not include `/api` in `NEXT_PUBLIC_API_URL` or `BACKEND_API_URL`.

### Optional Single-Domain Setup

Only use this after the two-domain setup works. A single-domain setup requires proxy rules equivalent to:

```text
/api/observations -> FastAPI backend
/api/ai           -> FastAPI backend
/api/documents    -> FastAPI backend
/api/ocr          -> FastAPI backend
/api/library      -> FastAPI backend
/api/citations    -> FastAPI backend
/api/references   -> FastAPI backend
/api/health       -> FastAPI backend
/api/eval         -> FastAPI backend
/api/evaluation   -> FastAPI backend
everything else   -> Next.js frontend
```

For a single domain, set:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
BACKEND_API_URL=http://smart-inspections-backend:8000
CORS_ORIGINS=https://yourdomain.com
```

Prefer two domains unless you are comfortable maintaining route-level proxy rules.

### Deployment Order

1. Deploy the backend first.
2. Open `https://api.yourdomain.com/api/health`.
3. Confirm it returns JSON similar to:
   ```json
   {"status":"healthy","kb_loaded":true}
   ```
4. Deploy the frontend.
5. Open `https://app.yourdomain.com`.
6. Confirm the dashboard no longer shows "Unable to reach the backend API."

### Verification Commands

Run these from your machine after Coolify deploys:

```bash
curl -i https://api.yourdomain.com/api/health
curl -i -X OPTIONS "https://api.yourdomain.com/api/health" \
  -H "Origin: https://app.yourdomain.com" \
  -H "Access-Control-Request-Method: GET"
curl -I https://app.yourdomain.com
```

Expected results:

- Backend health returns `200`.
- CORS preflight returns `200` or `204`, not `400 Disallowed CORS origin`.
- Frontend returns `200`, `307`, or `308` depending on auth/domain redirects.

### Troubleshooting

If the frontend calls its own `/api/health` and gets `404`, `NEXT_PUBLIC_API_URL` was missing or wrong when the frontend was built. Fix the env var and redeploy the frontend.

If the browser shows a CORS error, add the frontend domain to backend `CORS_ORIGINS` and redeploy the backend.

If Coolify says the frontend cannot find `package.json`, the frontend root directory is wrong. It must be `src/gui`.

If the backend starts but AI/OCR features fail, check the backend logs for missing `OPENAI_API_KEY`, `GOOGLE_API_KEY`, data path, or OCR dependency messages.

If database-backed pages fail but Supabase is healthy, verify both apps use the same `DATABASE_URL` and that the connection string is valid from the VPS.

### Coolify Go-Live Checklist

- [ ] DNS records point `app.yourdomain.com` and `api.yourdomain.com` to the VPS.
- [ ] Coolify HTTPS certificates are issued for both domains.
- [ ] Supabase remains hosted on Supabase Cloud; no Postgres service is created on the Hostinger VPS.
- [ ] Backend root directory is `backend`.
- [ ] Frontend root directory is `src/gui`.
- [ ] Backend health check path is `/api/health`.
- [ ] Frontend `NEXT_PUBLIC_API_URL` is `https://api.yourdomain.com`.
- [ ] Backend `CORS_ORIGINS` includes `https://app.yourdomain.com`.
- [ ] Supabase `DATABASE_URL`, `SUPABASE_URL`, and keys are set in the correct services.
- [ ] Service role key is only present on the backend.
- [ ] Dashboard loads without the backend API error.

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
# 1. Check backend logs in DigitalOcean
# 2. Check backend environment variables in DigitalOcean
# 3. Restart the backend service from your DigitalOcean control plane if needed
```

### Frontend Won't Deploy
```bash
# 1. Check Vercel logs
vercel logs -f smart-inspection-frontend

# 2. Check build command succeeds locally
cd src/gui && npm run build

# 3. Check environment variables
# https://vercel.com/smart-inspection/settings/environment-variables
```

**Vercel Root Directory and this repo (important)**  
The Next.js app lives in **`src/gui`** (the only `package.json` for the frontend). **Set Root Directory to `src/gui`**, **Framework** Next.js, default install/build. Do not add a root `vercel.json` with legacy `builds` — it can produce empty deploys and **404** on the production domain.

| Approach | Vercel → Project → General → *Root Directory* | Notes |
|----------|----------------------------------------------|--------|
| **Recommended** | `src/gui` | Vercel runs `npm install` and `next build` here. **Production** build logs should show a full Next.js build (minutes), not a sub-second `vercel build` with no output. |
| **Not recommended** | Empty (repo root) | Would require a valid modern monorepo setup; the previous root `vercel.json` with only `builds` was **removed** because it no longer produced a real app output on current Vercel. |

**Symptom: `404 NOT_FOUND` / `Code: NOT_FOUND` on `*.vercel.app` with `X-Vercel-Error: NOT_FOUND` (and build logs show no real `npm install` or `next build`)**  
The deployment is **Ready** but no app was built—usually **Root Directory** is `.` while the Next app only lives under `src/gui`. **Fix:** set **Settings → General → Root Directory** to **`src/gui`**, save, then **Redeploy** the latest production deployment. Confirm new build logs show `Installing dependencies` and `next build`.

**Error: *The specified Root Directory "src/gui" does not exist***  
Vercel read your Git deployment and did **not** find a `src/gui` path at the repository root. **Fix (pick one):**

1. **Use repository root (only if you have a different monorepo config)**  
   - **Settings → General → Root Directory** → clear it (use **Repository Root**), save, redeploy. (This repo no longer ships a root `vercel.json`; prefer **Root Directory = `src/gui`**.)  
2. **Keep Root Directory = `src/gui` only if the path really exists in Git**  
   - In the browser, open the same repo/branch that Vercel uses and confirm `src/gui` is present.  
   - If you use a different branch for production, switch Vercel’s **Production Branch** to one that includes `src/gui`, or merge your code.  
   - Fix **folder name casing** if the remote uses e.g. `Src` vs `src` (Vercel runs Linux; mismatches from Windows are a common cause).  
3. **Confirm the Vercel project is linked to the monorepo** that actually contains the frontend, not a fork or a repo that only has `backend/`.

**If the build fails** with `ENOENT: ... routes-manifest-deterministic.json` (or `routes-manifest.json`) under `/vercel/path0/.next/`: the deployment root and the Next build output are misaligned, or the Vercel/Next integration is out of date. Try: redeploy **without** build cache; set **Root Directory** as in the table above so `next build` runs where `package.json` lives; do not pin an old Vercel CLI in project/env. This repo pins **Next.js 16.1.7** in `src/gui/package.json` for a stable Vercel deploy; to try a newer Next line, run `npm run build` in `src/gui` locally and re-test on a preview deploy first.

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
| **DigitalOcean Dashboard** | https://cloud.digitalocean.com |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **GitHub Actions** | https://github.com/YOUR_ORG/smart-inspection/actions |
| **GitHub Secrets** | https://github.com/YOUR_ORG/smart-inspection/settings/secrets/actions |
| **DigitalOcean Docs** | https://docs.digitalocean.com |
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

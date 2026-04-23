# Quick Deployment Checklist

## Pre-Deployment (1-2 days before)

- [ ] All tests passing locally and in CI
- [ ] Database schema migrations tested in staging
- [ ] Large RAG files uploaded to Supabase Storage
- [ ] Environment variables configured on Render & Vercel
- [ ] Backup of current production database taken
- [ ] Team notified of deployment window
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured (Sentry, UptimeRobot)

## Deployment Day

### 1 Hour Before

- [ ] Final code review complete
- [ ] No critical bugs in develop/staging
- [ ] Team leads standing by
- [ ] Monitoring dashboards open
- [ ] Slack notifications enabled

### Deployment

**Push to main:**
```bash
git pull origin develop
git push origin main
```

**Monitor:**
- [ ] GitHub Actions tests passing (5-10 min)
- [ ] Render deployment progressing (5-15 min)
- [ ] Vercel deployment progressing (3-5 min)
- [ ] Backend health check passing
- [ ] Frontend responding

**Verify:**
```bash
# Test backend
curl https://smart-inspection-api.onrender.com/api/health

# Test frontend
curl https://smart-inspection.vercel.app

# Check logs
# Render: https://dashboard.render.com/services/{ID}
# Vercel: https://vercel.com/dashboard/deployments
```

### Post-Deployment (30 min)

- [ ] No error spikes in Sentry
- [ ] User reports no issues
- [ ] Performance metrics normal
- [ ] Database queries performing well
- [ ] Update change log & team
- [ ] Document any issues encountered

## Rollback Procedure

If issues detected within 1 hour:

**Option 1: Revert code**
```bash
git revert {COMMIT_HASH}
git push origin main
# Wait for redeployment
```

**Option 2: Rollback to previous deployment**

**Render:**
1. https://dashboard.render.com/services/{ID}/deploys
2. Select previous version → "Deploy"

**Vercel:**
1. https://vercel.com/dashboard/deployments
2. Select previous → "Promote to Production"

## Post-Incident

- [ ] Incident report written
- [ ] Root cause identified
- [ ] Fix implemented or workaround applied
- [ ] Monitoring/testing improved to prevent recurrence
- [ ] Team debriefing held

---

## Emergency Contacts

- Backend Lead: [Name] - [Slack]
- Frontend Lead: [Name] - [Slack]
- DevOps: [Name] - [Slack]

**On-call rotation:** [Link to schedule]

---

## Useful Commands

```bash
# View deployment logs
gh run list --workflow=deploy-backend.yml

# Manually trigger deployment
gh workflow run deploy-backend.yml --ref main

# Check Render status
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/{SERVICE_ID}/deploys

# Test database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Verify API response
curl -i https://smart-inspection-api.onrender.com/api/health

# Check frontend build logs
vercel logs -f smart-inspection-frontend
```

---

## Common Issues & Quick Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| Backend not responding | App logs on Render | Restart service, check env vars |
| Database connection error | DATABASE_URL set? | Verify pooler URL is correct |
| CORS error in browser | CORS_ORIGINS in env | Add Vercel domain to allowed origins |
| Large files missing | .dockerignore | Upload to Supabase Storage |
| Slow deployment | Build logs | Check for dependency install delays |
| Memory limit exceeded | Render logs | Optimize code or upgrade instance |


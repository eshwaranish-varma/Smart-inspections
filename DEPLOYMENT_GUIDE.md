# Deployment Guide: Render + Vercel (Next.js)

## 📋 Overview
- **Backend**: Render.io (Python/FastAPI)
- **Frontend**: Vercel (Next.js app in `src/gui`)
- **Database**: PostgreSQL (Render or external, e.g. Supabase)
- **Storage**: Supabase Storage (optional)
- **Large Data**: To be stored externally (see Data Management)

---

Repository root `vercel.json` runs `npm install` and `npm run build` inside **`src/gui`**. In the Vercel project you can instead set **Root Directory** to `src/gui` and use the default Next.js build (then root `vercel.json` build commands can be simplified or removed).

## 🚀 Quick Deployment Steps

### Step 1: Prepare Backend for Render

**1.1 Update render.yaml to use production requirements:**

```yaml
services:
  - type: web
    name: smart-inspection-backend
    runtime: python
    rootDir: backend/
    buildCommand: pip install -r requirements-prod.txt
    startCommand: >
      gunicorn app.main:app 
      --workers 1 
      --worker-class uvicorn.workers.UvicornWorker 
      --bind 0.0.0.0:10000 
      --timeout 120 
      --preload
```

**1.2 Verify .dockerignore excludes large files:**
- ✅ Exclude: `/data`, `/artifacts`, `/notebooks`
- ✅ Exclude: Development dependencies
- ✅ Include: Only `backend/app` and required files

**1.3 Push to GitHub/GitLab:**
```bash
git add .
git commit -m "Optimize for Render deployment"
git push origin main
```

---

### Step 2: Deploy Backend on Render

1. Log in to [Render.io](https://render.com)
2. **New → Web Service**
3. Connect your repository
4. Configure:
   - **Name**: `smart-inspection-backend`
   - **Runtime**: Python
   - **Root Directory**: `backend/`
   - **Build Command**: `pip install -r requirements-prod.txt`
   - **Start Command**: Use the command above
   - **Instance Type**: Standard (512 MB) ✅ Now sufficient after cleanup
5. Set Environment Variables:
   - `ENVIRONMENT`: production
   - `DATABASE_URL`: Your PostgreSQL connection
   - `DATABASE_POOLER_URL`: PgBouncer pool URL
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase API key
   - `OPENAI_API_KEY`: Your OpenAI secret
   - `GOOGLE_API_KEY`: Your Google API key
   - `LLM_PROVIDER`: google
   - `CORS_ORIGINS`: `["https://your-frontend1.vercel.app", "https://your-frontend2.vercel.app"]`
6. **Deploy**

---

### Step 3: Deploy Next.js on Vercel

1. Log in to [Vercel](https://vercel.com)
2. **Add New Project** → import this repository
3. **Framework preset**: Next.js (auto-detected when Root Directory is `src/gui`)
4. **Root Directory**: `src/gui` (recommended), *or* leave repo root and keep root `vercel.json` `installCommand` / `buildCommand`
5. **Environment variables** (minimum; match `.env.example` and production URLs):
   - `DATABASE_URL` — Postgres (e.g. Supabase)
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `BACKEND_API_URL` — your Render FastAPI origin (e.g. `https://your-backend.onrender.com`) for server-side route handlers
   - Optional: `NEXT_PUBLIC_API_URL` if the browser must call FastAPI on a different host
   - Optional: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key) for Supabase client refresh
6. In **Render**, set `CORS_ORIGINS` to include your Vercel origin
7. **Deploy**

---

## 📊 Data Management Strategy

### Problem: Large Files Prevent Deployment
- `data/title21_rag_paragraphs.jsonl`: 50 MB
- `data/title21_rag_section_chunks.jsonl`: 29 MB
- PDF files: 25 MB each
- **Total**: ~175 MB (exceeds Render limits)

### Solution: External Storage

#### Option A: Supabase Storage (⭐ Recommended)
```python
# backend/app/services/data_loader.py
from supabase import create_client

supabase = create_client(
    supabase_url=os.getenv("SUPABASE_URL"),
    supabase_key=os.getenv("SUPABASE_KEY")
)

# On startup, download RAG data from Supabase Storage
def load_rag_data():
    # Download to temporary storage
    response = supabase.storage.from_("rag-data").download("title21_rag_paragraphs.jsonl")
    # Cache in memory or temp file
    return response
```

**Setup steps:**
1. Create bucket: `str_rag-data`
2. Upload files:
   ```bash
   supabase storage upload rag-data data/title21_rag_paragraphs.jsonl
   supabase storage upload rag-data data/title21_rag_section_chunks.jsonl
   ```

#### Option B: AWS S3
```python
import boto3

s3 = boto3.client('s3')
s3.download_file('your-bucket', 'title21_rag_paragraphs.jsonl', '/tmp/data.jsonl')
```

#### Option C: Keep data/ but .gitignore it (local development only)
```bash
# .gitignore
data/title21_rag_paragraphs.jsonl
data/title21_rag_section_chunks.jsonl
data/raw/*.pdf
```

---

## ✅ Verification Checklist

- [ ] `backend/.dockerignore` excludes `/data`, `/artifacts`
- [ ] `backend/requirements-prod.txt` created and tested locally
- [ ] Vercel project Root Directory is `src/gui` (or root `vercel.json` build commands are correct)
- [ ] `vercel.json` created with correct settings
- [ ] Environment variables configured in Render & Vercel
- [ ] Backend deployed and `/health` endpoint returns 200
- [ ] Frontends deployed and load successfully
- [ ] CORS headers configured correctly for frontend origins
- [ ] Database migrations applied
- [ ] RAG data loaded from external storage

---

## 🔧 Troubleshooting

### "Memory Limit Exceeded (512 MB)"
- ✅ Verify `.dockerignore` is excluding `/data`, `/artifacts`
- ✅ Check requirements-prod.txt doesn't include dev packages
- ✅ Use `docker build` locally to test size

### "Frontend can't reach backend"
- Check `CORS_ORIGINS` in Render environment
- Verify `BACKEND_API_URL` / `NEXT_PUBLIC_API_URL` and Render URL match your deployment
- Check Render logs: `render.com → Dashboard → Logs`

### "RAG data not loading"
- Implement data loading from Supabase or S3 (see above)
- Test locally before deploying
- Add logging: `logger.info(f"Loading RAG data from {source}")`

---

## 📡 Environment URLs

Update these in Vercel and Render:

```
Backend: https://smart-inspection-backend.onrender.com
Frontend: https://your-app.vercel.app

CORS Policy:
  - Allow: your Vercel frontend origin
  - Allow: GitHub Actions (CI/CD)
```

---

## 🚨 Important Notes

1. **Don't commit large data files** to git (use .gitignore)
2. **Use environment variables** for all secrets (API keys, DB URLs)
3. **Test locally** with `docker build -f Dockerfile.prod .` before deploying
4. **Monitor Render logs** after first deployment for startup issues
5. **Set up SSL/HTTPS** automatically (both Render and Vercel provide this)

---

## Schedule Recommended Actions

1. **Week 1**: Setup Supabase Storage, migrate data
2. **Week 2**: Deploy backend to Render, verify health check
3. **Week 3**: Deploy Next.js frontend to Vercel
4. **Week 4**: Load testing and optimization


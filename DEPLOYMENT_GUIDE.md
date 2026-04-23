# Deployment Guide: Render + Vercel Multi-Frontend Setup

## 📋 Overview
- **Backend**: Render.io (Python/FastAPI)
- **Frontend1**: Vercel 
- **Frontend2**: Vercel
- **Database**: PostgreSQL (Render or external)
- **Storage**: Supabase Storage
- **Large Data**: To be stored externally (see Data Management)

---

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

### Step 3: Deploy Frontends on Vercel

**3.1 Frontend 1 Setup:**

1. Log in to [Vercel](https://vercel.com)
2. **Add New Project**
3. Import from Git (select your repo)
4. **Framework**: Vite
5. **Root Directory**: `frontend/`
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`
8. Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-backend.onrender.com
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
9. **Deploy**

**3.2 Frontend 2 Setup:**

Repeat Step 3.1 for second frontend (if different codebase):
- Or create as a monorepo if same code with different configs

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
- [ ] `frontend/.vercelignore` excludes non-essential files
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
- Verify frontend `VITE_API_BASE_URL` matches Render URL
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
Frontend1: https://frontend1.vercel.app
Frontend2: https://frontend2.vercel.app

CORS Policy:
  - Allow: Frontend1 & Frontend2 origins
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
3. **Week 3**: Deploy both frontends to Vercel
4. **Week 4**: Load testing and optimization


# Deployment Guide: DigitalOcean Backend + Vercel Frontend Setup

## 📋 Overview
- **Backend**: DigitalOcean-hosted FastAPI
- **Frontend**: Vercel (`src/gui`)
- **Database**: PostgreSQL (Supabase or other external Postgres)
- **Storage**: Supabase Storage
- **Large Data**: To be stored externally (see Data Management)

---

## 🚀 Quick Deployment Steps

### Step 1: Prepare Backend for DigitalOcean

**1.1 Verify the backend runs cleanly in its production-style startup path on DigitalOcean.**

**1.2 Verify .dockerignore excludes large files:**
- ✅ Exclude: `/data`, `/artifacts`, `/notebooks`
- ✅ Exclude: Development dependencies
- ✅ Include: Only `backend/app` and required files

**1.3 Push to GitHub/GitLab:**
```bash
git add .
git commit -m "Align deployment configuration"
git push origin main
```

---

### Step 2: Deploy Backend on DigitalOcean

1. Open your DigitalOcean project or service configuration.
2. Point the backend service at the `backend/` application path.
3. Use your production Python install/build process for the backend.
4. Set environment variables:
   - `ENVIRONMENT=production`
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`
   - `LLM_PROVIDER`
   - `CORS_ORIGINS` including your Vercel frontend origin
5. Deploy and verify `GET /api/health` returns success on the live backend domain.

---

### Step 3: Deploy Frontend on Vercel

**3.1 Frontend Setup:**

1. Log in to [Vercel](https://vercel.com)
2. **Add New Project**
3. Import from Git (select your repo)
4. **Framework**: Next.js
5. **Root Directory** (pick one):
   - **Repository root (recommended with this repo):** leave **Root Directory** empty. The root `vercel.json` selects `src/gui` for the build; the clone must include the `src/` tree.
   - **Subfolder:** set **Root Directory** to `src/gui` only if that path exists on the branch you deploy (see it on GitHub at the repo root). Use `npm run build` with default output.
6. **Build Command**: `npm run build` (or Vercel’s default; it resolves from the app’s `package.json`)
7. **Output Directory**: leave blank so Vercel uses the Next.js default
8. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-digitalocean-backend.example.com
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   DATABASE_URL=postgresql://...
   JWT_SECRET=your_jwt_secret
   BACKEND_API_URL=https://your-digitalocean-backend.example.com
   ```
9. **Deploy**

Important:
- Either leave **Root Directory** empty and use the repository `vercel.json`, **or** set it to `src/gui` if that folder exists in Git (see `README_DEPLOYMENT.md` if you see *Root Directory does not exist*).
- Keep the **Framework Preset** as **Next.js**.

---

## 📊 Data Management Strategy

### Problem: Large Files Prevent Deployment
- `data/title21_rag_paragraphs.jsonl`: 50 MB
- `data/title21_rag_section_chunks.jsonl`: 29 MB
- PDF files: 25 MB each
- **Total**: ~175 MB (too large for many simple build/deploy paths)

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
- [ ] Vercel project Root Directory is **empty (repo root)** or **`src/gui`** per `README_DEPLOYMENT.md`, and the build succeeds
- [ ] Environment variables configured in DigitalOcean & Vercel
- [ ] Backend deployed and `/health` endpoint returns 200
- [ ] Frontend deployed and loads successfully
- [ ] CORS headers configured correctly for the frontend origin
- [ ] Database migrations applied
- [ ] RAG data loaded from external storage

---

## 🔧 Troubleshooting

### "Memory Limit Exceeded (512 MB)"
- ✅ Verify `.dockerignore` is excluding `/data`, `/artifacts`
- ✅ Check requirements-prod.txt doesn't include dev packages
- ✅ Use `docker build` locally to test size

### "Frontend can't reach backend"
- Check `CORS_ORIGINS` in the DigitalOcean backend environment
- Verify frontend `NEXT_PUBLIC_API_URL` matches the backend URL
- Check backend logs in DigitalOcean

### "RAG data not loading"
- Implement data loading from Supabase or S3 (see above)
- Test locally before deploying
- Add logging: `logger.info(f"Loading RAG data from {source}")`

---

## 📡 Environment URLs

Update these in Vercel and DigitalOcean:

```
Backend: https://your-digitalocean-backend.example.com
Frontend: https://your-frontend.vercel.app

CORS Policy:
  - Allow: frontend origin
  - Allow: GitHub Actions (CI/CD)
```

---

## 🚨 Important Notes

1. **Don't commit large data files** to git (use .gitignore)
2. **Use environment variables** for all secrets (API keys, DB URLs)
3. **Test locally** with `docker build -f Dockerfile.prod .` before deploying
4. **Monitor DigitalOcean backend logs** after first deployment for startup issues
5. **Verify SSL/HTTPS** is enabled for both the backend domain and the Vercel frontend

---

## Schedule Recommended Actions

1. **Week 1**: Setup Supabase Storage, migrate data
2. **Week 2**: Deploy backend to DigitalOcean, verify health check
3. **Week 3**: Deploy the frontend to Vercel
4. **Week 4**: Load testing and optimization


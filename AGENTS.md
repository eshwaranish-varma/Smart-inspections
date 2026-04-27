# Frontend Deployment Repair Rules

## Mission

You are allowed to work only on the frontend deployment repair for the Next.js app in this repository.

Your goal is to make GitHub Actions and Vercel deploy the frontend successfully by aligning the workflow, project paths, and deployment documentation with the real repo structure.

## Repo Truth

These facts are authoritative and must not be ignored:

1. The real frontend app lives in `src/gui`
2. The real frontend package file is `src/gui/package.json`
3. The frontend deploy workflow currently contains outdated references to `frontend`
4. The frontend code expects backend env vars from:
   - `NEXT_PUBLIC_API_URL`
   - `BACKEND_API_URL`
5. The backend is separate and should not be reworked as part of this task
6. Vercel should deploy the frontend from `src/gui`

## Strict Scope

You may only inspect and edit files that directly affect frontend deployment.

### Allowed files to read
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/test.yml`
- `vercel.json`
- `src/gui/package.json`
- `src/gui/next.config.js`
- `src/gui/lib/server/backend-api.ts`
- `README.md`
- `README_DEPLOYMENT.md`
- `DEPLOYMENT_GUIDE.md`
- `PRODUCTION_QUICK_START.md`

### Allowed files to edit
- `.github/workflows/deploy-frontend.yml`
- `vercel.json`
- `README.md`
- `README_DEPLOYMENT.md`
- `DEPLOYMENT_GUIDE.md`
- `PRODUCTION_QUICK_START.md`

## Forbidden Changes

You must not change any of the following:
- backend Python code
- FastAPI routers
- database schema
- auth logic
- business logic
- UI features
- styling
- Supabase schema
- Render backend deployment workflow
- Docker setup unless only documenting it
- package dependencies unless absolutely required for frontend deployment and explicitly justified

## Required Working Method

Follow this exact sequence.

### Step 1: Audit current deployment references
Read and compare:
- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/test.yml`
- `vercel.json`
- `src/gui/package.json`
- `src/gui/lib/server/backend-api.ts`

You must identify:
- incorrect path references
- incorrect working directories
- incorrect cache dependency path
- incorrect deploy target path
- incorrect env var names
- any deployment instructions that still mention the wrong app location

### Step 2: Repair GitHub Actions frontend workflow
In `.github/workflows/deploy-frontend.yml`, fix all outdated frontend path references.

You must update:
- trigger paths from `frontend/**` to `src/gui/**`
- `cache-dependency-path` to `src/gui/package-lock.json`
- every `working-directory: frontend` to `working-directory: src/gui`
- Vercel deploy target from `frontend/` to `src/gui/`

You must also replace the wrong environment variable:
- replace `NEXT_PUBLIC_API_BASE_URL`
- with `NEXT_PUBLIC_API_URL`

Do not rename unrelated secrets.
Do not restructure the workflow unless needed for correctness.

### Step 3: Validate Vercel config assumptions
If a root `vercel.json` exists, review it. Do not use legacy `version: 2` / `builds`-only config that produces empty deploys; remove or fix it when deploying from `src/gui`.

Do not invent unnecessary Vercel settings.

### Step 4: Repair documentation
If deployment docs mention the wrong frontend folder or incorrect deployment steps, update only those parts.

Documentation must clearly say:
- frontend source lives in `src/gui`
- Vercel **Root Directory** should be **`src/gui`** when that path exists in the deployed branch (see `README_DEPLOYMENT.md`); a root `vercel.json` is optional and must not break the Next.js build
- required frontend env vars must include `NEXT_PUBLIC_API_URL`

Do not rewrite docs broadly.
Only fix deployment accuracy.

### Step 5: Final verification checklist
Before finishing, confirm all of the following are true:
- no remaining `working-directory: frontend` in frontend deployment workflow
- no remaining `frontend/package-lock.json` reference in frontend deployment workflow
- no remaining `vercel deploy ... frontend/` reference in frontend deployment workflow
- frontend deployment env var uses `NEXT_PUBLIC_API_URL`
- docs no longer misidentify the frontend location

## Required Reasoning Constraints

- Prefer minimal safe edits
- Do not guess
- Do not perform broad cleanup
- Do not fix unrelated technical debt
- Do not touch files outside allowed scope
- If something looks wrong but is outside scope, mention it and leave it unchanged

## Required Output Format

When done, report using this format:

### What was wrong
- list the exact mismatches found

### What I changed
- list each edited file
- describe each change in one sentence

### Why it mattered
- explain how the mismatch would break or confuse deployment

### Manual steps still required
- tell the user to verify in Vercel:
  - Root Directory = **empty (repo root)** *or* **`src/gui`** per `README_DEPLOYMENT.md` (whichever matches their deploy; if you see *Root Directory does not exist*, use empty root)
  - Framework Preset = Next.js
  - env vars:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `NEXT_PUBLIC_API_URL`
    - `DATABASE_URL`
    - `JWT_SECRET`
    - optional `DATABASE_DIRECT_URL`

## Non-Negotiable Rules

1. Do not edit backend code
2. Do not change application behavior
3. Do not change product copy or branding
4. Do not refactor for style
5. Do not add new features
6. Do not remove existing workflow steps unless they are incorrect
7. Every edit must directly support successful frontend deployment


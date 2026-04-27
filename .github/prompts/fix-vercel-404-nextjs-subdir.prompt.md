---
description: "Diagnose + fix Vercel 404 for Next.js in src/gui"
name: "Fix Vercel 404 (Next.js subfolder)"
argument-hint: "Paste the failing URL + what path 404s"
agent: "agent"
---

You are debugging a Vercel deployment that **builds successfully** but the deployed site shows **continuous 404**.

Repo facts (assume unless evidence contradicts):
- Next.js app lives in `src/gui/`
- `src/gui/package.json` exists and contains `next` scripts
- Deployment is on Vercel; backend is separate and already running

## Input (from user)
- Deployed URL(s) (preview + production)
- Which path returns 404? ("/" vs a deep route like "/dashboard")
- Vercel build log excerpt (if available)

## Task
Find the root cause and propose the minimal safe fix.

## Step-by-step
1) **Classify the 404**
   - If only `/` 404s: likely wrong app root / wrong output / wrong Vercel project root directory.
   - If `/` works but deep links 404: likely SPA fallback/rewrites issue (less common for Next, more for Vite/CRA).
   - If pages render but API calls 404: likely bad API base URL or rewrites/proxy issue.

2) **Confirm frontend is really Next.js and where it lives**
   - Verify `src/gui/package.json` has `next` in scripts/deps.
   - Verify routes exist under `src/gui/app/` and/or `src/gui/pages/`.

3) **Validate `vercel.json` is pointing to the correct sub-app**
   - Recommended for this repo:
     ```json
     {
       "version": 2,
       "builds": [
         {
           "src": "src/gui/package.json",
           "use": "@vercel/next"
         }
       ]
     }
     ```
   - Avoid using `src/gui/next.config.js` as `src` unless you have a reason; `package.json` is the reliable entrypoint for installs/build.

4) **Check Vercel Project Settings that commonly cause 404 even with a good build**
   - If using `builds` in `vercel.json`, Vercel will ignore the UI Build & Development Settings (this is expected).
   - Confirm the Vercel project is connected to the correct repo and branch.
   - Confirm the deployment domain is pointing to the latest successful deployment.

5) **Check for “hidden 404” caused by runtime config**
   - Search for `notFound()` usage and route guards that redirect to 404.
   - Check for middleware (`middleware.ts`) that rewrites/proxies and could send users to `/_not-found`.
   - Check `next.config.js` for `output: "export"` or `basePath` / `assetPrefix` settings that can break routing on Vercel.

6) **Environment variables: stop relying on repo `.env` during Vercel build/runtime**
   - If logs show dotenv loading something like `../../.env`, treat this as a red flag.
   - Ensure all required env vars are configured in **Vercel → Project → Settings → Environment Variables**.
   - Minimum likely needed:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - any API base URL used by the frontend (search for `NEXT_PUBLIC_API` / `API_BASE` usage)

7) **Provide the fix**
   - Output:
     - Root cause (1–2 sentences)
     - Minimal file changes (exact paths + snippets)
     - Vercel Settings changes (env vars list)
     - Redeploy checklist (what URL/path to retest)

## Output format
- **Diagnosis**: ...
- **Fix (code)**: list of file edits
- **Fix (Vercel settings)**: env vars + any setting change
- **Verification steps**: 3–5 bullets

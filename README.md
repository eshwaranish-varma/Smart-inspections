# Smart Inspections — AI-Assisted FDA 483 & EIR Drafting Platform

## Overview

**Problem:** FDA inspection teams produce large volumes of structured documentation Form FDA 483 observations and Establishment Inspection Reports (EIRs). Doing this manually is slow, easy to make inconsistent, and hard to trace when multiple people touch the same case.

**What this system does:** Smart Inspections combines **AI-assisted drafting**, **OCR**, **regulatory knowledge retrieval** (IOM / Title 21 context), and a **human-in-the-loop workflow** so investigators can generate drafts, edit them, route them to supervisors, and retain **versions, comments, signatures, and audit history**.

**Who it is for:** FDA investigators and field staff, supervisors who review and approve work, and engineering teams operating or extending the platform. *(This is a capstone-style application; production FDA deployment would require additional validation and security review.)*

---

## Key Features


| Area                       | Capability                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ingestion**              | Upload PDFs and images; **OCR** extracts text (Tesseract, OpenCV; PDFs via PyMuPDF).                                                                                                     |
| **AI drafting**            | Generate and refine **483 observations** and **EIR** via **LangChain**; LLM is **Google Gemini** or **OpenAI** per `LLM_PROVIDER` in `backend` settings.                                 |
| **Citations & references** | **Title 21** CSV-backed sections and **IOM**-grounded retrieval from the knowledge base.                                                                                                 |
| **Knowledge base**         | PDFs under `data/` are ingested and chunked; retrieval uses **FAISS** with **OpenAI embeddings** when `OPENAI_API_KEY` is set, with keyword fallback if the vector index is unavailable. |
| **Workflow (Next.js GUI)** | Inspection lifecycle: create → assign → draft → submit → **supervisor review** → approve / rework → close; **electronic signatures**, **comments**, **notifications**.                   |
| **Traceability**           | **Workflow logs**, **document versions** (draft/submitted/rework/approved snapshots), **audit-oriented** views in the UI.                                                                |
| **Document export**        | **FastAPI** generates **.docx** (Form 483, EIR) via `python-docx`; library endpoints persist drafts where configured.                                                                    |
| **Auth (GUI)**             | Email signup with OTP, **JWT** sessions, bcrypt passwords; app data in **PostgreSQL** (typically **[Supabase](https://supabase.com)**-hosted Postgres via `DATABASE_URL`).                                                                                        |
| **PDF in browser**         | Preview and rendering via **react-pdf** / **pdfjs-dist** in the GUI where applicable.                                                                                                    |


---

## System Architecture

The repository ships **one web client** (Next.js) and **one AI/API backend** (FastAPI):

```text
┌─────────────────────────┐     HTTP (browser)      ┌──────────────────────────────┐
│   Next.js GUI :3000     │ ───────────────────────►│ Next.js Route Handlers       │
│  (dashboard, workflow)  │                         │  /api/* → Postgres (Supabase) │
└─────────────────────────┘                         └──────────────────────────────┘
                                                              │
                                                              │
                                                              ▼
                                                    ┌──────────────────────────────┐
                                                    │  FastAPI :8000              │
                                                    │  AI, OCR, documents, library │
                                                    └──────────────────────────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────────────┐
                                                    │  PostgreSQL              │
                                                    │  (use Supabase: same DB  │
                                                    │   for Next.js + FastAPI) │
                                                    └──────────────────────────┘
```

- **Next.js (`src/gui`)** — Landing, authentication, **workflow** (`/workflow`, library, notifications), drafting and evaluation UIs. **Route handlers** `/api/*` read and write **PostgreSQL** (users, inspections, workflow, versions, document library) and forward some requests to **FastAPI** where configured (`BACKEND_API_URL`).
- **FastAPI (`backend`)** — **REST** under `/api/...`: observations (incl. FY2025 Excel), AI, OCR, `.docx` generation, **saved document library** and **audit** via **SQLAlchemy** into **PostgreSQL** (`DATABASE_URL`).

**Persistence:** The system uses **PostgreSQL** as the database engine. **Supabase** is the recommended setup: create a project, copy the **database connection URI** from **Project Settings → Database**, and set it as **`DATABASE_URL`** for **both** the Next.js app and FastAPI so workflow data, **`ai_runs`**, and FastAPI pipeline tables share **one database**. Local Postgres or Docker `local-db` also work; see Environment Variables.

**AI layer (backend):**

- **OCR:** PyMuPDF (PDFs), Tesseract + OpenCV (images).
- **LLM:** LangChain services; **Gemini** or **OpenAI** per `LLM_PROVIDER`.
- **Retrieval:** Chunked PDF text; **FAISS** + OpenAI embeddings for vector search when `OPENAI_API_KEY` is available; otherwise keyword scoring over chunks.

---

## Detailed workflow: frontend, middleware, backend, and AI/RAG

This section ties together **where requests go**, what **Next.js middleware** does, how **text reaches the LLM**, how **RAG** is used, and how **Form FDA 483 observations** are drafted with **Title 21 CFR** citation matching.

### 1. Application surfaces

| Surface | Role | Typical traffic |
| -------- | ------ | ---------------- |
| **Next.js GUI** (`src/gui`, port 3000) | Auth, workflow, inspections, document routes, evaluation dashboards, drafting | Browser → pages; **same-origin** `/api/*` **Route Handlers** talk to PostgreSQL and **proxy or call FastAPI** where needed (see `BACKEND_API_URL`). |
| **FastAPI** (`backend`, port 8000) | OCR, AI generation, citations, documents, evaluation APIs | HTTP JSON; uses `DATA_DIR`, LLM keys, optional DB for pipeline logging |

### 2. Reverse proxy and “which `/api` is which?”

When you use **Docker Compose + NGINX** (`docker/nginx/smart.conf`), a single host port (default 80) splits traffic:

- **FastAPI** receives paths matching  
  `/api/(observations|ai|documents|ocr|library|citations|references|health|eval|evaluation)(/|$)`  
  so **AI, OCR, citations, and evaluation** hit the Python backend.
- **Next.js** receives **all other** `/api/*` (auth, inspections, notifications, profile, etc.).

Additional FastAPI routers (for example `/api/eir-pipeline`) exist on the backend; if you need them **through NGINX on port 80**, add their prefix to the same location block in `docker/nginx/smart.conf` (or call **`http://<host>:8000`** directly in development).

That avoids sending FastAPI-only routes to the Next server and vice versa. Direct dev URLs (`localhost:3000`, `localhost:8000`) skip NGINX.

### 3. Next.js proxy (session refresh, not NGINX)

The root `src/gui/proxy.ts` runs for most routes. It calls `updateSession` from `src/gui/utils/supabase/middleware.ts`:

- If **`NEXT_PUBLIC_SUPABASE_URL`** and a Supabase anon/publishable key are set, it creates a server Supabase client, reads cookies, and runs **`supabase.auth.getUser()`** so **session cookies stay fresh** on navigation.
- If Supabase env is **not** configured, it **passes through**; the app may rely on other auth (e.g. JWT from `/api/auth/login`).

This middleware does **not** implement business rules for inspections; it is **authentication/session refresh** only. Static assets and `/_next/*` are excluded via the `matcher`.

### 4. Backend request path (FastAPI)

On startup (`backend/app/main.py`), the app:

1. Connects SQLAlchemy to **`DATABASE_URL`** (when available) for library, audit, and **pipeline logging** tables.
2. Initializes **`KnowledgeBaseService`**: loads PDFs from the configured data directory, chunks text (PyMuPDF extraction for PDFs), and builds a **vector store** when embeddings are available, with **keyword fallback** if not.

Incoming AI requests hit routers under `/api/ai`, `/api/citations`, `/api/ocr`, etc., with **CORS** from `CORS_ORIGINS`.

### 5. How text gets into the system (before the LLM)

| Source | What happens |
| ------ | ------------- |
| **User paste** | Raw inspection notes are sent as a string in JSON (e.g. `raw_notes`) to `/api/ai/generate-observations` or via Next.js `POST /api/inspections/[id]/generate-483`, which forwards to the backend. |
| **PDF / image upload** | **`/api/ocr`** uses **PyMuPDF** for PDFs and **Tesseract + OpenCV** for images; returned text is shown or copied into the drafting flow. OCR output is plain text—there is no separate “OCR model”; it feeds the same note fields the LLM sees. |

So “extraction” in the product is **OCR/PDF text extraction** plus optional **chunking** for retrieval—not a second generative model for transcription.

### 6. RAG: what is retrieved and how

RAG here means **retrieval-augmented prompting**: the LLM receives **short, relevant excerpts** in the prompt, not the full corpus.

1. **Regulatory / IOM knowledge base (`KnowledgeBaseService`)**  
   PDFs under `data/` are read, split into overlapping chunks, and indexed (**FAISS + embeddings** when configured; else keyword scoring). At query time, `retrieve(query)` returns top chunks for a **segment query** (see below).

2. **Inspection notes (per-segment)**  
   `backend/app/services/context_retrieval.py` implements **`retrieve_note_chunks`**: the full `raw_notes` string is split into chunks, embedded with the configured sentence-transformer model, and ranked by **cosine similarity** to a **query** (each segmented observation’s `raw_text`).

3. **`build_retrieval_package`** combines:
   - **Note snippets** (highest-similarity chunks from the investigator’s notes), and  
   - **KB snippets** (from `KnowledgeBaseService.retrieve`),  
   then formats them into a single **`context_block`** for the prompt.  
   If retrieval is disabled or empty, the pipeline falls back to **`legacy_truncation_block`** (a large prefix of `raw_notes`).

Controlled by settings such as `use_retrieval_for_generation`, `notes_retrieval_top_k`, `kb_retrieval_top_k`, and `cfr_embedding_model` (see `backend/app/config.py`).

### 7. LLM pipeline: from raw notes to drafted 483 observations

The main production path is **`POST /api/ai/generate-observations`** (also invoked by Next.js after workflow checks). It does **not** draft all observations in one shot; it runs **multiple LLM calls** in sequence:

```text
raw_notes (+ optional refinement_feedback)
    │
    ▼
[1] Segmentation LLM  ──► list of SegmentedObservation (one issue each: raw_text, evidence)
    │
    ├── For each segment:
    │       build_retrieval_package(raw_notes, segment.raw_text)
    │       → context_block (+ metadata for audit/dashboards)
    │
    ▼
[2] Draft LLM (once per observation)  ──► JSON: drafted_text, cfr_citation, evidence_used
    │       Prompts defined in draft_483_pipeline / AIService; strict “one observation per call”.
    │
    ▼
[3] Title 21 citation match (post-processing, not generative)
        CitationService.best_match(obs.cfr_citation)
        → matched_citation, section_title, score; may set review_flags if no confident match
    │
    ▼
[4] Validation & confidence (grounding vs raw notes, structure, CFR when parts list provided)
        Optional semantic grounding uses GroundingCache + embeddings when enabled.
```

**Endpoints to know:**

- **`/api/ai/draft-483`** — If you already have segmented `ObservationInput[]`, runs **only** step [2] (strict one row per call).
- **`/api/ai/generate-observations`** — Full pipeline [1]–[4], returns `DraftObservation` rows, evaluation metrics, and optional pipeline DB logs.

**EIR:** **`/api/ai/generate-eir`** (and related EIR pipeline routes) take finalized or draft 483-style observations plus notes, pull additional KB context where configured, and call the LLM with **EIR-oriented system prompts** in `ai_service.py` (narrative sections, traceability for the pipeline variant). That is **separate** from the 483 drafting loop but uses the same LLM provider stack.

### 8. How CFR citations are matched (not “hallucinated” into the database)

1. **Model output:** Each drafted observation includes a **string** `cfr_citation` (e.g. `21 CFR 211.22(a)`), produced under prompt rules in `draft_483_pipeline.py` / `AIService`.

2. **Candidate list:** The request may include **`cfr_parts`** — regulatory parts the investigator cares about. These are passed as **`cfr_candidates`** in the draft prompt so the model steers toward those sections.

3. **Resolution:** **`CitationService`** loads **Title 21** from PostgreSQL (`title_21_sections` when configured), **CSV** (`data/title-21-sections.csv`), and/or **GPO CFR XML** under `data/title21/`. It supports **`cfr_match_mode`**: fuzzy string match, semantic search over an index, or hybrid. **`best_match`** picks a canonical row when similarity passes thresholds.

4. **Flags:** If the model’s citation string does not match any row confidently, **`review_flags`** may include a CFR verification flag so the UI can prompt human review.

5. **Logging:** For observability, the pipeline can persist retrieval chunks, candidate lists, and scores (when DB tables are available).

### 9. Quick mental model

- **Frontend:** Chooses **workflow state**, **calls Next `/api/*` or FastAPI `/api/ai/*`**, displays drafts and citations.
- **Middleware:** **Refreshes Supabase auth** when enabled; otherwise no-op for auth.
- **Backend:** **OCR** extracts text from files; **RAG** selects note + IOM/regulatory chunks; **LLM** segments and drafts **one observation per call**; **CitationService** aligns citations to **Title 21** references; **validation** scores grounding and confidence.

---

## Tech Stack


| Layer             | Technologies                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js GUI**   | Next.js **16**, React **18**, TypeScript, Tailwind CSS, App Router, Route Handlers (`src/gui/app/api/`), TanStack Query, `pg` driver. |
| **Backend**       | Python **3.11**, **FastAPI**, Uvicorn, **SQLAlchemy 2**, Pydantic Settings, **psycopg2** (PostgreSQL).                            |
| **Database**      | **PostgreSQL** (commonly **Supabase**): users, inspections, workflow, notifications, document library, FastAPI `saved_documents` / `audit_log`, pipeline logging.          |
| **AI**            | LangChain, **langchain-google-genai** / **langchain-openai**, **FAISS** + OpenAI embeddings (knowledge retrieval), tiktoken.      |
| **OCR / PDF**     | PyMuPDF, Tesseract, OpenCV, Pillow.                                                                                               |
| **Documents**     | python-docx, openpyxl.                                                                                                            |
| **GUI UX**        | React Hook Form + **Zod**, **TanStack Table**, drag-and-drop (**@hello-pangea/dnd**), **Sonner** toasts, **Recharts** for charts. |
| **Containers**    | Docker, Docker Compose (`docker-compose.yml`).                                                                                    |


---

## Project Structure

```text
backend/                 # FastAPI app — AI, OCR, documents, observations API
  app/main.py            # Routers: /api/observations, /api/ai, /api/documents, /api/ocr, /api/library, …
  app/services/          # AI, OCR, knowledge base, documents, citations
  Dockerfile

src/gui/                 # Next.js app — dashboard, workflow, drafting (port 3000)
  app/                   # Pages + Route Handlers (/api/auth/*, /api/inspections/*, …)
  lib/db/                # PostgreSQL access, inspection-service, schema.sql
  components/

data/                    # IOM PDFs, templates, FY2025 Excel, rulebook JSONL (KB & API inputs)
artifacts/               # Generated RAG JSONL (offline KB build pipeline)

docker-compose.yml       # PostgreSQL + FastAPI + Next.js + NGINX
docker/nginx/smart.conf  # NGINX reverse proxy (single entry on host port NGINX_PORT)

tests/                   # Pytest layout
scripts/                 # e.g. prepare_iom_rag_jsonl.py — offline KB / RAG JSONL generation
```

---

## GUI (Next.js) — main routes


| Area                      | Path (examples)                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Marketing / landing**   | `/`                                                                                                    |
| **Auth**                  | `/login`, `/signup`, `/verify-email`                                                                   |
| **Dashboard**             | `/dashboard`, `/merged-dashboard`                                                                      |
| **Inspections**           | `/inspections`, `/inspections/new`, `/inspections/[id]`, `/new-inspection`                             |
| **Workflow**              | `/workflow`, `/workflow/[id]`                                                                          |
| **Documents**             | `/documents/483`, `/documents/483/[id]`, `/documents/eir`, `/documents/eir/[id]`, `/document/483/[id]` |
| **Library & refs**        | `/library`, `/references`                                                                              |
| **Observations & audit**  | `/observations`, `/audit-trail`, `/inspections/[id]/audit-trail`                                       |
| **Settings**              | `/settings`                                                                                            |
| **Alternate embedded UI** | `/smart-inspections` (self-contained JSX flow)                                                         |


## Database Overview (PostgreSQL on Supabase)

The app stores relational data in **PostgreSQL**. In practice teams use **[Supabase](https://supabase.com)** as the host: it **is** PostgreSQL (connection string from the Supabase dashboard), not a different database product. When `DATABASE_URL` points to the **same** Supabase/Postgres instance for the Next.js app and the FastAPI service, workflow tables and AI pipeline tables live together.

**Supabase also provides (optional):** Auth cookie refresh in Next.js middleware if you set `NEXT_PUBLIC_SUPABASE_URL` and an anon/publishable key—this is separate from storing rows in `public.*` tables via `DATABASE_URL`.

**Workflow & auth (Next.js route handlers + `ensureAuthTables`):**


| Table                            | Purpose                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **users**                        | Accounts (investigator / supervisor), verification, password hashes.                                     |
| **email_verifications**          | OTP / verification token rows tied to signup.                                                            |
| **user_profiles**                | Address and **electronic signature** fields.                                                             |
| **inspections**                  | One row per inspection; **status** drives workflow; JSON columns for observations, EIR, metadata, notes. |
| **inspection_workflow_logs**     | Actions and status transitions.                                                                          |
| **inspection_reviews**           | Supervisor approve / rework decisions.                                                                   |
| **inspection_comments**          | Threaded comments.                                                                                       |
| **inspection_document_versions** | Draft / submitted / rework / approved snapshots.                                                         |
| **notifications**                | User notifications.                                                                                      |
| **document_library_records**     | Published or archived library entries.                                                                   |


**Drafting API (FastAPI + SQLAlchemy `init_db`):**


| Table               | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| **saved_documents** | Saved Form 483–style drafts from drafting flows. |
| **audit_log**       | Audit entries for backend actions.              |


DDL reference: `src/gui/lib/db/schema.sql`. For existing databases created before workflow tables, apply `src/gui/lib/db/migration-workflow.sql` as documented in that file. Tables are also created at runtime via `ensureAuthTables()` in `user-service.ts` (and FastAPI `create_all` for its models when the app starts).

---

## Workflow (End-to-End)

Typical path combining **Next.js** workflow with **FastAPI** drafting:

1. **Sign in** (Next.js GUI) — JWT session after email verification where required.
2. **Create inspection** — metadata and firm details stored in PostgreSQL.
3. **Assign** — supervisor assigns to an investigator (role-gated APIs).
4. **Investigator works** — upload files, run **OCR**, call **AI** endpoints, edit observations/EIR JSON in the Next.js app.
5. **Draft milestones** — status moves through e.g. *in progress* → *draft completed* → *EIR submitted* (exact labels depend on implementation).
6. **Submit for review** — transitions to *under review*; **notifications** may fire.
7. **Supervisor review** — comments, **approve** or **rework**; **electronic signature** capture when required by the flow.
8. **Approval** — approved snapshots and **document library** publishing logic run in service code.
9. **Versions & audit** — **timeline** and **versions** APIs support history and exports.

*Exact button labels and routes are in `src/gui/app/(dashboard)/workflow` and related API handlers.*

---

## Installation & Setup

### Prerequisites

- **Docker Desktop** (for Compose), or **Node 18+**, **Python 3.11+**, and a running **PostgreSQL** instance for manual setup.
- **Tesseract OCR** on the host if you run the backend outside Docker (required for image OCR routes).
- **LLM keys** for local runs: set `GOOGLE_API_KEY` and/or `OPENAI_API_KEY` in the **repository root** `.env` (copy from `.env.example`). Embeddings for the knowledge base use **OpenAI** when `OPENAI_API_KEY` is set.

---

### Option 1: Docker (recommended)

Compose loads a `**.env`** file in the repository root (same directory as `docker-compose.yml`). Copy `.env.example` to `**.env`** (gitignored) and set **`DATABASE_URL`**, **`JWT_SECRET`**, LLM keys, and optional SMTP for email OTP.

**Database — Supabase (recommended):** In Supabase: **Project Settings → Database**, copy the **URI** (Session or Direct). Put it in `.env` as `DATABASE_URL`, and ensure it includes **`?sslmode=require`** if not already present. The stack does **not** start a local Postgres container by default.

**Database — local Postgres in Docker (optional):** Run `docker compose --profile local-db up --build` and set `DATABASE_URL=postgresql://postgres:postgres@db:5432/smart_inspections` (matching `POSTGRES_*` in `.env` if you override them).

**Next.js → FastAPI in Docker:** Set **`BACKEND_API_URL=http://backend:8000`** in `.env` so server-side route handlers call FastAPI by Docker service name (the default in Compose). For a public HTTPS site, set **`NEXT_PUBLIC_APP_URL`** and **`CORS_ORIGINS`** to your real origins.

From the **repository root**:

```bash
mkdir -p data
cp .env.example .env   # edit DATABASE_URL, JWT_SECRET, keys

docker compose up --build
```


| Service      | Host port (default)        | Description                                                                                                       |
| ------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **nginx**    | **80** (`NGINX_PORT`)      | Single entry: Next.js UI + `/api/*` split between FastAPI and Next route handlers (see `docker/nginx/smart.conf`) |
| **gui**      | **3000** (`GUI_PORT`)      | Next.js (direct access; also behind NGINX)                                                                        |
| **backend**  | **8000** (`BACKEND_PORT`)  | FastAPI (`/docs` for Swagger)                                                                                     |
| **db**       | **5432** (`POSTGRES_PORT`) | PostgreSQL — only with **`docker compose --profile local-db`**                                                    |


**How traffic is split (NGINX on port 80):** Paths matching `/api/(observations|ai|documents|ocr|library|citations|references|health|eval|evaluation)` go to **FastAPI**. All other `**/api/*`** requests go to **Next.js** route handlers. Use **`http://localhost:8000`** for direct FastAPI access, or **`http://localhost`** (NGINX) for a single origin.

**Environment:** **`DATABASE_URL`** is required in `.env` (Supabase or `@db` when using **`local-db`** profile). **CORS** defaults include `http://localhost` for NGINX; add your production origin. **LLM keys** are passed into the backend from the root `.env` (`GOOGLE_API_KEY`, `OPENAI_API_KEY`).

**Logs:** Services use the `json-file` driver with rotation (10 MB × 3 files). View with `docker compose logs -f <service>`.

**Troubleshooting**

- **`db` missing / unhealthy:** With Supabase you do not run **`db`** unless you use **`--profile local-db`**. For that profile, ensure `POSTGRES_*` match `DATABASE_URL` (`@db:5432`).
- **Backend stuck starting:** Check `docker compose logs backend`; DB must be healthy first. Knowledge base init warnings are non-fatal.
- **Next.js build fails on Alpine:** If native modules fail, switch `src/gui/Dockerfile` base images to `node:18-bookworm-slim` (same pattern as the rest of the Dockerfile).
- **AI/OCR in containers:** Set `GOOGLE_API_KEY` / `OPENAI_API_KEY` in `.env`. OCR needs Tesseract in the backend image.
- **CORS errors in the browser:** Add your frontend origin to `CORS_ORIGINS` in `.env` (comma-separated).

---

### Option 2: Manual (development)

Create **one** environment file at the **repository root** (same as Docker): copy `**.env.example`** to `**.env**` and set `DATABASE_URL` to use `localhost` for Postgres on your machine. FastAPI and Next.js are wired to read that file.

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Next.js GUI**

```bash
cd src/gui
npm install
npm run dev                     # uses Next 16 with --webpack (see package.json)
```

**Note:** Next.js **16** defaults to Turbopack; this project uses `--webpack` on `dev` and `build` because of a custom `webpack` alias in `next.config.js` (`react-router-dom` compat). Production: `npm run build` then `npm start` (listens on `0.0.0.0:3000`).

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

**Vercel:** Use **Framework Preset** **Next.js** and set **Root Directory** to **`src/gui`** (see `README_DEPLOYMENT.md`). Configure environment variables from `.env.example`, including `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, and `JWT_SECRET`; add `BACKEND_API_URL` server-side if your deployment needs a separate backend origin.

---

## Environment Variables

Use the **repository root** `**.env.example`** as the template. Copy it to `**.env**` (gitignored) and fill in secrets. **Docker Compose** reads that `.env` automatically; local **FastAPI** loads `<repo>/.env` and optionally `<repo>/backend/.env` for overrides; **Next.js** (`src/gui`) loads the root `.env` via `next.config.js` (and `src/gui/.env.local` when present).


| Variable / group                                                                                                                     | Used by                | Purpose                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_*`, `DATABASE_URL`, `BACKEND_API_URL`, port vars                                                                              | Compose, FastAPI, Next | **`DATABASE_URL`** required (Supabase or `...@db:5432/...` with **`local-db`** profile). **`BACKEND_API_URL`** for Next server → FastAPI in Compose (default `http://backend:8000`). |
| `DATA_DIR`, `CORS_ORIGINS`, `TITLE21_CSV_PATH`, `LLM_PROVIDER`, model vars, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `OPENAI_TEMPERATURE` | FastAPI                | API behavior, LLM keys, data paths                                                                                          |
| `JWT_*`, `SMTP_*`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_*`                             | Next.js                | Sessions, email OTP, public URL, optional Supabase client, optional browser API base                                         |
| `DB_HOST` … `DB_PASSWORD`                                                                                                            | Next (legacy)          | Optional split DB vars if a code path still expects them when `DATABASE_URL` is absent                                      |


---

## API Overview

### FastAPI (port 8000)


| Path                | Role                                                      |
| ------------------- | --------------------------------------------------------- |
| `GET /`             | Service banner JSON                                       |
| `/api/health`       | Health + knowledge-base loaded flag                       |
| `/api/observations` | FY2025 observation dataset (Excel-backed), search, export |
| `/api/ai`           | Generate/refine observations and EIR text                 |
| `/api/documents`    | Generate Form 483 / EIR `.docx`                           |
| `/api/ocr`          | OCR uploads                                               |
| `/api/library`      | Saved documents (SQLAlchemy-backed library)               |
| `/api/citations`    | Title 21–related citation help                            |
| `/api/references`   | Reference material                                        |


### Next.js Route Handlers (same origin as GUI, port 3000)


| Group             | Endpoints                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**          | `POST /api/auth/login`, `logout`, `signup`, `verify`, `verify-otp`, `send-otp`                                                                                            |
| **Profile**       | `GET/PUT /api/profile`, `GET/PUT /api/profile/signature`                                                                                                                  |
| **Inspections**   | `GET/POST /api/inspections`, `GET /api/inspections/[id]`, `PUT /api/inspections/[id]/data`, `POST assign`, `transition`, `review`, `GET timeline`, `comments`, `versions` |
| **Notifications** | `GET /api/notifications`, `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all`                                                                         |
| **Library**       | `GET/POST /api/document-library`, `POST /api/document-library/[id]/reopen`                                                                                                |
| **Users**         | `GET /api/users/investigators` (assignee pickers)                                                                                                                         |


---

## Data & knowledge-base inputs

Typical files under `data/`:


| Asset                                                              | Role                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `InvestigationsOperationsManualComplete.pdf`                       | IOM — regulatory knowledge base text                               |
| `inspection-observation-manual.pdf`, `Inspection-Observations.pdf` | 483 guidance / example text                                        |
| `inspection_observations_fiscal_year_2025_0.xlsx`                  | FY2025 observations (FastAPI `/api/observations`)                  |
| `FDA_483a_Word_Template.docx`                                      | Official 483 Word template                                         |
| `title-21-sections.csv`                                            | Title 21 sections for citations (override with `TITLE21_CSV_PATH`) |
| `rulebooks/*.jsonl` (under `data/`)                                | Rulebook page extracts for offline tooling                         |


Offline RAG helpers live under `scripts/` (e.g. `prepare_iom_rag_jsonl.py`); generated indexes may be written to `artifacts/` when you run those pipelines.

---

## Screenshots

Add screenshots under `docs/images/` (create folder if needed) and link them here for demos and presentations.

---

## Future Improvements

- Stronger **production** hardening (secrets, HTTPS, rate limits, audit retention).
- Deeper **EIR** automation and validation rules.
- Tighter **citation** verification against current eCFR exports.
- Expanded **RBAC** and org-wide policy.

---

## Related Documentation

- `docs/DATA_ARCHITECTURE.md` — SQLAlchemy vs Next.js `pg`, Supabase/Postgres tables, and **where RAG chunks and LLM drafting are stored** (`pipeline_*`, `ai_runs`, `title_21_sections`).
- `src/gui/lib/db/schema.sql` — Full PostgreSQL schema for workflow tables (and seed users).
- `src/gui/lib/db/migration-workflow.sql` — Add workflow tables to older databases.

---

## Authors

Capstone team — **Smart Inspection**

---


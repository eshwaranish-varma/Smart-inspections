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
| **Auth (GUI)**             | Email signup with OTP, **JWT** sessions, bcrypt passwords, **PostgreSQL** for users and app data.                                                                                        |
| **PDF in browser**         | Preview and rendering via **react-pdf** / **pdfjs-dist** in the GUI where applicable.                                                                                                    |


---

## System Architecture

The repository ships **three runnable clients** and **one AI/API backend**:

```text
┌─────────────────────────┐     HTTP (browser)      ┌──────────────────────────────┐
│   Next.js GUI :3000     │ ───────────────────────►│ Next.js Route Handlers       │
│  (dashboard, workflow)  │                         │  /api/* → PostgreSQL (pg)    │
└─────────────────────────┘                         └──────────────────────────────┘
         │                                                    │
         │  Same machine: Vite + FastAPI                      │
         ▼                                                    ▼
┌─────────────────────────┐     HTTP /api/*         ┌──────────────────────────────┐
│  Vite React :5173       │ ───────────────────────►│  FastAPI :8000               │
│  (inspection drafting)  │   VITE_API_URL          │  AI, OCR, documents, library │
└─────────────────────────┘                         └──────────────────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │  PostgreSQL     │
                                                    │  (workflow +    │
                                                    │   library +     │
                                                    │   saved docs)   │
                                                    └─────────────────┘
```

- **Next.js (`src/gui`)** — Landing, authentication, **eNSpect-style workflow** (`/workflow`, library, notifications). **Route handlers** `/api/`* read and write **PostgreSQL** (users, inspections, workflow, versions, document library). Flexible payloads live in **JSON** columns.
- **Vite (`frontend`)** — Inspection drafting UI: observations, OCR, AI calls, document generation; calls **FastAPI** at `VITE_API_URL` (e.g. `http://localhost:8000/api`).
- **FastAPI (`backend`)** — **REST** under `/api/...`: observations (incl. FY2025 Excel), AI, OCR, `.docx` generation, **saved document library** and **audit** via **SQLAlchemy** into **PostgreSQL** (`DATABASE_URL`).

**Persistence:** Configure `**DATABASE_URL`** for both the Next.js pool and the FastAPI engine so **all relational data** (workflow, users, saved documents, audit) lives in **one PostgreSQL database** (see Environment Variables).

**AI layer (backend):**

- **OCR:** PyMuPDF (PDFs), Tesseract + OpenCV (images).
- **LLM:** LangChain services; **Gemini** or **OpenAI** per `LLM_PROVIDER`.
- **Retrieval:** Chunked PDF text; **FAISS** + OpenAI embeddings for vector search when `OPENAI_API_KEY` is available; otherwise keyword scoring over chunks.

---

## Tech Stack


| Layer             | Technologies                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js GUI**   | Next.js **16**, React **18**, TypeScript, Tailwind CSS, App Router, Route Handlers (`src/gui/app/api/`**), `pg` driver.           |
| **Vite frontend** | Vite **5**, React **18**, TypeScript, Tailwind, TanStack Query, Axios.                                                            |
| **Backend**       | Python **3.11**, **FastAPI**, Uvicorn, **SQLAlchemy 2**, Pydantic Settings, **psycopg2** (PostgreSQL).                            |
| **Database**      | **PostgreSQL** — users, inspections, workflow, notifications, document library, FastAPI `saved_documents` / `audit_log`.          |
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

frontend/                # Vite + React inspection UI (port 5173)
  src/

src/gui/                 # Next.js dashboard + workflow (port 3000)
  app/                   # Pages + Route Handlers (/api/auth/*, /api/inspections/*, …)
  lib/db/                # PostgreSQL access, inspection-service, schema.sql
  components/

data/                    # IOM PDFs, templates, FY2025 Excel, rulebook JSONL (KB & API inputs)
artifacts/               # Generated RAG JSONL (offline KB build pipeline)

docker-compose.yml       # PostgreSQL + FastAPI + Next.js + Vite + NGINX
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


### Vite app (port 5173)

React Router routes (see `frontend/src/App.tsx`): `/dashboard`, `/new-inspection`, `/observations`, `/library`, `/references`, `/audit-trail`, `/settings`, `/document/483/:id`.

---

## Database Overview (PostgreSQL)

All application state below is stored in **PostgreSQL** when `DATABASE_URL` points to the same database for the Next.js app and the FastAPI service.

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
| **saved_documents** | Saved Form 483–style drafts from the Vite path. |
| **audit_log**       | Audit entries for backend actions.              |


DDL reference: `**src/gui/lib/db/schema.sql`**. For existing databases created before workflow tables, apply `**src/gui/lib/db/migration-workflow.sql`** as documented in that file. Tables are also created at runtime via `**ensureAuthTables()**` in `user-service.ts` (and FastAPI `create_all` for its models when the app starts).

---

## Workflow (End-to-End)

Typical path combining **Vite + FastAPI** drafting with **Next.js** governance:

1. **Sign in** (Next.js GUI) — JWT session after email verification where required.
2. **Create inspection** — metadata and firm details stored in PostgreSQL.
3. **Assign** — supervisor assigns to an investigator (role-gated APIs).
4. **Investigator works** — may use **Vite app** to upload files, run **OCR**, call **AI** endpoints, edit observations/EIR JSON.
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

Compose loads a **`.env`** file in the repository root (same directory as `docker-compose.yml`). Create **`.env`** and set secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`, LLM keys, SMTP if you use email OTP).

From the **repository root**:

```bash
mkdir -p data
cp .env.example .env   # edit secrets

docker compose up --build
```

| Service      | Host port (default) | Description |
| ------------ | ------------------- | ----------- |
| **nginx**    | **80** (`NGINX_PORT`) | Single entry: Next.js UI + `/api/*` split between FastAPI and Next route handlers (see `docker/nginx/smart.conf`) |
| **gui**      | **3000** (`GUI_PORT`) | Next.js (direct access; also behind NGINX) |
| **frontend** | **5173** (`VITE_PORT`) | Vite static build (nginx) — inspection drafting UI |
| **backend**  | **8000** (`BACKEND_PORT`) | FastAPI (`/docs` for Swagger) |
| **db**       | **5432** (`POSTGRES_PORT`) | PostgreSQL (persistent volume `postgres_data`) |

**How traffic is split (NGINX on port 80):** Paths matching `/api/(observations|ai|documents|ocr|library|citations|references|health)` go to **FastAPI**. All other **`/api/*`** requests go to **Next.js** route handlers. The **Vite** app does not use NGINX by default; it calls **FastAPI** using **`VITE_API_URL`** (baked at `docker compose build` time). Use **`http://localhost:8000/api`** when FastAPI is exposed on the host, or **`http://localhost/api`** if you point the browser at NGINX and want FastAPI under the same origin (set `VITE_API_URL` accordingly and rebuild).

**Environment:** `DATABASE_URL` must use the **`db`** hostname inside Compose (e.g. `postgresql://postgres:postgres@db:5432/smart_inspections`). **CORS** defaults include `http://localhost` for NGINX. **LLM keys** are passed into the backend from the root `.env` (`GOOGLE_API_KEY`, `OPENAI_API_KEY`).

**Logs:** Services use the `json-file` driver with rotation (10 MB × 3 files). View with `docker compose logs -f <service>`.

**Troubleshooting**

- **`db` unhealthy:** Ensure `POSTGRES_USER` / `POSTGRES_DB` match `DATABASE_URL` credentials. If you change them, keep `DATABASE_URL` in sync.
- **Backend stuck starting:** Check `docker compose logs backend`; DB must be healthy first. Knowledge base init warnings are non-fatal.
- **Next.js build fails on Alpine:** If native modules fail, switch `src/gui/Dockerfile` base images to `node:18-bookworm-slim` (same pattern as the rest of the Dockerfile).
- **AI/OCR in containers:** Set `GOOGLE_API_KEY` / `OPENAI_API_KEY` in `.env`. OCR needs Tesseract in the backend image.
- **CORS errors in the browser:** Add your frontend origin to `CORS_ORIGINS` in `.env` (comma-separated).



---

### Option 2: Manual (development)

Create **one** environment file at the **repository root** (same as Docker): copy **`.env.example`** to **`.env`** and set `DATABASE_URL` to use `localhost` for Postgres on your machine. FastAPI, Next.js, and Vite are wired to read that file.

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

**Note:** Next.js **16** defaults to Turbopack; this project uses `**--webpack`** on `dev` and `build` because of a custom `webpack` alias in `next.config.js` (`react-router-dom` compat). Production: `npm run build` then `npm start` (listens on `0.0.0.0:3000`).

Interactive API docs: `**http://localhost:8000/docs`**.

---

## Environment Variables

Use the **repository root** **`.env.example`** as the template. Copy it to **`.env`** (gitignored) and fill in secrets. **Docker Compose** reads that `.env` automatically; local **FastAPI** loads `<repo>/.env` and optionally `<repo>/backend/.env` for overrides; **Next.js** (`src/gui`) loads the root `.env` via `next.config.js`; **Vite** reads `VITE_*` from the root `.env` via `envDir` in `vite.config.ts`.

| Variable / group | Used by | Purpose |
| ---------------- | ------- | ------- |
| `POSTGRES_*`, `DATABASE_URL`, port vars | Compose, FastAPI, Next | Database and published ports. For Docker, set `DATABASE_URL` to use host **`db`**. For local Postgres, use **`localhost`**. |
| `DATA_DIR`, `CORS_ORIGINS`, `TITLE21_CSV_PATH`, `LLM_PROVIDER`, model vars, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `OPENAI_TEMPERATURE` | FastAPI | API behavior, LLM keys, data paths |
| `JWT_*`, `SMTP_*`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` | Next.js | Sessions, email OTP, public URL |
| `VITE_API_URL` | Vite (build / dev) | Browser base URL for FastAPI (`VITE_*` only) |
| `DB_HOST` … `DB_PASSWORD` | Next (legacy) | Optional split DB vars if a code path still expects them when `DATABASE_URL` is absent |


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


Full interactive docs: `**http://localhost:8000/docs`**.

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

Typical files under `**data/`**:


| Asset                                                              | Role                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `InvestigationsOperationsManualComplete.pdf`                       | IOM — regulatory knowledge base text                               |
| `inspection-observation-manual.pdf`, `Inspection-Observations.pdf` | 483 guidance / example text                                        |
| `inspection_observations_fiscal_year_2025_0.xlsx`                  | FY2025 observations (FastAPI `/api/observations`)                  |
| `FDA_483a_Word_Template.docx`                                      | Official 483 Word template                                         |
| `title-21-sections.csv`                                            | Title 21 sections for citations (override with `TITLE21_CSV_PATH`) |
| `rulebooks/*.jsonl` (under `data/`)                                | Rulebook page extracts for offline tooling                         |


Offline RAG helpers live under `**scripts/`** (e.g. `**prepare_iom_rag_jsonl.py**`); generated indexes may be written to `**artifacts/**` when you run those pipelines.

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

- `**src/gui/lib/db/schema.sql`** — Full PostgreSQL schema for workflow tables (and seed users).
- `**src/gui/lib/db/migration-workflow.sql`** — Add workflow tables to older databases.

---


## Authors

Capstone team — **Smart Inspection**

---




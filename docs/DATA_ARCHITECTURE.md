# Data layer: SQLAlchemy, Supabase (PostgreSQL), and what gets stored where

This document explains **SQLAlchemy’s role**, how **Supabase** fits in, and **which tables** hold workflow data versus **AI/RAG trace** data so you can demo “what happened during drafting.”

---

## 1. Purpose of SQLAlchemy in this project

**SQLAlchemy** is used only in the **FastAPI backend** (`backend/`). It provides:

- A **database engine** (connection pool) to **PostgreSQL**
- **Declarative ORM models** (`app/models/database.py`, `app/models/pipeline_logging_models.py`)
- **`Session` per HTTP request** via FastAPI `Depends(get_db)` (`app/deps.py`): open session → handle route → commit/rollback → close

**Functional services SQLAlchemy powers here:**

| Capability | Where |
| ---------- | ----- |
| Persist **saved Form 483–style drafts** (drafting / library) | `SavedDocument` |
| **Audit log** rows for backend actions | `AuditLog` |
| **Full AI pipeline trace** for `/api/ai/generate-observations` | `pipeline_runs`, `pipeline_run_events`, `pipeline_run_chunks`, `pipeline_run_cfr_matches`, `pipeline_run_observations` |

SQLAlchemy does **not** run the LLM or RAG; it **stores the inputs, retrieved chunks, outputs, and scores** after each step.

---

## 2. How “Supabase” is implemented

**Supabase** in this repo is primarily **managed PostgreSQL**: you put the **same connection string** Supabase gives you (`DATABASE_URL` / pooler URL) into:

- **FastAPI** — SQLAlchemy connects and writes pipeline + optional `title_21_sections` reads
- **Next.js** — the `pg` pool (`src/gui/lib/db/client.ts`) connects for **users, inspections, workflow, `ai_runs`, `audit_logs`**, etc.

**Optional Supabase Auth (browser sessions):** If `NEXT_PUBLIC_SUPABASE_URL` and an anon/publishable key are set, **Next.js middleware** (`src/gui/middleware.ts`) refreshes **Supabase Auth** cookies. The app can still use **email/password users in `public.users`** from the custom login flow; those are separate from Supabase Auth unless you integrate them explicitly.

**Summary:** “Supabase” = **Postgres host** + optional **Auth cookie refresh**. There is **no** Supabase-only “vector store” in the cloud for this codebase: **RAG indexes** for PDFs live in the **backend process** (FAISS / in-memory chunks) unless you add an external vector DB.

---

## 3. Tables the Next.js app creates (workflow + light AI bookkeeping)

Created at runtime by `ensureAuthTables()` in `src/gui/lib/db/user-service.ts` (and mirrored in `src/gui/lib/db/schema.sql` for reference):

| Table | Purpose |
| ----- | ------- |
| `users`, `email_verifications`, `user_profiles` | Accounts, OTP, signatures |
| `inspections` | Case metadata; `observations_json`, `eir_json`, `raw_notes` hold **current draft state** |
| `inspection_workflow_logs` | Status transitions and workflow actions |
| `inspection_reviews`, `inspection_comments` | Supervisor review and comments |
| `notifications` | In-app notifications |
| `inspection_document_versions` | Version snapshots (JSON payloads) |
| `document_library_records` | Published/archived documents |
| **`ai_runs`** | One row per workflow-triggered AI call from Next (e.g. after **Generate 483**): `run_type`, `model`, `doc_id`, **`output_summary`** (includes **`pipeline_run_id`** when the backend returns it — links to detailed trace) |
| **`audit_logs`** | Supplemental actions (e.g. `GENERATE_483_DRAFT`) |
| `document_review_comments`, `document_review_signatures` | Document review workspace |

**Client-facing “we ran AI” story:** Query **`ai_runs`** for an inspection, then use **`output_summary.pipeline_run_id`** to join to **`pipeline_runs`** (below) for the full chunk-and-observation trace.

---

## 4. Tables the FastAPI pipeline writes (RAG + LLM + CFR)

Defined in `data/pipeline_logging_schema.sql` and applied via Supabase migration `supabase/migrations/20260409000000_pipeline_and_title21_sections.sql`. Written by `app/services/pipeline_logging_service.py` when `POST /api/ai/generate-observations` runs with a working DB.

| Table | What it stores |
| ----- | ---------------- |
| **`pipeline_runs`** | One row per generation run: `inspection_id`, `run_type` (`generate_observations`), `request_payload`, `status`, `response_summary` (includes `doc_id`, **`pipeline_run_id`**, aggregate metrics), `completed_at` |
| **`pipeline_run_events`** | Timeline: `run_input` (full raw notes + options), **`segmentation`** (includes **`segments`**: LLM segmentation output per issue), `retrieval` metadata per index, `citation`, `generation`, `grounding`, `evaluation`, `storage` |
| **`pipeline_run_chunks`** | **RAG**: each retrieved **note chunk** and **knowledge-base chunk** per observation (`chunk_type`, `source`, `score`, `content_preview`, `payload.text` for full excerpt) |
| **`pipeline_run_cfr_matches`** | **CFR**: candidate Title 21 rows and scores from `CitationService` for each observation |
| **`pipeline_run_observations`** | **LLM drafting result** per row: full **`DraftObservation`** JSON in `payload`, scores in `evaluation` |

**What is *not* stored as raw strings:** The **raw LLM assistant string** for each HTTP call is not saved separately; the **parsed JSON** (drafted text, CFR string, evidence) is in **`pipeline_run_observations.payload`** and evaluation in **`evaluation`**.

---

## 5. Title 21 citation reference data (optional but recommended)

| Table | Purpose |
| ----- | ------- |
| **`title_21_sections`** | CFR section text and labels; import from `data/title-21-sections.csv`. Used by **`CitationService`** when `TITLE21_SOURCE` allows database reads so **matched citations** resolve against a canonical row. |

This is **reference data**, not a per-run log.

---

## 6. End-to-end demo query (conceptual)

1. User runs **Generate 483** in the workflow UI → Next.js **`POST /api/inspections/:id/generate-483`** → FastAPI **`POST /api/ai/generate-observations`**.
2. Response includes **`doc_id`**, **`pipeline_run_id`** (when DB logging succeeds).
3. Next.js inserts **`ai_runs`** with **`output_summary.pipeline_run_id`**.
4. In Supabase SQL or any SQL client:

```sql
-- Light summary (Next.js)
SELECT * FROM ai_runs WHERE inspection_id = '<inspection uuid>' ORDER BY created_at DESC;

-- Full trace (FastAPI)
SELECT * FROM pipeline_runs WHERE id = '<pipeline_run_id>';

SELECT event_type, payload FROM pipeline_run_events
  WHERE pipeline_run_id = '<pipeline_run_id>' ORDER BY created_at;

SELECT observation_index, chunk_type, source, score, left(content_preview, 200)
  FROM pipeline_run_chunks WHERE pipeline_run_id = '<pipeline_run_id>' ORDER BY observation_index;

SELECT observation_index, query, payload FROM pipeline_run_cfr_matches
  WHERE pipeline_run_id = '<pipeline_run_id>' ORDER BY observation_index;

SELECT observation_index, payload FROM pipeline_run_observations
  WHERE pipeline_run_id = '<pipeline_run_id>' ORDER BY observation_index;
```

That sequence is what you can show a client: **input → segmentation → RAG chunks → CFR candidates → drafted observation JSON → scores**.

---

## 7. Requirements for data to actually land in Supabase

1. **`DATABASE_URL`** (or FastAPI’s resolved URL) must point at **the same Postgres** the GUI uses.
2. Apply migrations (Supabase Dashboard → SQL, or `supabase db push`, or run the migration files manually).
3. FastAPI must start **without** skipping DB initialization (see logs: “Database initialized”).
4. If **`create_pipeline_run`** throws (e.g. missing tables), **`pipeline_run_id`** in the API response will be **null** and only **`ai_runs`** / **`evaluation` file logs** may still record partial info.

---

## 8. Backend ORM tables not on this list

FastAPI also defines **`saved_documents`** and **`audit_log`** (library/audit). They use the same engine; create them via `Base.metadata.create_all` or align with your migration strategy.

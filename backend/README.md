# Smart Inspections — FastAPI backend

## Hybrid CFR matching, grounding, and retrieval

The API supports **feature-flagged** upgrades over legacy fuzzy/substring behavior:

| Env / setting | Values | Purpose |
|---------------|--------|---------|
| `CFR_MATCH_MODE` | `fuzzy`, `semantic`, `hybrid` | How `CitationService.best_match` ranks Title 21 rows. Default `fuzzy` (legacy). Use `hybrid` for embedding + keyword merge. |
| `CFR_CONFIDENCE_THRESHOLD` | 0–1 | Minimum score for semantic/hybrid acceptance (default ~0.72). |
| `CFR_TOP_K` | int | Breadth of hybrid search. |
| `GROUNDING_MODE` | `substring`, `semantic`, `hybrid` | Evaluation + validation: `substring` = legacy; `hybrid` = substring **or** semantic similarity vs source notes. Default `substring`. |
| `GROUNDING_SIMILARITY_THRESHOLD` | 0–1 | Cosine similarity for semantic grounding (sentence-transformers). |
| `EVIDENCE_MODE` | `strict`, `balanced` | Prompt + scoring: `strict` weights verbatim evidence; `balanced` allows semantic rescue. |
| `USE_RETRIEVAL_FOR_GENERATION` | bool | If true, Phase 1 / Phase 2 prompts use **top-k retrieval** over note chunks + KB PDFs instead of only the first N characters. |

**Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (CPU) builds the CFR FAISS index under `{DATA_DIR}/.cfr_semantic_index` and powers semantic grounding. First run may download the model.

**Phase model:** **Phase 1** = Form 483 drafting from notes (`/api/ai/generate-observations`, `/api/ai/draft-483`). **Phase 2** = EIR narrative from approved 483 (`/api/ai/generate-eir`, `/api/ai/generate-eir-pipeline`). See `RegulatoryDraftingService` for a thin façade.

### Local end-to-end

1. Set `DATABASE_URL`, LLM keys, and optional `GROUNDING_MODE=hybrid`, `CFR_MATCH_MODE=hybrid`.
2. Place regulatory PDFs under the repo `data/` folder (same as `DATA_DIR`).
3. Run `uvicorn app.main:app --reload` from `backend/` with `PYTHONPATH` set if needed.
4. Call `POST /api/ai/generate-observations` with raw notes; inspect `evaluation.retrieval` and citation `retrieval_source` fields.

## Supabase pipeline logging (schema only)

DDL for persistent pipeline audit tables lives at **`../data/pipeline_logging_schema.sql`** (repo root `data/`). Apply against your Supabase Postgres with `psql` or the SQL Editor. Tables: `pipeline_runs`, `pipeline_run_observations`, `pipeline_run_chunks`, `pipeline_run_cfr_matches`, `pipeline_run_events`.

If `pipeline_runs` was created earlier without columns such as **`status`**, `CREATE TABLE IF NOT EXISTS` will not upgrade the table and inserts will fail. Run **`../data/pipeline_logging_migrate_to_current.sql`** once to add missing columns (idempotent).

**Writing logs:** use `app.services.pipeline_logging_service` (`create_pipeline_run`, `log_pipeline_event`, `log_observation_result`, `log_retrieved_chunks`, `log_cfr_candidates`, `finalize_pipeline_run`) with a SQLAlchemy `Session` from `Depends(get_db)`. Each helper commits so data persists when the request session closes.

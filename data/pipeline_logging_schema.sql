-- Pipeline logging tables for Smart Inspections FastAPI (Supabase / PostgreSQL).
-- Apply via: psql "$DATABASE_URL" -f data/pipeline_logging_schema.sql
-- Or: Supabase SQL Editor → paste and run.
--
-- If you already have `pipeline_runs` from an older revision (missing `status`, etc.),
-- run `data/pipeline_logging_migrate_to_current.sql` once before relying on ORM inserts.
--
-- Uses gen_random_uuid() (PostgreSQL 13+). JSONB columns hold flexible payloads from
-- generate-observations, draft-483, EIR, retrieval, and CFR matching.

-- =============================================================================
-- 1. pipeline_runs — one row per pipeline execution (API call / job)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id text,
  run_type text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT pipeline_runs_status_check CHECK (
    status IN ('running', 'success', 'failed', 'cancelled')
  )
);

COMMENT ON TABLE public.pipeline_runs IS 'Top-level pipeline run (Phase 1 483, Phase 2 EIR, etc.).';
COMMENT ON COLUMN public.pipeline_runs.run_type IS 'e.g. generate_observations, draft_483, generate_eir, generate_eir_pipeline';
COMMENT ON COLUMN public.pipeline_runs.request_payload IS 'Inbound request snapshot (raw_notes hash, options, cfr_parts, flags).';
COMMENT ON COLUMN public.pipeline_runs.response_summary IS 'High-level outcome: counts, doc_id, evaluation keys, retrieval flags.';
COMMENT ON COLUMN public.pipeline_runs.metadata IS 'Client version, model, environment tags.';

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_inspection_id ON public.pipeline_runs (inspection_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created_at ON public.pipeline_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_type ON public.pipeline_runs (run_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.pipeline_runs (status);

-- =============================================================================
-- 2. pipeline_run_observations — per-observation rows for a run
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_run_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL REFERENCES public.pipeline_runs (id) ON DELETE CASCADE,
  observation_index integer NOT NULL,
  observation_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_run_observations_unique_per_run UNIQUE (pipeline_run_id, observation_index)
);

COMMENT ON TABLE public.pipeline_run_observations IS 'DraftObservation / output row per index for a run.';
COMMENT ON COLUMN public.pipeline_run_observations.payload IS 'Full observation object or API row as stored.';
COMMENT ON COLUMN public.pipeline_run_observations.evaluation IS 'Per-row scores from evaluate_ai_output when present.';

CREATE INDEX IF NOT EXISTS idx_pro_obs_pipeline_run_id ON public.pipeline_run_observations (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pro_obs_observation_index ON public.pipeline_run_observations (observation_index);
CREATE INDEX IF NOT EXISTS idx_pro_obs_created_at ON public.pipeline_run_observations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_obs_observation_id ON public.pipeline_run_observations (observation_id);

-- =============================================================================
-- 3. pipeline_run_chunks — retrieved note / KB / regulatory chunks
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_run_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL REFERENCES public.pipeline_runs (id) ON DELETE CASCADE,
  observation_index integer,
  chunk_type text,
  source text,
  score double precision,
  content_preview text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipeline_run_chunks IS 'Top-k retrieval chunks (notes, IOM, reference PDFs).';
COMMENT ON COLUMN public.pipeline_run_chunks.observation_index IS 'NULL when chunk applies to whole run (e.g. EIR-level context).';
COMMENT ON COLUMN public.pipeline_run_chunks.payload IS 'Full chunk metadata: chunk_id, scores, raw text or hash refs.';

CREATE INDEX IF NOT EXISTS idx_prc_pipeline_run_id ON public.pipeline_run_chunks (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_prc_observation_index ON public.pipeline_run_chunks (observation_index);
CREATE INDEX IF NOT EXISTS idx_prc_created_at ON public.pipeline_run_chunks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prc_chunk_type ON public.pipeline_run_chunks (chunk_type);
CREATE INDEX IF NOT EXISTS idx_prc_pipeline_obs ON public.pipeline_run_chunks (pipeline_run_id, observation_index);

-- =============================================================================
-- 4. pipeline_run_cfr_matches — Title 21 / citation lookup results
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_run_cfr_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL REFERENCES public.pipeline_runs (id) ON DELETE CASCADE,
  observation_index integer NOT NULL,
  query text,
  retrieval_source text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipeline_run_cfr_matches IS 'CitationService / hybrid CFR match results per observation.';
COMMENT ON COLUMN public.pipeline_run_cfr_matches.payload IS 'Matched citation dict: citation, section_title, score, labels.';

CREATE INDEX IF NOT EXISTS idx_prcfr_pipeline_run_id ON public.pipeline_run_cfr_matches (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_prcfr_observation_index ON public.pipeline_run_cfr_matches (observation_index);
CREATE INDEX IF NOT EXISTS idx_prcfr_created_at ON public.pipeline_run_cfr_matches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prcfr_pipeline_obs ON public.pipeline_run_cfr_matches (pipeline_run_id, observation_index);

-- =============================================================================
-- 5. pipeline_run_events — append-only timeline (steps, warnings, metrics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL REFERENCES public.pipeline_runs (id) ON DELETE CASCADE,
  observation_index integer,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipeline_run_events IS 'Structured log: segmentation, retrieval fallback, validation issues.';
COMMENT ON COLUMN public.pipeline_run_events.observation_index IS 'NULL for run-level events.';
COMMENT ON COLUMN public.pipeline_run_events.event_type IS 'e.g. segment_start, retrieval_empty, cfr_fallback, eval_complete';

CREATE INDEX IF NOT EXISTS idx_pre_pipeline_run_id ON public.pipeline_run_events (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pre_observation_index ON public.pipeline_run_events (observation_index);
CREATE INDEX IF NOT EXISTS idx_pre_created_at ON public.pipeline_run_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_event_type ON public.pipeline_run_events (event_type);
CREATE INDEX IF NOT EXISTS idx_pre_pipeline_obs ON public.pipeline_run_events (pipeline_run_id, observation_index);

-- Optional: inspection_id denormalized query across runs (via pipeline_runs join is enough; add only if needed)
-- Composite for dashboard: runs by inspection + time
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_inspection_created ON public.pipeline_runs (inspection_id, created_at DESC);

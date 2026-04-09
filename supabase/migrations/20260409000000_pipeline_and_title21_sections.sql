-- Pipeline AI trace tables + Title 21 citation lookup (matches data/pipeline_logging_schema.sql
-- and data/title_21_sections_csv_schema.sql). Safe to re-run: CREATE IF NOT EXISTS.

-- ----- Title 21 (CitationService when TITLE21_SOURCE includes database) -----
CREATE TABLE IF NOT EXISTS public.title_21_sections (
  chapter_id text,
  chapter_label text,
  chapter_description text,
  subchapter_id text,
  subchapter_label text,
  subchapter_description text,
  part_id integer,
  part_label text,
  part_description text,
  subpart_id text,
  subpart_label text,
  subpart_description text,
  section_number text,
  section_label text,
  section_level text,
  section_title text,
  citation text,
  reserved text,
  volumes text,
  received_on timestamptz,
  size integer,
  "text" text
);

CREATE INDEX IF NOT EXISTS idx_title_21_sections_citation ON public.title_21_sections (citation);
CREATE INDEX IF NOT EXISTS idx_title_21_sections_section_number ON public.title_21_sections (section_number);

COMMENT ON TABLE public.title_21_sections IS 'Import from data/title-21-sections.csv for CFR resolution in FastAPI CitationService.';

-- ----- Pipeline logging (RAG chunks, LLM outputs, CFR candidates) -----
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

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_inspection_id ON public.pipeline_runs (inspection_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created_at ON public.pipeline_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_type ON public.pipeline_runs (run_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.pipeline_runs (status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_inspection_created ON public.pipeline_runs (inspection_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_pro_obs_pipeline_run_id ON public.pipeline_run_observations (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pro_obs_observation_index ON public.pipeline_run_observations (observation_index);

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

CREATE INDEX IF NOT EXISTS idx_prc_pipeline_run_id ON public.pipeline_run_chunks (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_prc_observation_index ON public.pipeline_run_chunks (observation_index);
CREATE INDEX IF NOT EXISTS idx_prc_pipeline_obs ON public.pipeline_run_chunks (pipeline_run_id, observation_index);

CREATE TABLE IF NOT EXISTS public.pipeline_run_cfr_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL REFERENCES public.pipeline_runs (id) ON DELETE CASCADE,
  observation_index integer NOT NULL,
  query text,
  retrieval_source text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prcfr_pipeline_run_id ON public.pipeline_run_cfr_matches (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_prcfr_pipeline_obs ON public.pipeline_run_cfr_matches (pipeline_run_id, observation_index);

CREATE TABLE IF NOT EXISTS public.pipeline_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL REFERENCES public.pipeline_runs (id) ON DELETE CASCADE,
  observation_index integer,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_pipeline_run_id ON public.pipeline_run_events (pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_pre_event_type ON public.pipeline_run_events (event_type);
CREATE INDEX IF NOT EXISTS idx_pre_pipeline_obs ON public.pipeline_run_events (pipeline_run_id, observation_index);

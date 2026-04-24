-- Idempotent migration: bring an older `pipeline_runs` (and related) schema up to date.
-- `CREATE TABLE IF NOT EXISTS` does not add new columns when the table already exists,
-- which causes ORM inserts to fail with: column "status" of relation "pipeline_runs" does not exist.
--
-- Apply once on PostgreSQL / Supabase:
--   psql "$DATABASE_URL" -f data/pipeline_logging_migrate_to_current.sql
-- Or paste into Supabase SQL Editor and run.

-- -----------------------------------------------------------------------------
-- pipeline_runs — add any columns missing vs. pipeline_logging_schema.sql
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs'
  ) THEN
    RAISE NOTICE 'public.pipeline_runs does not exist; apply data/pipeline_logging_schema.sql first.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.pipeline_runs
      ADD COLUMN status text NOT NULL DEFAULT 'running';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'request_payload'
  ) THEN
    ALTER TABLE public.pipeline_runs
      ADD COLUMN request_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'response_summary'
  ) THEN
    ALTER TABLE public.pipeline_runs
      ADD COLUMN response_summary jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.pipeline_runs
      ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.pipeline_runs ADD COLUMN error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_runs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.pipeline_runs ADD COLUMN completed_at timestamptz;
  END IF;

  UPDATE public.pipeline_runs SET status = 'running' WHERE status IS NULL;

  ALTER TABLE public.pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_status_check;
  ALTER TABLE public.pipeline_runs
    ADD CONSTRAINT pipeline_runs_status_check CHECK (
      status IN ('running', 'success', 'failed', 'cancelled')
    );

  CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.pipeline_runs (status);
  CREATE INDEX IF NOT EXISTS idx_pipeline_runs_inspection_created ON public.pipeline_runs (inspection_id, created_at DESC);
END $$;

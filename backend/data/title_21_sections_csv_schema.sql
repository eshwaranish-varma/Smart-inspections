-- Matches data/title-21-sections.csv header (line 1).
-- Import this table via Supabase Table Editor → Import, or psql \copy.
-- Note: column "text" is quoted because TEXT is a reserved word in PostgreSQL.

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

COMMENT ON TABLE public.title_21_sections IS 'Title 21 sections from title-21-sections.csv (not the same shape as title_21_CFR embedding dump).';

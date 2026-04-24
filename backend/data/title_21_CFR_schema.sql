-- Run this ONCE in Supabase SQL Editor (or psql) BEFORE importing title_21_CFR_rows.sql
-- Matches: INSERT INTO "public"."title_21_CFR" ("citation", "section_number", ...)

CREATE TABLE IF NOT EXISTS public.title_21_CFR (
  citation text NOT NULL,
  section_number text,
  section_label text,
  section_title text,
  chapter_id text,
  chapter_label text,
  subchapter_id text,
  subchapter_label text,
  part_id integer,
  part_label text,
  subpart_id text,
  subpart_label text,
  received_on timestamptz,
  size integer,
  -- Dump stores embedding as a bracketed float array string, e.g. '[0.04,...]'
  embedding text
);

COMMENT ON TABLE public.title_21_CFR IS 'Title 21 CFR rows with optional embedding text; import via title_21_CFR_rows.sql';

"use client";

import type { DraftObservation } from "@/types/inspection";

type Props = {
  observations: DraftObservation[];
  loading?: boolean;
  className?: string;
};

function ObservationBlock({ observation, index }: { observation: DraftObservation; index: number }) {
  return (
    <article className="rounded-xl border border-slate-100 bg-slate-50/90 dark:border-white/10 dark:bg-slate-800/40">
      <div className="border-b border-slate-100 px-4 py-2 dark:border-white/10">
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-700 dark:text-cyan-300">
          Observation {index + 1}
        </span>
      </div>
      <div className="space-y-4 p-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Observation
          </h3>
          <div className="rounded-lg bg-white/90 p-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-900/50 dark:text-slate-100">
            {observation.observation_text || "—"}
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Evidence
          </h3>
          <ul className="list-inside list-disc space-y-1.5 rounded-lg bg-white/90 p-3 text-sm text-slate-800 dark:bg-slate-900/50 dark:text-slate-100">
            {(observation.evidence_list?.length ? observation.evidence_list : ["—"]).map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Title 21 CFR citation
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white p-3 font-mono text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-cyan-200">
            {observation.cfr_citation || "—"}
            {(observation.citation_volume_label ||
              observation.citation_part_label ||
              observation.citation_chapter_label ||
              observation.citation_subchapter_label) && (
              <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {observation.citation_volume_label ? <span>Volume: {observation.citation_volume_label} · </span> : null}
                {observation.citation_chapter_label ? <span>{observation.citation_chapter_label} · </span> : null}
                {observation.citation_subchapter_label ? <span>{observation.citation_subchapter_label} · </span> : null}
                {observation.citation_part_label ? <span>{observation.citation_part_label}</span> : null}
              </p>
            )}
            {observation.matched_citation ? (
              <p className="mt-2 font-sans text-xs text-slate-500 dark:text-slate-400">
                Matched reference: {observation.matched_citation}
                {observation.citation_title ? <span> — {observation.citation_title}</span> : null}
                {observation.citation_match_score != null ? (
                  <span> · score {Number(observation.citation_match_score).toFixed(2)} (≥0.95 required for auto-match)</span>
                ) : null}
              </p>
            ) : observation.cfr_citation?.trim() ? (
              <p className="mt-2 font-sans text-xs text-amber-700 dark:text-amber-300">
                No Title 21 reference match at ≥0.95 — verify the citation or extend the CFR dataset.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  );
}

export default function DocumentViewer({ observations, loading, className = "" }: Props) {
  if (loading) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none ${className}`}
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading draft…</p>
      </div>
    );
  }

  if (!observations.length) {
    return (
      <div
        className={`rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none ${className}`}
      >
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          No draft observations to display. Load a document by ID or generate observations from New Inspection.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex max-h-[min(80vh,900px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none ${className}`}
    >
      <div className="border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Generated draft</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {observations.length} observation{observations.length === 1 ? "" : "s"} (FDA 483–style fields)
        </p>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {observations.map((obs, i) => (
          <ObservationBlock key={obs.id || `obs-${i}`} observation={obs} index={i} />
        ))}
      </div>
    </div>
  );
}

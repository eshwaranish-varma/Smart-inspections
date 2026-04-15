"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Database,
  FileSearch,
  Loader2,
  Scale,
  Sparkles,
} from "lucide-react";
import { getPipelineObservationExplain } from "@/lib/api";
import type { ObservationExplainabilityResponse, DraftObservation } from "@/types/inspection";

function pct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return v <= 1 ? `${Math.round(Number(v) * 100)}%` : `${Math.round(Number(v))}%`;
}

function ScoreBadge({ value, label }: { value: number | null | undefined; label: string }) {
  const n = Number(value ?? 0);
  const normalized = n <= 1 ? n * 100 : n;
  const color =
    normalized >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
      : normalized >= 50
        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";

  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{pct(value)}</p>
    </div>
  );
}

type Props = {
  pipelineRunId: string | null | undefined;
  observationIndex: number;
  observation: DraftObservation;
};

export default function ObservationExplainabilityPanel({
  pipelineRunId,
  observationIndex,
  observation,
}: Props) {
  const [data, setData] = useState<ObservationExplainabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    setExpanded(false);
  }, [pipelineRunId, observationIndex]);

  const loadExplainability = () => {
    if (!pipelineRunId) {
      setError("No pipeline run ID — generate observations through the AI pipeline first.");
      return;
    }
    setLoading(true);
    setError(null);
    getPipelineObservationExplain(pipelineRunId, observationIndex)
      .then((d) => {
        setData(d);
        setExpanded(true);
      })
      .catch(() => setError("Could not load explainability data for this observation."))
      .finally(() => setLoading(false));
  };

  const evidence = data?.evidence_used ?? observation.evidence_list ?? [];
  const groundingTypes = observation.evidence_grounding_types ?? [];
  const cfr = data?.matched_cfr ?? observation.matched_citation ?? observation.cfr_citation ?? null;
  const cfrScore = data?.cfr_score ?? observation.citation_match_score ?? null;
  const chunks = data?.retrieved_chunks ?? [];
  const confidence = data?.confidence ?? observation.confidence ?? observation.confidence_score ?? null;
  const breakdown = data?.confidence_breakdown ?? observation.confidence_breakdown ?? null;
  const grounding = data?.grounding ?? {};

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white dark:border-indigo-900/40 dark:from-slate-950/60 dark:to-slate-900/40">
      <button
        type="button"
        onClick={() => {
          if (!data && !loading && !error) {
            loadExplainability();
          } else {
            setExpanded(!expanded);
          }
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-indigo-900 dark:text-indigo-200"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Explainability trace
        </span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {error && (
        <p className="px-4 pb-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {expanded && (data || !pipelineRunId) && (
        <div className="space-y-4 border-t border-indigo-200/60 px-4 py-4 dark:border-indigo-900/30">
          {/* Step 1: Observation */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <FileSearch className="h-3.5 w-3.5" /> Observation
            </h4>
            <p className="mt-1 rounded-lg bg-white/80 p-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
              {observation.observation_text}
            </p>
          </div>

          {/* Step 2: Evidence used */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <BookOpen className="h-3.5 w-3.5" /> Evidence used ({evidence.length})
            </h4>
            {evidence.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">No evidence data available.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {evidence.map((ev, i) => {
                  const gt = groundingTypes[i];
                  const badge = gt === "exact_match"
                    ? { label: "Exact match", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" }
                    : gt === "fuzzy_match"
                      ? { label: "Fuzzy match", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" }
                      : gt === "extracted_fallback"
                        ? { label: "Extracted fallback", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" }
                        : null;
                  return (
                    <li
                      key={i}
                      className="flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-white/60 px-3 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300"
                    >
                      <span className="flex-1">{typeof ev === "string" ? ev : JSON.stringify(ev)}</span>
                      {badge && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Step 3: CFR matched */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Scale className="h-3.5 w-3.5" /> CFR matched
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-md border border-slate-200 bg-white/60 px-3 py-1.5 font-mono text-sm dark:border-white/10 dark:bg-slate-900/50">
                {cfr || "—"}
              </span>
              {cfrScore != null && (
                <span className="text-xs font-medium text-slate-500">
                  Match score: <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{pct(cfrScore)}</span>
                </span>
              )}
            </div>
            {data?.cfr_candidates && data.cfr_candidates.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {data.cfr_candidates.length} candidate(s) considered
                </summary>
                <ul className="mt-1 space-y-1 pl-4">
                  {data.cfr_candidates.map((c, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-400">
                      {String(c.citation || c.label || JSON.stringify(c))}
                      {c.score != null && (
                        <span className="ml-2 tabular-nums text-slate-400">({pct(Number(c.score))})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Step 4: Retrieved chunks */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Database className="h-3.5 w-3.5" /> Retrieved chunks ({chunks.length})
            </h4>
            {chunks.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                {pipelineRunId ? "No retrieval chunks recorded." : "Run via AI pipeline to enable chunk tracing."}
              </p>
            ) : (
              <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                {chunks.map((chunk, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-slate-200 bg-white/60 px-3 py-2 text-xs dark:border-white/10 dark:bg-slate-900/50"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {String(chunk.source || chunk.chunk_id || `Chunk ${i + 1}`)}
                    </span>
                    {chunk.score != null && (
                      <span className="ml-2 text-slate-400 tabular-nums">score: {Number(chunk.score).toFixed(3)}</span>
                    )}
                    {chunk.text != null && String(chunk.text).trim() !== "" ? (
                      <p className="mt-1 line-clamp-3 text-slate-600 dark:text-slate-400">{String(chunk.text)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Step 5: Confidence score + breakdown */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5" /> Confidence
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ScoreBadge value={confidence} label="Overall" />
              {breakdown &&
                Object.entries(breakdown).map(([key, val]) => (
                  <ScoreBadge key={key} value={val as number} label={key.replace(/_/g, " ")} />
                ))}
            </div>
            {data?.grounding_mode && (
              <p className="mt-2 text-xs text-slate-500">
                Grounding mode: <span className="font-medium">{data.grounding_mode}</span>
              </p>
            )}
            {Object.keys(grounding).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Grounding detail
                </summary>
                <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-slate-100 p-2 text-[10px] text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {JSON.stringify(grounding, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

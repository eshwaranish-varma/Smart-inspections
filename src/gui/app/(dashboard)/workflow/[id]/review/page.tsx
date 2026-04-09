"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { DraftObservation } from "@/types/inspection";

function confidencePct(obs: DraftObservation): number {
  const c = obs.confidence_score;
  if (c == null || Number.isNaN(Number(c))) return 0;
  return c <= 1 ? Math.round(Number(c) * 100) : Math.round(Number(c));
}

function evidenceBadge(obs: DraftObservation) {
  const v = obs.validation;
  if (v?.evidence_linked) return { label: "Linked", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (v?.evidence_linked === false) return { label: "Partial", className: "bg-amber-50 text-amber-900 border-amber-200" };
  const grounded = (obs.evidence_list || []).length > 0;
  return grounded
    ? { label: "Present", className: "bg-slate-50 text-slate-800 border-slate-200" }
    : { label: "Missing", className: "bg-red-50 text-red-800 border-red-200" };
}

export default function WorkflowAiReviewPage() {
  const params = useParams();
  const id = params.id as string;
  const [observations, setObservations] = useState<DraftObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/inspections/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        let obs: DraftObservation[] = [];
        try {
          obs = JSON.parse(d.inspection?.observations_json || "[]") as DraftObservation[];
        } catch {
          obs = [];
        }
        setObservations(obs);
      })
      .catch(() => {
        if (!cancelled) setObservations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const selectedObs = selected != null ? observations[selected] : null;

  const trace = useMemo(() => {
    if (!selectedObs) return null;
    return {
      observation_id: selectedObs.id,
      cfr: selectedObs.cfr_reference || selectedObs.cfr_citation,
      evidence: selectedObs.evidence_sources?.length
        ? selectedObs.evidence_sources
        : (selectedObs.evidence_list || []).map((t, i) => ({
            file_id: "evidence",
            page: i + 1,
            highlight_text: t,
          })),
    };
  }, [selectedObs]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/workflow/${id}`}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI validation review</h1>
          <p className="text-sm text-gray-500">Observation-level CFR, evidence, and confidence</p>
        </div>
      </div>

      {observations.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          No observations saved for this inspection yet. Complete drafting in New Inspection first.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Observations</h2>
            {observations.map((obs, idx) => (
              <button
                key={obs.id || String(idx)}
                type="button"
                onClick={() => setSelected(idx)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selected === idx
                    ? "border-navy-500 bg-navy-50 dark:border-cyan-600 dark:bg-slate-800"
                    : "border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-slate-900/40 dark:hover:bg-slate-800"
                }`}
              >
                <span className="font-semibold text-gray-900 dark:text-white">Observation {idx + 1}</span>
                <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-slate-400">{obs.observation_text}</p>
              </button>
            ))}
          </div>

          {selectedObs && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/50 lg:col-span-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Observation card</h2>
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 dark:bg-slate-950/50 dark:text-slate-100">
                {selectedObs.observation_text}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase text-slate-500">CFR</p>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedObs.validation?.cfr_valid !== false ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-mono text-sm">{selectedObs.cfr_citation || "—"}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase text-slate-500">Evidence</p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${evidenceBadge(selectedObs).className}`}
                  >
                    {evidenceBadge(selectedObs).label}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase text-slate-500">Confidence</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{confidencePct(selectedObs)}%</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase text-slate-500">Language</p>
                  <p className="mt-1 text-sm capitalize">{selectedObs.validation?.language_quality || "—"}</p>
                </div>
              </div>

              {selectedObs.validation?.issues && selectedObs.validation.issues.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
                  <p className="text-xs font-semibold uppercase text-amber-900 dark:text-amber-200">Issues</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950 dark:text-amber-100/90">
                    {selectedObs.validation.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {trace && (
                <div className="rounded-lg border border-navy-200 bg-navy-50/50 p-4 dark:border-cyan-900/40 dark:bg-slate-950/40">
                  <p className="text-sm font-semibold text-navy-900 dark:text-cyan-200">Traceability</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Observation <span className="font-mono">{trace.observation_id}</span> → Evidence →{" "}
                    <span className="font-mono">{trace.cfr || "—"}</span>
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {trace.evidence.map((ev, i) => (
                      <li key={i} className="rounded-md border border-white/40 bg-white/80 p-2 dark:bg-slate-900/60">
                        <span className="text-xs text-slate-500">Page {ev.page}</span>
                        <p className="mt-1 text-slate-800 dark:text-slate-100">{ev.highlight_text}</p>
                        <Link
                          href={`/workflow/${id}/document-review?page=${ev.page}`}
                          onClick={() => {
                            try {
                              sessionStorage.setItem(
                                `si:docReviewEvidence:${id}`,
                                JSON.stringify({
                                  page: ev.page,
                                  text: typeof ev.highlight_text === "string" ? ev.highlight_text : "",
                                })
                              );
                            } catch {
                              /* quota / private mode */
                            }
                          }}
                          className="mt-2 inline-block text-xs font-medium text-navy-700 underline dark:text-cyan-300"
                        >
                          Open document workspace
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/evaluation/${id}`}
          className="inline-flex rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
        >
          Evaluation dashboard
        </Link>
        <Link
          href={`/workflow/${id}/document-review`}
          className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Document review workspace
        </Link>
      </div>
    </div>
  );
}

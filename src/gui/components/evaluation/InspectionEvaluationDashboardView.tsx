"use client";

import Link from "next/link";
import { ClipboardCopy, Loader2 } from "lucide-react";
import MetricCard from "@/components/ui/metric-card";
import type { InspectionEvaluationDashboard } from "@/types/inspection";

type Props = {
  inspectionId: string;
  data: InspectionEvaluationDashboard | null;
  loading: boolean;
  error: string | null;
};

export default function InspectionEvaluationDashboardView({ inspectionId, data, loading, error }: Props) {
  return (
    <div className="space-y-8">
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-navy-600 dark:text-cyan-400" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard title="OCR accuracy" value={data.ocr_accuracy} subtitle="Alignment vs source / ground truth" />
            <MetricCard title="CFR match %" value={data.cfr_match_score} subtitle="Title 21 citation verification" />
            <MetricCard
              title="Evidence coverage"
              value={data.evidence_coverage}
              subtitle="Micro F1: evidence precision × observation recall"
            />
            <MetricCard title="Template compliance" value={data.template_score} subtitle="483 structural completeness" />
            <div className="rounded-xl border-2 border-navy-200 bg-navy-50/80 p-4 dark:border-cyan-900/40 dark:bg-slate-900/80 sm:col-span-2 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-700 dark:text-cyan-300">Overall score</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-navy-900 dark:text-white">{data.overall_score}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Weighted across linked AI evaluation runs</p>
            </div>
          </div>

          {/* Enhanced grounding + confidence metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.grounding_precision != null && (
              <MetricCard title="Grounding precision" value={data.grounding_precision} subtitle="Evidence bullets verified in source" />
            )}
            {data.grounding_recall != null && (
              <MetricCard title="Grounding recall" value={data.grounding_recall} subtitle="Observations with ≥1 evidence match" />
            )}
            {data.grounding_f1 != null && (
              <MetricCard title="Grounding F1" value={data.grounding_f1} subtitle="Harmonic mean of precision × recall" />
            )}
            {data.avg_confidence != null && (
              <MetricCard title="Avg confidence" value={data.avg_confidence} subtitle="Pipeline confidence per observation" />
            )}
          </div>

          {(data.observation_count != null || data.total_chunks != null) && (
            <div className="flex flex-wrap gap-4">
              {data.observation_count != null && data.observation_count > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Observations evaluated</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{data.observation_count}</p>
                </div>
              )}
              {data.total_chunks != null && data.total_chunks > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Retrieval chunks</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{data.total_chunks}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Source evidence fragments linked</p>
                </div>
              )}
            </div>
          )}

          <details className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
            <summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">
              How evidence coverage (precision, recall, F1) is calculated
            </summary>
            <div className="mt-3 space-y-2 text-xs leading-relaxed">
              <p>
                Each string in <code className="rounded bg-white/80 px-1 dark:bg-slate-800">evidence_list</code> is checked
                against the full raw inspection notes: after trim, the bullet must appear as a{" "}
                <strong>case-insensitive substring</strong> of the notes (minimum length 3 characters).
              </p>
              <p>
                <strong>Precision</strong> (per observation and micro-averaged): TP / (TP + FP), where TP = bullets that
                match the notes, FP = bullets that do not. If there are no bullets, precision is treated as 1.0.
              </p>
              <p>
                <strong>Recall</strong> (per observation): 1.0 if at least one bullet matches the notes; otherwise 0.0.
                Run-level recall is the average of these observation values.
              </p>
              <p>
                <strong>F1</strong> is the harmonic mean of precision and recall for that step; the dashboard shows
                micro-averaged grounding F1 unless the API exposes a different aggregate.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Paraphrased or summarized bullets often fail this check even when factually correct—use verbatim excerpts
                from the notes for evidence lines, or run a second draft with the copied feedback below.
              </p>
            </div>
          </details>

          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Hallucination & quality flags</p>
              {data.hallucination_flags?.some((x) => !x.includes("No automatic")) ? (
                <button
                  type="button"
                  onClick={() => {
                    const text = (data.hallucination_flags || []).filter(Boolean).join("\n");
                    void navigator.clipboard.writeText(text);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white/80 px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100/80 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/40"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy for second-pass draft
                </button>
              ) : null}
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950 dark:text-amber-100/90">
              {data.hallucination_flags?.length ? (
                data.hallucination_flags.map((f, i) => <li key={i}>{f}</li>)
              ) : (
                <li>No flags recorded.</li>
              )}
            </ul>
            <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/80">
              Paste the copied text into the generate-observations request as{" "}
              <code className="rounded bg-white/60 px-1 dark:bg-slate-900/80">refinement_feedback</code> (same raw notes)
              to ask the model to fix grounding without repeating the same mistakes.
            </p>
          </div>

          {data.per_document?.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Per-document metrics</h2>
              <div className="space-y-3">
                {data.per_document.map((row) => (
                  <div
                    key={row.document_id}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-white/10 dark:bg-slate-900/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-500">{row.document_id}</span>
                      <span className="text-xs text-slate-400">{row.created_at || ""}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">OCR</p>
                        <p className="font-semibold">{row.ocr_accuracy}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">CFR</p>
                        <p className="font-semibold">{row.cfr_match_score}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Evidence</p>
                        <p className="font-semibold">{row.evidence_coverage}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Template</p>
                        <p className="font-semibold">{row.template_score}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Overall</p>
                        <p className="font-semibold text-navy-700 dark:text-cyan-300">{row.overall_score}%</p>
                      </div>
                    </div>
                    {(row.grounding_precision != null || row.grounding_recall != null || row.grounding_f1 != null) && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {row.grounding_precision != null && (
                          <div>
                            <p className="text-[10px] uppercase text-slate-500">Precision</p>
                            <p className="text-xs font-semibold">{row.grounding_precision}%</p>
                          </div>
                        )}
                        {row.grounding_recall != null && (
                          <div>
                            <p className="text-[10px] uppercase text-slate-500">Recall</p>
                            <p className="text-xs font-semibold">{row.grounding_recall}%</p>
                          </div>
                        )}
                        {row.grounding_f1 != null && (
                          <div>
                            <p className="text-[10px] uppercase text-slate-500">F1</p>
                            <p className="text-xs font-semibold">{row.grounding_f1}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/workflow/${encodeURIComponent(inspectionId)}`}
              className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to workflow
            </Link>
            <Link
              href={`/workflow/${encodeURIComponent(inspectionId)}/review`}
              className="inline-flex rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
            >
              Open AI validation review
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

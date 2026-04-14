"use client";

import type { EvaluationScores, ObservationEvalScores } from "@/types/inspection";
import { Check, X } from "lucide-react";

type Props = {
  scores: EvaluationScores | null;
  loading?: boolean;
  className?: string;
};

function MetricRow({
  label,
  ok,
  value,
  isPercent,
  naHint,
}: {
  label: string;
  ok?: boolean;
  value?: number | null;
  isPercent?: boolean;
  /** Shown under the row when value is N/A (e.g. OCR without ground truth). */
  naHint?: string;
}) {
  const pct =
    isPercent && value != null
      ? Math.round(value * 100)
      : value != null && !isPercent
        ? Math.round(value * 100)
        : null;
  const showBar = ok !== undefined;
  const boolPct = showBar ? (ok ? 100 : 0) : null;
  const barPct =
    showBar && boolPct != null
      ? boolPct
      : pct != null
        ? Math.min(100, Math.max(0, pct))
        : 0;
  const ocrMissing = isPercent && value == null;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <div className="flex items-center gap-2">
            {showBar && boolPct != null ? (
              <>
                <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{boolPct}%</span>
                {ok ? (
                  <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Pass" />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" aria-label="Fail" />
                )}
              </>
            ) : pct != null ? (
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{pct}%</span>
            ) : (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">N/A</span>
            )}
          </div>
          {naHint &&
          (ocrMissing || (ok === undefined && pct == null && !showBar)) ? (
            <span className="max-w-[14rem] text-[11px] leading-tight text-slate-400 dark:text-slate-500">{naHint}</span>
          ) : null}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${
            showBar
              ? ok
                ? "bg-emerald-500 dark:bg-emerald-500"
                : "bg-red-400 dark:bg-red-500"
              : ocrMissing
                ? "bg-slate-300/80 dark:bg-slate-600"
                : barPct >= 70
                  ? "bg-emerald-500"
                  : barPct >= 40
                    ? "bg-amber-500"
                    : "bg-red-400"
          }`}
          style={{ width: `${showBar ? barPct : ocrMissing ? 0 : pct != null ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

function ObservationMetricsCard({ item }: { item: ObservationEvalScores }) {
  const overallPct = Math.round(item.overall * 100);
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-800/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-navy-800 dark:text-cyan-200">
          Observation {item.observation_index + 1}
        </span>
        <span className="text-lg font-bold tabular-nums text-navy-700 dark:text-cyan-300">{overallPct}%</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
        <div
          className={`h-full rounded-full ${
            overallPct >= 70 ? "bg-emerald-500" : overallPct >= 40 ? "bg-amber-500" : "bg-red-400"
          }`}
          style={{ width: `${overallPct}%` }}
        />
      </div>
      <div className="space-y-4">
        <MetricRow label="Structure" ok={item.structure} />
        <MetricRow
          label="CFR valid"
          ok={item.cfr_metric_applicable === false ? undefined : item.cfr_valid}
          naHint={
            item.cfr_metric_applicable === false
              ? "No cfr_parts in request — CFR subscore excluded from overall mean."
              : undefined
          }
        />
        <MetricRow label="Grounded (≥1 evidence in source)" ok={item.grounded} />
        <MetricRow label="Evidence precision (supported / all bullets)" value={item.evidence_precision} isPercent />
        <MetricRow label="Grounding recall (anchor in notes)" value={item.grounding_recall} isPercent />
        <MetricRow label="Grounding F1 (precision × recall)" value={item.grounding_f1} isPercent />
        <MetricRow label="Narrative grounding (token overlap)" value={item.narrative_grounding_ratio} isPercent />
        <MetricRow
          label="OCR / text accuracy (vs ground truth)"
          value={item.ocr_accuracy}
          isPercent
          naHint="Not computed — send optional ground_truth with generate-observations to score WER."
        />
      </div>
    </div>
  );
}

/** Legacy single-block layout when API did not return observations[]. */
function LegacyMetrics({ scores }: { scores: EvaluationScores }) {
  const overallPct = Math.round(scores.overall * 100);
  return (
    <>
      <section className="rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 dark:from-slate-800/50 dark:to-slate-900/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-white">Overall score</span>
          <span className="text-2xl font-bold tabular-nums text-navy-700 dark:text-cyan-300">{overallPct}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
          <div
            className={`h-full rounded-full ${
              overallPct >= 70 ? "bg-emerald-500" : overallPct >= 40 ? "bg-amber-500" : "bg-red-400"
            }`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </section>
      <MetricRow label="Structure (observation, evidence, CFR)" ok={scores.structure} />
      <MetricRow
        label="CFR valid (Title 21 pattern)"
        ok={scores.cfr_metric_applicable === false ? undefined : (scores.cfr_valid ?? false)}
        naHint={
          scores.cfr_metric_applicable === false
            ? "No cfr_parts in request — CFR aggregate not scored."
            : undefined
        }
      />
      <MetricRow label="Grounded (evidence in source notes)" ok={scores.grounded} />
      <MetricRow
        label="OCR / text accuracy (vs ground truth)"
        value={scores.ocr_accuracy}
        isPercent
        naHint="Not computed — send optional ground_truth with generate-observations to score WER."
      />
    </>
  );
}

export default function EvaluationPanel({ scores, loading, className = "" }: Props) {
  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 ${className}`}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!scores) {
    return (
      <div
        className={`rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 ${className}`}
      >
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">No evaluation scores yet.</p>
      </div>
    );
  }

  const perObs =
    scores.observations != null && scores.observations.length > 0 ? scores.observations : null;
  const runOverallPct = Math.round(scores.overall * 100);

  return (
    <div
      className={`flex max-h-[min(80vh,900px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none ${className}`}
    >
      <div className="border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Evaluation metrics</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {perObs
            ? `Per-observation scores (${perObs.length} observation${perObs.length === 1 ? "" : "s"}) plus run summary`
            : "Structure, CFR, grounding, optional OCR/WER"}
        </p>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {perObs ? (
          <>
            <section className="rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 dark:from-slate-800/50 dark:to-slate-900/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">Run summary</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mean across all observations in this draft</p>
                </div>
                <span className="text-2xl font-bold tabular-nums text-navy-700 dark:text-cyan-300">{runOverallPct}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${
                    runOverallPct >= 70 ? "bg-emerald-500" : runOverallPct >= 40 ? "bg-amber-500" : "bg-red-400"
                  }`}
                  style={{ width: `${runOverallPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Structure (all pass): {scores.structure ? "100%" : "0%"} · CFR (all pass):{" "}
                {scores.cfr_metric_applicable === false
                  ? "N/A"
                  : scores.cfr_valid
                    ? "100%"
                    : "0%"}{" "}
                · Grounding (all pass): {scores.grounded ? "100%" : "0%"}
                {scores.ocr_accuracy != null
                  ? ` · Mean OCR: ${Math.round(scores.ocr_accuracy * 100)}%`
                  : " · OCR: N/A (no ground truth)"}
              </p>
              {scores.segmentation_warning ? (
                <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Segmentation warning: period-based heuristic suggests possible merge of distinct issues — mapping
                  counts alone may look fine.
                </p>
              ) : scores.segmentation_valid === true ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Segmentation heuristic: no merge signal from raw text vs. segment count.
                </p>
              ) : null}
              {scores.observation_count_mismatch ? (
                <p className="mt-2 text-xs font-bold text-red-700 dark:text-red-300">
                  ⚠️ Observation count mismatch detected — AI output split observations incorrectly. Review before publishing.
                </p>
              ) : null}
              {scores.grounding_f1_micro != null ? (
                <div className="mt-3 rounded-lg border border-slate-100 bg-white/90 p-3 text-xs dark:border-white/10 dark:bg-slate-800/60">
                  <p className="font-semibold text-slate-800 dark:text-white">Run-level grounding (micro)</p>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                    Evidence precision: {Math.round((scores.grounding_precision_micro ?? 0) * 100)}% · Recall:{" "}
                    {Math.round((scores.grounding_recall_micro ?? 0) * 100)}% · F1:{" "}
                    {Math.round((scores.grounding_f1_micro ?? 0) * 100)}% · Narrative overlap avg:{" "}
                    {Math.round((scores.narrative_grounding_avg ?? 0) * 100)}%
                    {scores.evidence_tp_total != null && scores.evidence_fp_total != null ? (
                      <span>
                        {" "}
                        · Evidence TP/FP: {scores.evidence_tp_total}/{scores.evidence_fp_total}
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </section>
            <div className="space-y-4">
              {perObs.map((item) => (
                <ObservationMetricsCard key={item.observation_index} item={item} />
              ))}
            </div>
          </>
        ) : (
          <LegacyMetrics scores={scores} />
        )}
      </div>
    </div>
  );
}

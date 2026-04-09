"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { confidenceBandLabel, METRIC_LABELS } from "@/lib/evaluationDemoLabels";
import type { DraftObservation, GenerateObservationsResponse, PipelineStatusSummary } from "@/types/inspection";

const CHART_COLORS = {
  Pass: "#10b981",
  Warning: "#f59e0b",
  Failed: "#ef4444",
};

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md shadow-slate-200/30 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function FlagRow({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm",
        warn
          ? "border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100"
          : "border-slate-200 bg-slate-50/80 text-slate-800 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200"
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="tabular-nums font-semibold">{value}</span>
    </div>
  );
}

function summaryFromData(data: GenerateObservationsResponse): PipelineStatusSummary | null {
  return data.metrics?.summary ?? data.summary ?? data.evaluation?.summary ?? data.evaluation?.metrics?.summary ?? null;
}

function metricsFromData(data: GenerateObservationsResponse) {
  return data.metrics ?? data.evaluation?.metrics ?? null;
}

/** Map API token to Tailwind (pipeline_status_color is green | yellow | red). */
function pipelineColorClass(token?: string | null) {
  if (token === "green") return "text-emerald-600 dark:text-emerald-400";
  if (token === "yellow") return "text-amber-600 dark:text-amber-400";
  if (token === "red") return "text-red-600 dark:text-red-400";
  return "text-slate-700 dark:text-slate-300";
}

function humanizeReason(reason: string | null | undefined) {
  if (!reason) return "—";
  return reason.replace(/_/g, " ");
}

type Props = {
  data: GenerateObservationsResponse;
  className?: string;
};

export default function PipelineRunDashboard({ data, className = "" }: Props) {
  const metrics = metricsFromData(data);
  const summary = summaryFromData(data);
  const segValid = data.segmentation_valid ?? data.evaluation?.segmentation_valid;
  const segWarning = data.segmentation_warning ?? data.evaluation?.segmentation_warning;
  const segNote = data.segmentation_note ?? data.evaluation?.segmentation_note;
  const pipelineIntegrity = data.pipeline_integrity ?? data.evaluation?.pipeline_integrity;

  const chartData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Pass", value: summary.pass, fill: CHART_COLORS.Pass },
      { name: "Warning", value: summary.warning, fill: CHART_COLORS.Warning },
      { name: "Failed", value: summary.failed, fill: CHART_COLORS.Failed },
    ];
  }, [summary]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tpPct = metrics ? `${(metrics.true_positive_rate * 100).toFixed(1)}%` : "—";
  const ev = metrics?.evidence_score;
  const evidenceLabel =
    ev == null ? "N/A" : `${(ev * 100).toFixed(1)}%`;
  const evidenceHint = ev == null ? "Not computed for this run" : undefined;

  const cfrValid = metrics?.cfr_valid ?? data.evaluation?.cfr_valid;
  const cfrLabel =
    cfrValid === null || cfrValid === undefined
      ? "N/A"
      : cfrValid
        ? "PASS"
        : "FAIL";
  const cfrHint = cfrValid === null || cfrValid === undefined ? "No CFR parts in request" : undefined;

  const integrityLabel = pipelineIntegrity === true ? "PASS" : pipelineIntegrity === false ? "FAIL" : "—";
  const systemStatusLabel =
    pipelineIntegrity === true ? "Reliable" : pipelineIntegrity === false ? "Needs review" : "—";
  const runTs = data.run_timestamp ?? null;
  const headlineInsight =
    summary == null
      ? "Evaluation metrics for this run"
      : summary.failed > 0
        ? "❌ Some observations failed validation"
        : summary.warning > 0
          ? "⚠ Some observations require review"
          : "✅ All observations passed validation";

  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-2">
        {runTs ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last run: {new Date(runTs).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">Last run: not recorded (generate again to track)</p>
        )}
        <p className="text-lg font-medium text-slate-900 dark:text-white">{headlineInsight}</p>
      </div>

      {/* HEADER KPI ROW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="True positive rate" value={tpPct} hint="Share of observations with status pass" />
        <KpiCard title="Evidence score" value={evidenceLabel} hint={evidenceHint} />
        <KpiCard title="CFR" value={cfrLabel} hint={cfrHint} />
        <KpiCard title="Pipeline integrity" value={integrityLabel} hint="Mapping valid ∧ segmentation valid" />
        <KpiCard title="System status" value={systemStatusLabel} hint="Headline health for stakeholders" />
      </div>

      {metrics && (metrics.avg_confidence != null || metrics.avg_grounding_f1 != null) ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={METRIC_LABELS.avg_confidence}
            value={metrics.avg_confidence == null ? "—" : `${(metrics.avg_confidence * 100).toFixed(1)}%`}
            hint="0.3·F1 + 0.3·CFR + 0.2·structure + 0.2·retrieval"
          />
          <KpiCard
            title={METRIC_LABELS.avg_grounding_f1}
            value={metrics.avg_grounding_f1 == null ? "—" : `${(metrics.avg_grounding_f1 * 100).toFixed(1)}%`}
            hint="Mean evidence F1 component"
          />
          <KpiCard
            title={METRIC_LABELS.avg_cfr_score}
            value={metrics.avg_cfr_score == null ? "—" : `${(metrics.avg_cfr_score * 100).toFixed(1)}%`}
            hint="Mean citation similarity component"
          />
          <KpiCard
            title={METRIC_LABELS.avg_retrieval_score}
            value={metrics.avg_retrieval_score == null ? "—" : `${(metrics.avg_retrieval_score * 100).toFixed(1)}%`}
            hint="Mean note/KB chunk similarity"
          />
        </div>
      ) : null}

      {/* STATUS DISTRIBUTION */}
      {summary && chartData.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-200/30 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Status distribution</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pass / warning / failed counts from pipeline classification (not raw model logits).
          </p>
          <div className="mt-4 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-slate-600" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12 }}
                  formatter={(v: number) => [v, "Count"]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {summary.failed > 0
              ? "Some observations failed validation and require review."
              : "All observations passed structural validation (no failed rows)."}
          </p>
        </div>
      ) : null}

      {/* PIPELINE FLAGS */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-200/30 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline flags</h2>
        <FlagRow label="Segmentation valid" value={segValid === true ? "Yes" : segValid === false ? "No" : "—"} />
        {segWarning ? (
          <FlagRow
            label="Segmentation warning"
            value="Possible merge detected"
            warn
          />
        ) : (
          <FlagRow label="Segmentation warning" value="None" />
        )}
        {segWarning && segNote ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            {segNote}
          </p>
        ) : null}
      </div>

      {/* OBSERVATION TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/30 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Observations</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Per-row status, pipeline confidence, and primary failure reason. Expand a row for draft text and evidence.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Obs ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.observations.map((obs) => (
                <ObservationRow
                  key={obs.id || `idx-${obs.observation_text?.slice(0, 12) ?? "obs"}`}
                  obs={obs}
                  expanded={expandedId === obs.id}
                  onToggle={() => setExpandedId((id) => (id === obs.id ? null : obs.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ObservationRow({
  obs,
  expanded,
  onToggle,
}: {
  obs: DraftObservation;
  expanded: boolean;
  onToggle: () => void;
}) {
  const conf = obs.confidence ?? obs.confidence_score ?? 0;
  const band = confidenceBandLabel(conf);
  const colorTok = obs.pipeline_status_color;
  const statusClass = pipelineColorClass(colorTok);

  return (
    <>
      <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-slate-800/40">
        <td className="px-2 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/80 dark:hover:bg-slate-700"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse row" : "Expand row"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{obs.id || "—"}</td>
        <td className={cn("px-4 py-3 font-medium capitalize", statusClass)}>
          {obs.pipeline_status ?? "—"}
        </td>
        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
          <span className="tabular-nums">{(conf * 100).toFixed(1)}%</span>
          <span
            title={band.detail}
            className={cn(
              "ml-2 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              band.className,
            )}
          >
            {band.label}
          </span>
        </td>
        <td className="max-w-md truncate px-4 py-3 text-slate-600 dark:text-slate-400" title={obs.failure_reason || ""}>
          {humanizeReason(obs.failure_reason)}
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-50/90 dark:bg-slate-800/50">
          <td colSpan={5} className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-900/60">
              <p>
                <strong className="text-slate-900 dark:text-white">Draft:</strong>{" "}
                <span className="whitespace-pre-wrap">{obs.observation_text || "—"}</span>
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Evidence:</strong>{" "}
                {(obs.evidence_list || []).length > 0 ? (obs.evidence_list || []).join(", ") : "—"}
              </p>
              {obs.confidence_breakdown && typeof obs.confidence_breakdown === "object" ? (
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 p-3 text-xs dark:border-white/10 dark:bg-slate-800/40">
                  <p className="font-semibold text-slate-900 dark:text-white">Confidence blend (technical)</p>
                  <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                    {["grounding_f1", "cfr_score", "structure_score", "retrieval_score"].map((k) => {
                      const raw = (obs.confidence_breakdown as Record<string, unknown>)[k];
                      const v = typeof raw === "number" ? raw : null;
                      return (
                        <li key={k} className="flex justify-between gap-2">
                          <span title={k}>{METRIC_LABELS[k] || k}</span>
                          <span className="tabular-nums">{v == null ? "—" : (v * 100).toFixed(1) + "%"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export const PIPELINE_RUN_STORAGE_KEY = "smartInspections_latestPipelineGenerateResponse";

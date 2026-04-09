"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getEvalMetrics } from "@/lib/api";
import type { AggregateEvalMetrics } from "@/types/inspection";

function KpiCard({
  title,
  value,
  suffix = "%",
  subtitle,
}: {
  title: string;
  value: number;
  suffix?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value.toFixed(1)}
        {suffix}
      </p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

export default function EvaluationAnalyticsPage() {
  const [metrics, setMetrics] = useState<AggregateEvalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEvalMetrics()
      .then((m) => {
        if (!cancelled) setMetrics(m);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load aggregate metrics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData =
    metrics == null
      ? []
      : [
          { name: "Structure", value: metrics.structure_rate },
          { name: "CFR accuracy", value: metrics.cfr_accuracy },
          { name: "Grounding", value: metrics.grounding_rate },
          { name: "OCR avg", value: metrics.ocr_avg },
          { name: "Overall", value: metrics.overall_score },
        ];

  const chartDataGrounding =
    metrics == null
      ? []
      : [
          { name: "Evidence prec.", value: metrics.evidence_precision_avg ?? 0 },
          { name: "Ground. recall", value: metrics.grounding_recall_avg ?? 0 },
          { name: "Grounding F1", value: metrics.grounding_f1_avg ?? 0 },
          { name: "Narrative", value: metrics.narrative_grounding_avg ?? 0 },
          { name: "F1 (run micro)", value: metrics.grounding_f1_micro_run_avg ?? 0 },
        ];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/evaluation"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy-700 dark:text-slate-400 dark:hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Evaluation
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Evaluation analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Aggregated scores across every draft observation in the evaluation log (all inspections / runs to date). The same
          dashboard is available to supervisors and investigators; rates are observation-level, not per document.
        </p>
        {metrics != null && metrics.observation_count != null ? (
          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Observations in aggregate: {Math.round(metrics.observation_count)}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-navy-600 dark:text-cyan-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard title="Structure rate" value={metrics.structure_rate} />
            <KpiCard title="CFR accuracy" value={metrics.cfr_accuracy} />
            <KpiCard title="Grounding rate" value={metrics.grounding_rate} subtitle="≥1 evidence in notes" />
            <KpiCard title="OCR average" value={metrics.ocr_avg} subtitle="When ground truth was provided" />
            <KpiCard title="Overall score" value={metrics.overall_score} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard title="Evidence precision (avg)" value={metrics.evidence_precision_avg ?? 0} subtitle="Bullets in source" />
            <KpiCard title="Grounding recall (avg)" value={metrics.grounding_recall_avg ?? 0} subtitle="Per observation" />
            <KpiCard title="Grounding F1 (avg)" value={metrics.grounding_f1_avg ?? 0} subtitle="Precision × recall" />
            <KpiCard title="Narrative overlap (avg)" value={metrics.narrative_grounding_avg ?? 0} subtitle="Anti-hallucination" />
            <KpiCard title="F1 micro (runs)" value={metrics.grounding_f1_micro_run_avg ?? 0} subtitle="Per generation batch" />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Accuracy overview</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-slate-600 dark:fill-slate-400" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-slate-600 dark:fill-slate-400" unit="%" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgb(226 232 240)",
                      backgroundColor: "rgba(255,255,255,0.95)",
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Rate"]}
                  />
                  <Bar dataKey="value" fill="rgb(11 31 58)" radius={[8, 8, 0, 0]} className="dark:fill-cyan-600" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Grounding &amp; hallucination control</h2>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Evidence precision measures supported vs unsupported bullets. F1 combines precision with recall (anchor in source
              notes). Narrative overlap scores how much observation wording appears in source text.
            </p>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataGrounding} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-slate-600 dark:fill-slate-400" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-slate-600 dark:fill-slate-400" unit="%" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgb(226 232 240)",
                      backgroundColor: "rgba(255,255,255,0.95)",
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Rate"]}
                  />
                  <Bar dataKey="value" fill="rgb(47 122 122)" radius={[8, 8, 0, 0]} className="dark:fill-teal-500" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

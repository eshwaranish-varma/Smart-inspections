"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  getPipelineDashboardSummary,
  getPipelineObservationExplain,
  getPipelineRunDetail,
  listPipelineRuns,
} from "@/lib/api";
import {
  confidenceBandLabel,
  groundingStrengthLabel,
  METRIC_LABELS,
  retrievalSourceFriendly,
} from "@/lib/evaluationDemoLabels";
import { cn } from "@/lib/utils";
import type {
  ObservationExplainabilityResponse,
  PipelineDashboardSummary,
  PipelineRunDetailResponse,
  PipelineRunListItem,
} from "@/types/inspection";

function pct(x: number | null | undefined, digits = 1): string {
  if (x == null || Number.isNaN(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

function Card({
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

export default function PipelineStoredRunsDashboard() {
  const [summary, setSummary] = useState<PipelineDashboardSummary | null>(null);
  const [runs, setRuns] = useState<PipelineRunListItem[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PipelineRunDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [drawer, setDrawer] = useState<{
    runId: string;
    index: number;
    data: ObservationExplainabilityResponse | null;
    loading: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        getPipelineDashboardSummary(),
        listPipelineRuns({ limit: 15, offset: 0, run_type: "generate_observations" }),
      ]);
      setSummary(s);
      setRuns(r.items);
      setTotalRuns(r.total);
    } catch {
      setError("Could not load pipeline metrics from the API. Is the database reachable and migrations applied?");
      setSummary(null);
      setRuns([]);
      setTotalRuns(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedRunId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getPipelineRunDetail(selectedRunId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  const openExplain = (runId: string, index: number) => {
    setDrawer({ runId, index, data: null, loading: true });
    getPipelineObservationExplain(runId, index)
      .then((d) => setDrawer((prev) => (prev ? { ...prev, data: d, loading: false } : null)))
      .catch(() => setDrawer((prev) => (prev ? { ...prev, data: null, loading: false } : null)));
  };

  const s = summary;
  const high = s?.avg_confidence != null ? confidenceBandLabel(s.avg_confidence) : null;

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stored pipeline metrics…
        </p>
      ) : null}

      {!loading && s ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card
              title={METRIC_LABELS.avg_confidence}
              value={s.avg_confidence == null ? "—" : pct(s.avg_confidence, 1)}
              hint={high ? `Band: ${high.label}` : "Weighted blend across the run"}
            />
            <Card title="Grounding (avg F1)" value={pct(s.avg_grounding_f1, 1)} hint={METRIC_LABELS.evidence_score} />
            <Card title="CFR match (avg)" value={pct(s.avg_cfr_score, 1)} hint="Citation similarity component" />
            <Card title="Retrieval (avg)" value={pct(s.avg_retrieval_score, 1)} hint="Note + KB chunk similarity" />
            <Card title="Total runs (stored)" value={s.total_runs} hint={`${s.total_observations} observation rows logged`} />
          </div>
          {s.avg_confidence != null ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Confidence band:</span>{" "}
              <span title={high?.detail} className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", high?.className)}>
                {high?.label}
              </span>{" "}
              <span className="text-slate-400">({high?.detail})</span>
            </p>
          ) : null}
        </>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md dark:border-white/10 dark:bg-slate-900/80">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent pipeline runs</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {totalRuns} total in database — click a row to inspect observations and audit events.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Observations</th>
                <th className="px-4 py-3">Avg confidence</th>
                <th className="px-4 py-3">Doc ID</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No runs logged yet. Generate a 483 from workflow to populate this table.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-slate-800/40",
                      selectedRunId === r.id && "bg-navy-50/80 dark:bg-slate-800/60",
                    )}
                    onClick={() => setSelectedRunId(r.id)}
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-800 dark:text-slate-200">{r.status}</td>
                    <td className="px-4 py-3 tabular-nums">{r.observation_count ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{r.avg_confidence == null ? "—" : pct(r.avg_confidence, 1)}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-slate-600" title={r.doc_id || ""}>
                      {r.doc_id || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRunId ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md dark:border-white/10 dark:bg-slate-900/80">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Run detail</h3>
          {detailLoading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : detail ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Run ID: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedRunId}</span> —{" "}
                {detail.events.length} events, {detail.chunks.length} chunks, {detail.cfr_matches.length} CFR rows.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 dark:border-white/10">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Preview</th>
                      <th className="py-2 pr-4">Confidence</th>
                      <th className="py-2">Explain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.observations.map((o) => {
                      const idx = typeof o.observation_index === "number" ? o.observation_index : Number(o.observation_index);
                      const payload = (o.payload as Record<string, unknown>) || {};
                      const ev = (o.evaluation as Record<string, unknown>) || {};
                      const conf = typeof ev.confidence === "number" ? ev.confidence : null;
                      const bd = confidenceBandLabel(conf);
                      const g = groundingStrengthLabel(
                        Boolean(ev.grounded),
                        typeof ev.grounding_f1 === "number" ? ev.grounding_f1 : undefined,
                      );
                      const text = String(payload.observation_text || "").slice(0, 120);
                      return (
                        <tr key={`${selectedRunId}-${idx}`} className="border-t border-slate-100 dark:border-white/10">
                          <td className="py-3 pr-4 font-mono text-xs">{idx}</td>
                          <td className="max-w-md py-3 pr-4 text-slate-700 dark:text-slate-200">{text || "—"}</td>
                          <td className="py-3 pr-4">
                            <span
                              title={bd.detail}
                              className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", bd.className)}
                            >
                              {bd.label} {conf != null ? pct(conf, 1) : ""}
                            </span>
                            <span
                              title={g.detail}
                              className={cn("ml-2 rounded-md border px-2 py-0.5 text-xs font-semibold", g.className)}
                            >
                              {g.label}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              type="button"
                              className="text-sm font-medium text-navy-700 underline dark:text-cyan-300"
                              onClick={() => openExplain(selectedRunId, idx)}
                            >
                              Open panel
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Could not load detail.</p>
          )}
        </div>
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation">
          <button type="button" className="h-full flex-1 cursor-default" aria-label="Close" onClick={() => setDrawer(null)} />
          <div className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Explainability</p>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Observation {drawer.index}</h4>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setDrawer(null)}
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
              {drawer.loading ? (
                <p className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : drawer.data ? (
                <ExplainBody data={drawer.data} />
              ) : (
                <p className="text-red-600 dark:text-red-400">Could not load explainability payload.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExplainBody({ data }: { data: ObservationExplainabilityResponse }) {
  const bd = data.confidence_breakdown || {};
  const conf = typeof data.confidence === "number" ? data.confidence : null;
  const band = confidenceBandLabel(conf);
  const g = groundingStrengthLabel(
    Boolean(data.grounding?.grounded),
    typeof data.grounding?.grounding_f1 === "number" ? (data.grounding.grounding_f1 as number) : undefined,
  );

  return (
    <>
      <section>
        <h5 className="font-semibold text-slate-900 dark:text-white">Observation</h5>
        <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{data.observation_text || "—"}</p>
      </section>
      <section>
        <h5 className="font-semibold text-slate-900 dark:text-white">Evidence used</h5>
        <ul className="mt-1 list-inside list-disc text-slate-600 dark:text-slate-400">
          {(data.evidence_used || []).length ? (
            data.evidence_used.map((e, i) => <li key={i}>{e}</li>)
          ) : (
            <li>—</li>
          )}
        </ul>
      </section>
      <section>
        <h5 className="font-semibold text-slate-900 dark:text-white">CFR</h5>
        <p className="mt-1">
          <span className="text-slate-600 dark:text-slate-400">Matched:</span> {data.matched_cfr || "—"}
        </p>
        <p className="text-xs text-slate-500" title={`Score ${data.cfr_score ?? ""}`}>
          Similarity: {data.cfr_score == null ? "—" : data.cfr_score.toFixed(4)}
        </p>
      </section>
      <section>
        <h5 className="font-semibold text-slate-900 dark:text-white">Retrieved chunks</h5>
        <ul className="mt-2 space-y-2">
          {(data.retrieved_chunks || []).slice(0, 12).map((c, i) => {
            const row = c as Record<string, unknown>;
            const src = retrievalSourceFriendly(typeof row.source === "string" ? row.source : undefined);
            const score = typeof row.score === "number" ? row.score : null;
            const preview = String(row.content_preview || "").slice(0, 280);
            return (
              <li key={i} className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-2 text-xs dark:border-white/10 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-800 dark:text-slate-100" title={src.detail}>
                  {src.label}
                </span>{" "}
                <span className="tabular-nums text-slate-500" title={`Similarity ${score ?? ""}`}>
                  {score == null ? "" : score.toFixed(4)}
                </span>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{preview || "—"}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h5 className="font-semibold text-slate-900 dark:text-white">Grounding</h5>
        <p className="text-xs text-slate-500">Mode: {data.grounding_mode || "—"}</p>
        <p className="mt-1">
          <span title={g.detail} className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", g.className)}>
            {g.label}
          </span>
        </p>
      </section>
      <section>
        <h5 className="font-semibold text-slate-900 dark:text-white">Confidence breakdown</h5>
        <p className="text-xs text-slate-500">
          Overall:{" "}
          <span title={band.detail} className={cn("rounded-md border px-2 py-0.5 font-semibold", band.className)}>
            {band.label}
          </span>{" "}
          {conf == null ? "" : pct(conf, 2)}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
          {["grounding_f1", "cfr_score", "structure_score", "retrieval_score"].map((k) => {
            const v = bd[k];
            const num = typeof v === "number" ? v : null;
            return (
              <li key={k} className="flex justify-between gap-2">
                <span title={k}>{METRIC_LABELS[k] || k}</span>
                <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {num == null ? "—" : num.toFixed(4)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

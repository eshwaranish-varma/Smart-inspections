"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

type AuditPayload = {
  inspection_id: string;
  workflow_logs: {
    id: string;
    action: string;
    performer_name?: string;
    comments: string;
    previous_status: string | null;
    new_status: string | null;
    created_at: string;
  }[];
  inspection_reviews: {
    id: string;
    decision: string;
    comments: string;
    created_at: string;
    reviewer_name?: string | null;
  }[];
  ai_runs: {
    id: string;
    run_type: string;
    doc_id: string | null;
    model: string | null;
    created_at: string;
    output_summary: unknown;
  }[];
  audit_logs: {
    id: string;
    action: string;
    entity_type: string | null;
    changes: Record<string, unknown> | null;
    created_at: string;
    actor_name?: string | null;
  }[];
};

export default function WorkflowAuditPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/audit/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d.error) setError(d.error);
          else setData(d as AuditPayload);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load audit trail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-red-600">
        {error || "No data"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/workflow/${id}`}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Audit trail</h1>
          <p className="text-sm text-gray-500">Workflow history, reviews, AI runs, and supplemental audit rows</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Workflow</h2>
        <ul className="space-y-2">
          {data.workflow_logs.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/40"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{row.action}</span>
                <span className="text-xs text-slate-500">{row.created_at}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {row.performer_name || "—"} · {row.previous_status || "—"} → {row.new_status || "—"}
              </p>
              {row.comments ? <p className="mt-2 text-slate-800 dark:text-slate-200">{row.comments}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Supervisor reviews</h2>
        <ul className="space-y-2">
          {data.inspection_reviews.length === 0 ? (
            <li className="text-sm text-slate-500">No formal review records.</li>
          ) : (
            data.inspection_reviews.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/40"
              >
                <span className="font-semibold">{row.decision}</span> · {row.reviewer_name || "Reviewer"} ·{" "}
                <span className="text-xs text-slate-500">{row.created_at}</span>
                {row.comments ? <p className="mt-2">{row.comments}</p> : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">AI runs</h2>
        <ul className="space-y-2">
          {data.ai_runs.length === 0 ? (
            <li className="text-sm text-slate-500">No AI runs logged in-app yet (runs appear after EIR pipeline / logged actions).</li>
          ) : (
            data.ai_runs.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-xs dark:border-white/10 dark:bg-slate-900/40"
              >
                <span className="text-slate-900 dark:text-cyan-200">{row.run_type}</span> · {row.model || "—"} ·{" "}
                {row.doc_id || "—"} · {row.created_at}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Supplemental audit log</h2>
        <ul className="space-y-2">
          {data.audit_logs.length === 0 ? (
            <li className="text-sm text-slate-500">No supplemental entries.</li>
          ) : (
            data.audit_logs.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900/40"
              >
                <span className="font-semibold">{row.action}</span> · {row.actor_name || "—"} ·{" "}
                <span className="text-xs text-slate-500">{row.created_at}</span>
                {row.changes && Object.keys(row.changes).length > 0 ? (
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs dark:bg-slate-950/60">
                    {JSON.stringify(row.changes, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <Link
        href={`/api/versions/${encodeURIComponent(id)}`}
        className="text-xs text-slate-500 underline"
        target="_blank"
        rel="noreferrer"
      >
        Raw JSON: document versions API
      </Link>
    </div>
  );
}

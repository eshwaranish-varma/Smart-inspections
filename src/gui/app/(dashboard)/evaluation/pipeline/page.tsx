"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PipelineRunDashboard, {
  PIPELINE_RUN_STORAGE_KEY,
} from "@/components/evaluation/PipelineRunDashboard";
import type { GenerateObservationsResponse } from "@/types/inspection";

export default function PipelineRunPage() {
  const [data, setData] = useState<GenerateObservationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(PIPELINE_RUN_STORAGE_KEY) : null;
      if (!raw) {
        setData(null);
        setError(null);
        return;
      }
      const parsed = JSON.parse(raw) as GenerateObservationsResponse;
      if (!parsed?.observations || !Array.isArray(parsed.observations)) {
        setError("Stored payload is missing observations.");
        setData(null);
        return;
      }
      setData(parsed);
      setError(null);
    } catch {
      setError("Could not read the last pipeline run from this browser.");
      setData(null);
    }
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/evaluation"
            className="mb-2 inline-flex text-sm text-slate-500 hover:text-navy-700 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            Back to evaluation
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pipeline run dashboard</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Shows the most recent <strong>generate observations</strong> response from this browser: KPIs, status
            distribution, segmentation flags, and per-observation traceability. Generate a 483 draft from{" "}
            <Link href="/new-inspection" className="font-medium text-navy-700 underline dark:text-cyan-300">
              New inspection
            </Link>{" "}
            or your workflow, then open this page again.
          </p>
        </div>
        {data ? (
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(PIPELINE_RUN_STORAGE_KEY);
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
            className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear run
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Stored runs (API)</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          API-backed pipeline analytics are hidden in this environment until production logging and database migrations
          are confirmed. Use the browser snapshot below to review the most recent run locally.
        </p>
      </div>

      <div className="border-t border-slate-200 pt-8 dark:border-white/10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">This browser last run</h2>
        <p className="mb-4 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Snapshot from session storage (no database). Generate a 483 from{" "}
          <Link href="/new-inspection" className="font-medium text-navy-700 underline dark:text-cyan-300">
            New inspection
          </Link>{" "}
          to capture a response here.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {!error && data === null ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-md dark:border-white/10 dark:bg-slate-900/70">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No pipeline run yet. Generate an FDA 483 to see evaluation metrics.
          </p>
        </div>
      ) : null}

      {data ? <PipelineRunDashboard data={data} /> : null}

      <details className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
        <summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">Demo talking points</summary>
        <ul className="mt-3 list-inside list-disc space-y-2 text-xs leading-relaxed">
          <li>
            We evaluate each observation individually and classify outputs into pass, warning, or failed based on
            structural and evidentiary validation.
          </li>
          <li>Confidence scores and failure reasons are computed by the pipeline, not raw model probabilities.</li>
          <li>We surface segmentation risks before interpreting model quality metrics.</li>
        </ul>
      </details>
    </div>
  );
}

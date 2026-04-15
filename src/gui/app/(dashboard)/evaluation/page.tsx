"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import InspectionEvaluationDashboardView from "@/components/evaluation/InspectionEvaluationDashboardView";
import { getInspectionEvaluationDashboard } from "@/lib/api";
import type { InspectionEvaluationDashboard } from "@/types/inspection";

type LibraryDoc = {
  inspection_id: string | null;
  title: string;
  status: string;
  approved_at: string;
};

type LibraryInspectionOption = {
  inspectionId: string;
  title: string;
  approved_at: string;
  /** Which document library status this row came from (for labels). */
  source: "published" | "ready_to_publish";
};

/** One row per inspection; keep latest package date per inspection id. */
function inspectionsFromStatus(documents: LibraryDoc[], status: "published" | "ready_to_publish"): LibraryInspectionOption[] {
  const eligible = documents.filter(
    (d) => String(d.status || "").toLowerCase() === status && d.inspection_id && String(d.inspection_id).trim() !== ""
  );
  eligible.sort((a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime());
  const byInspection = new Map<string, LibraryInspectionOption>();
  for (const d of eligible) {
    const id = String(d.inspection_id);
    const title = d.title?.trim() || "Untitled inspection";
    const prev = byInspection.get(id);
    if (!prev || new Date(d.approved_at) > new Date(prev.approved_at)) {
      byInspection.set(id, { inspectionId: id, title, approved_at: d.approved_at, source: status });
    }
  }
  return [...byInspection.values()].sort(
    (a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()
  );
}

/** Published entries win when the same inspection appears in both lists. */
function mergeDropdownOptions(
  published: LibraryInspectionOption[],
  ready: LibraryInspectionOption[]
): LibraryInspectionOption[] {
  const map = new Map<string, LibraryInspectionOption>();
  for (const r of ready) {
    map.set(r.inspectionId, r);
  }
  for (const p of published) {
    map.set(p.inspectionId, p);
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()
  );
}

/** Up to 5 chips: prefer most recent published inspections, then fill with ready-to-publish (no duplicate ids). */
function buildRecentFive(
  published: LibraryInspectionOption[],
  ready: LibraryInspectionOption[]
): LibraryInspectionOption[] {
  const pub = [...published];
  const out: LibraryInspectionOption[] = [];
  const seen = new Set<string>();
  for (const p of pub) {
    if (out.length >= 5) break;
    if (seen.has(p.inspectionId)) continue;
    seen.add(p.inspectionId);
    out.push(p);
  }
  if (out.length >= 5) return out.slice(0, 5);
  for (const r of ready) {
    if (out.length >= 5) break;
    if (seen.has(r.inspectionId)) continue;
    seen.add(r.inspectionId);
    out.push(r);
  }
  return out;
}

export default function EvaluationPage() {
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [publishedRows, setPublishedRows] = useState<LibraryInspectionOption[]>([]);
  const [readyRows, setReadyRows] = useState<LibraryInspectionOption[]>([]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [dashLoading, setDashLoading] = useState(false);
  const [dashData, setDashData] = useState<InspectionEvaluationDashboard | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const [pubRes, readyRes] = await Promise.all([
        fetch("/api/document-library?status=published", { credentials: "include", cache: "no-store" }),
        fetch("/api/document-library?status=ready_to_publish", { credentials: "include", cache: "no-store" }),
      ]);
      const pubJson = await pubRes.json();
      const readyJson = await readyRes.json();
      const pubDocs = Array.isArray(pubJson.documents) ? (pubJson.documents as LibraryDoc[]) : [];
      const readyDocs = Array.isArray(readyJson.documents) ? (readyJson.documents as LibraryDoc[]) : [];
      setPublishedRows(inspectionsFromStatus(pubDocs, "published"));
      setReadyRows(inspectionsFromStatus(readyDocs, "ready_to_publish"));
    } catch {
      setPublishedRows([]);
      setReadyRows([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  /** Deep link: /evaluation?inspection_id=… (e.g. from workflow). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("inspection_id")?.trim();
    if (q) setSelectedId(q);
  }, []);

  const dropdownInspections = useMemo(
    () => mergeDropdownOptions(publishedRows, readyRows),
    [publishedRows, readyRows]
  );

  const recentFive = useMemo(() => buildRecentFive(publishedRows, readyRows), [publishedRows, readyRows]);

  const selectedTitle = useMemo(
    () => dropdownInspections.find((i) => i.inspectionId === selectedId)?.title ?? "",
    [dropdownInspections, selectedId]
  );

  const hasAnyPackages = publishedRows.length > 0 || readyRows.length > 0;

  useEffect(() => {
    if (!selectedId.trim()) {
      setDashData(null);
      setDashError(null);
      setDashLoading(false);
      return;
    }
    let cancelled = false;
    setDashLoading(true);
    setDashError(null);
    getInspectionEvaluationDashboard(selectedId)
      .then((d) => {
        if (!cancelled) setDashData(d);
      })
      .catch(() => {
        if (!cancelled) {
          setDashError("Could not load evaluation for this inspection.");
          setDashData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/workflow"
            className="mb-2 inline-flex text-sm text-slate-500 hover:text-navy-700 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            ← Workflow
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Evaluation dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Choose an inspection from <strong>published</strong> or <strong>ready to publish</strong> document library
            packages to view AI evaluation scores (OCR, CFR, evidence grounding, template) for that workflow.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/evaluation/pipeline"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Pipeline run
          </Link>
          <Link
            href="/evaluation/analytics"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Analytics
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md shadow-slate-200/30 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
        <label
          htmlFor="evalInspection"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Inspection
        </label>
        <div className="relative">
          <select
            id="evalInspection"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={libraryLoading}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          >
            <option value="">Select inspection…</option>
            {dropdownInspections.map((i) => (
              <option key={i.inspectionId} value={i.inspectionId}>
                {i.title}
                {i.source === "ready_to_publish" ? " (ready to publish)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {libraryLoading ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading document library…
          </p>
        ) : !hasAnyPackages ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            No published or ready-to-publish packages yet. When a supervisor approves a package, it will appear here.{" "}
            <Link href="/library" className="font-medium text-navy-700 underline dark:text-cyan-300">
              Document library
            </Link>
          </p>
        ) : null}
      </div>

      {recentFive.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Recent inspections</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Up to five shortcuts: most recent <strong>published</strong> first; if fewer than five exist, we add the most
            recent <strong>ready to publish</strong> inspections (same evaluation view as the dropdown).
          </p>
          <ul className="flex flex-wrap gap-2">
            {recentFive.map((i) => (
              <li key={`${i.source}-${i.inspectionId}`}>
                <button
                  type="button"
                  onClick={() => setSelectedId(i.inspectionId)}
                  className={`flex max-w-full flex-col truncate rounded-xl border px-3 py-2 text-left text-sm font-medium transition sm:max-w-xs ${
                    selectedId === i.inspectionId
                      ? "border-navy-500 bg-navy-50 text-navy-900 dark:border-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-100"
                      : "border-slate-200 bg-white text-slate-800 hover:border-navy-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={i.title}
                >
                  <span className="truncate">{i.title}</span>
                  {i.source === "ready_to_publish" ? (
                    <span className="text-[10px] font-normal uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Ready to publish
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Published
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedId ? (
        <div className="space-y-2">
          {selectedTitle ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Selected:</span> {selectedTitle}
            </p>
          ) : null}
          <InspectionEvaluationDashboardView
            inspectionId={selectedId}
            data={dashData}
            loading={dashLoading}
            error={dashError}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select an inspection to view AI evaluation metrics and flags.
        </p>
      )}
    </div>
  );
}

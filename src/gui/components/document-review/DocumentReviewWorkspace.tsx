"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PenLine, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = (inspectionId: string) => `si:docReviewEvidence:${inspectionId}`;

export type DocumentReviewWorkspaceProps = {
  inspectionId: string;
  pdfUrl?: string | null;
  canSign: boolean;
  /** Open to this page (1-based). Synced with viewer #page fragment. */
  initialPage?: number;
  /** Excerpt shown when jumping from traceability (also read from sessionStorage if set). */
  highlightText?: string | null;
};

type CommentRow = {
  id: string;
  body: string;
  page_number: number | null;
  created_at: string;
  author_name?: string | null;
};

function stripHash(url: string): string {
  const i = url.indexOf("#");
  return i >= 0 ? url.slice(0, i) : url;
}

/** Chrome / Edge PDF viewer honors #page=N for many same-origin PDFs. */
function pdfSrcWithPage(pdfUrl: string, page: number): string {
  const base = stripHash(pdfUrl.trim());
  const p = Math.max(1, Math.floor(page));
  return `${base}#page=${p}`;
}

export default function DocumentReviewWorkspace({
  inspectionId,
  pdfUrl,
  canSign,
  initialPage = 1,
  highlightText: highlightProp,
}: DocumentReviewWorkspaceProps) {
  const [page, setPage] = useState(() => Math.max(1, initialPage));
  const [highlight, setHighlight] = useState<string | null>(highlightProp ?? null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [signName, setSignName] = useState("");
  const [signDecision, setSignDecision] = useState<"approve" | "reject">("approve");

  useEffect(() => {
    setPage(Math.max(1, initialPage));
  }, [initialPage]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY(inspectionId));
      if (raw) {
        const parsed = JSON.parse(raw) as { page?: number; text?: string };
        if (typeof parsed.text === "string" && parsed.text.trim()) {
          setHighlight(parsed.text.trim());
        }
        if (typeof parsed.page === "number" && parsed.page >= 1) {
          setPage(parsed.page);
        }
        sessionStorage.removeItem(STORAGE_KEY(inspectionId));
        return;
      }
    } catch {
      /* ignore */
    }
    if (highlightProp?.trim()) setHighlight(highlightProp.trim());
  }, [inspectionId, highlightProp]);

  const iframeSrc = useMemo(() => {
    if (!pdfUrl?.trim()) return null;
    return pdfSrcWithPage(pdfUrl, page);
  }, [pdfUrl, page]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/document-review`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setComments(data.comments || []);
    } catch {
      toast.error("Could not load review comments");
    } finally {
      setLoadingComments(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function addComment() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/document-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "comment", body: draft.trim(), page_number: page }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDraft("");
      toast.success("Comment added");
      await loadComments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function submitSignature() {
    if (!canSign) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/document-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "signature",
          signer_name: signName.trim() || undefined,
          decision: signDecision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signature failed");
      toast.success("Review decision recorded");
      setSignName("");
      await loadComments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signature failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] gap-6 lg:grid-cols-2">
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Evidence document (PDF)</h2>
          <p className="text-xs text-slate-500">
            Uses the latest saved PDF for this inspection (draft version or library). Opens to the page linked from traceability.
          </p>
        </div>
        <div className="flex flex-1 flex-col bg-slate-100/80 p-3 dark:bg-slate-950/40">
          {iframeSrc ? (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Page</span>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900"
                >
                  Prev
                </button>
                <input
                  type="number"
                  min={1}
                  value={page}
                  onChange={(e) => setPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900"
                >
                  Next
                </button>
              </div>
              <iframe
                title="Evidence PDF"
                src={iframeSrc}
                className="min-h-[min(75vh,820px)] w-full flex-1 rounded-lg border border-slate-200 bg-white shadow-inner dark:border-white/10"
              />
            </>
          ) : (
            <div className="flex aspect-[210/297] w-full max-w-md flex-col items-center justify-center self-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center dark:border-white/20 dark:bg-slate-900/50">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No PDF on file for this inspection</p>
              <p className="mt-2 text-xs text-slate-500">
                Save a draft with a PDF export in New Inspection, or publish to the library so a final PDF path is stored. The
                traceability excerpt below still reflects the source text used for AI grounding.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        {highlight ? (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/90 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900 dark:text-cyan-200">Evidence text (traceability)</p>
            <p className="mt-2 max-h-48 overflow-y-auto text-sm leading-relaxed text-slate-900 dark:text-slate-100">{highlight}</p>
            <p className="mt-2 text-[10px] text-cyan-800 dark:text-cyan-300/90">
              This matches the excerpt the model tied to page {page}. Use the PDF viewer on the left when a document URL is available.
            </p>
          </div>
        ) : null}

        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Comments & validation</h2>
          <p className="text-xs text-slate-500">Supervisor review notes tied to this inspection package</p>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-950/40">
          {loadingComments ? (
            <div className="flex justify-center py-6 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-md border border-white/60 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500">
                  {c.author_name || "Reviewer"}
                  {c.page_number != null ? ` · page ${c.page_number}` : ""}
                </p>
                <p className="mt-1 text-slate-900 dark:text-slate-100">{c.body}</p>
              </div>
            ))
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Add comment (page {page})</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-navy-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
            placeholder="Reference findings, gaps, or required edits…"
          />
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={() => void addComment()}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-50"
          >
            <PenLine className="h-4 w-4" />
            Add comment
          </button>
        </div>

        {canSign && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-4 dark:border-teal-900/40 dark:bg-teal-950/30">
            <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">Electronic signature</p>
            <p className="mt-1 text-xs text-teal-800/90 dark:text-teal-200/90">
              Typed name and timestamp are stored with the decision (21 CFR Part 11 style recordkeeping in-app).
            </p>
            <input
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="Signer printed name"
              className="mt-3 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm dark:border-teal-800 dark:bg-slate-950/50 dark:text-white"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSignDecision("approve")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  signDecision === "approve"
                    ? "bg-emerald-600 text-white"
                    : "border border-emerald-200 bg-white text-emerald-800 dark:border-emerald-800 dark:bg-slate-900"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setSignDecision("reject")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  signDecision === "reject"
                    ? "bg-red-600 text-white"
                    : "border border-red-200 bg-white text-red-800 dark:border-red-800 dark:bg-slate-900"
                }`}
              >
                <ShieldOff className="h-4 w-4" />
                Reject
              </button>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submitSignature()}
              className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Sign & record decision
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

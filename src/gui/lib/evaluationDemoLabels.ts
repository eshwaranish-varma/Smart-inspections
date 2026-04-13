/** Business-friendly labels for evaluation / pipeline demos (technical values stay in tooltips). */

export function confidenceBandLabel(conf: number | null | undefined): {
  label: string;
  detail: string;
  className: string;
} {
  const c = typeof conf === "number" && !Number.isNaN(conf) ? conf : 0;
  if (c >= 0.8) {
    return {
      label: "High",
      detail: `Score ${c.toFixed(3)} (threshold ≥ 0.80)`,
      className:
        "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
    };
  }
  if (c >= 0.6) {
    return {
      label: "Medium",
      detail: `Score ${c.toFixed(3)} (0.60–0.79)`,
      className:
        "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 border-amber-200 dark:border-amber-800",
    };
  }
  return {
    label: "Low",
    detail: `Score ${c.toFixed(3)} (< 0.60)`,
    className: "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-100 border-red-200 dark:border-red-900",
  };
}

export function groundingStrengthLabel(
  grounded: boolean | null | undefined,
  f1: number | null | undefined,
): { label: string; detail: string; className: string } {
  const g = Boolean(grounded);
  const v = typeof f1 === "number" && !Number.isNaN(f1) ? f1 : 0;
  if (!g) {
    return {
      label: "Weak",
      detail: "Evidence not fully supported by uploaded notes (demo tier).",
      className: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600",
    };
  }
  if (v >= 0.75) {
    return {
      label: "Exact",
      detail: `Grounding F1 ${v.toFixed(3)} — strong overlap with source text.`,
      className:
        "bg-teal-100 text-teal-950 dark:bg-teal-950/40 dark:text-teal-100 border-teal-200 dark:border-teal-800",
    };
  }
  return {
    label: "Semantic",
    detail: `Grounding F1 ${v.toFixed(3)} — semantic or partial alignment.`,
    className:
      "bg-indigo-100 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800",
  };
}

export function retrievalSourceFriendly(source: string | null | undefined): { label: string; detail: string } {
  const s = (source || "").toLowerCase();
  if (s.includes("hybrid")) return { label: "Hybrid", detail: source || "hybrid" };
  if (s.includes("keyword")) return { label: "Keyword", detail: source || "keyword" };
  if (s.includes("semantic")) return { label: "Semantic", detail: source || "semantic" };
  if (s === "exact" || s.includes("resolved")) return { label: "Exact match", detail: source || "exact" };
  return { label: source?.trim() || "—", detail: source || "" };
}

export const METRIC_LABELS: Record<string, string> = {
  true_positive_rate: "Pass rate",
  evidence_score: "Grounding (F1 micro)",
  avg_confidence: "Avg confidence",
  avg_grounding_f1: "Avg evidence alignment",
  avg_cfr_score: "Avg CFR similarity",
  avg_retrieval_score: "Avg retrieval quality",
  grounding_f1: "Evidence F1",
  cfr_score: "CFR similarity",
  structure_score: "Structure check",
  retrieval_score: "Retrieval similarity",
};

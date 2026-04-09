"use client";

import { cn } from "@/lib/utils";

export type MetricTone = "success" | "warning" | "danger" | "neutral";

export function metricToneFromValue(value: number, passAt = 80, warnAt = 60): MetricTone {
  if (value >= passAt) return "success";
  if (value >= warnAt) return "warning";
  return "danger";
}

const toneBar: Record<MetricTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger: "bg-red-500",
  neutral: "bg-slate-400",
};

const toneBadge: Record<MetricTone, string> = {
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

export type MetricCardProps = {
  title: string;
  value: number;
  max?: number;
  subtitle?: string;
  passFail?: boolean;
  className?: string;
};

export default function MetricCard({
  title,
  value,
  max = 100,
  subtitle,
  passFail = true,
  className,
}: MetricCardProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tone = metricToneFromValue(pct);
  const pass = pct >= 80;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {passFail ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              toneBadge[tone]
            )}
          >
            {pass ? "Pass" : pct >= 60 ? "Review" : "Fail"}
          </span>
        ) : null}
      </div>
      <div className="mb-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{pct}</span>
        <span className="text-sm text-slate-500">/ {max}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all", toneBar[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

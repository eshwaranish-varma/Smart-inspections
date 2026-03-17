"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import AuditTrailTimeline from "@/components/workflow/AuditTrailTimeline";
import { auditEvents } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import type { AuditEvent } from "@/lib/types";

type ActionFilter = "all" | "create" | "edit" | "sign" | "publish";

const actionFilters: { label: string; value: ActionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Create", value: "create" },
  { label: "Edit", value: "edit" },
  { label: "Sign", value: "sign" },
  { label: "Publish", value: "publish" },
];

export default function AuditTrailPage() {
  const params = useParams();
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = auditEvents.filter((event) => {
    if (actionFilter !== "all" && event.type !== actionFilter) return false;

    if (dateFrom) {
      const from = new Date(dateFrom);
      if (event.timestamp < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (event.timestamp > to) return false;
    }

    return true;
  });

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description={`Inspection ${params.id}`}
        actions={
          <button
            onClick={() => toast("Export started")}
            className="flex items-center gap-2 rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-elevated"
          >
            <Download className="h-4 w-4" />
            Export Audit Trail as PDF
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4 border border-border bg-surface p-4">
        <div className="flex gap-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:border-border-active focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:border-border-active focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-1">
          {actionFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActionFilter(f.value)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                actionFilter === f.value
                  ? "bg-primary-muted text-primary"
                  : "border border-border bg-background text-text-secondary hover:text-text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">No events match the selected filters.</p>
        </div>
      ) : (
        <div className="border border-border bg-surface p-6">
          <AuditTrailTimeline events={filtered} />
        </div>
      )}
    </div>
  );
}

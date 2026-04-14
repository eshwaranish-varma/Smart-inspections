"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { inspections } from "@/lib/mockData";
import { cn, formatDate } from "@/lib/utils";
import type { Inspection } from "@/lib/types";

const statusConfig: Record<
  Inspection["status"],
  { label: string; bg: string; text: string; border: string }
> = {
  in_progress: {
    label: "IN PROGRESS",
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/30",
  },
  pending_review: {
    label: "PENDING REVIEW",
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
  },
  closed: {
    label: "CLOSED",
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
  },
};

export default function InspectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspections"
        description="Active and completed inspection records"
        actions={
          <Link
            href="/workflow"
            className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Start via Workflow
          </Link>
        }
      />

      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {["ID", "Firm", "FEI #", "Dates", "Status", "Actions"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider text-text-secondary"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inspections.map((inspection) => {
              const status = statusConfig[inspection.status];
              return (
                <tr
                  key={inspection.id}
                  className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-elevated"
                >
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {inspection.id}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-text-primary">
                    {inspection.firm.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {inspection.firm.feiNumber}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {formatDate(inspection.dates.start)} – {formatDate(inspection.dates.end)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-medium",
                        status.bg,
                        status.text,
                        status.border
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/inspections/${inspection.id}`}
                      className="font-mono text-xs font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

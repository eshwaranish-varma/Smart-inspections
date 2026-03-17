"use client";

import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { form483s, inspections } from "@/lib/mockData";
import { cn, formatDate } from "@/lib/utils";
import type { Form483 } from "@/lib/types";

const statusBadge: Record<Form483["status"], { label: string; className: string }> = {
  draft: { label: "DRAFT", className: "border-stamp-red text-stamp-red bg-stamp-red/10" },
  under_review: { label: "UNDER REVIEW", className: "border-accent text-accent bg-accent/10" },
  approved: { label: "APPROVED", className: "border-primary text-primary bg-primary/10" },
  published: { label: "PUBLISHED", className: "border-success text-success bg-success/10" },
};

function getInspectionFirm(inspectionId: string) {
  return inspections.find((i) => i.id === inspectionId);
}

export default function Form483ListPage() {
  return (
    <div>
      <PageHeader
        title="Form FDA 483 Documents"
        description="Inspectional observation documents"
        actions={
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-mono text-xs text-text-secondary">
              {form483s.length} document{form483s.length !== 1 ? "s" : ""}
            </span>
          </div>
        }
      />

      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Document ID", "Inspection", "Firm", "Status", "Date", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-mono text-xs font-medium uppercase tracking-wider text-text-secondary"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {form483s.map((doc) => {
              const insp = getInspectionFirm(doc.inspectionId);
              const badge = statusBadge[doc.status];
              const displayDate = doc.publishedDate ?? doc.issuedDate ?? undefined;

              return (
                <tr
                  key={doc.id}
                  className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-elevated"
                >
                  <td className="px-4 py-3 font-mono text-sm text-text-primary">
                    {doc.id.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {doc.inspectionId}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {insp?.firm.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {displayDate ? formatDate(displayDate) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/documents/483/${doc.id}`}
                      className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
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

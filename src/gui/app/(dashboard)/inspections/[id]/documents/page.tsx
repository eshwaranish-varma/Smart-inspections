"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, FileCheck, Upload, ExternalLink } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { form483s } from "@/lib/mockData";
import { cn, formatDate } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "DRAFT", color: "text-text-muted" },
  under_review: { label: "UNDER REVIEW", color: "text-accent" },
  approved: { label: "APPROVED", color: "text-primary" },
  published: { label: "PUBLISHED", color: "text-success" },
};

export default function InspectionDocumentsPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const form = form483s.find((f) => f.inspectionId === inspectionId);

  const documents = [
    ...(form
      ? [
          {
            id: form.id,
            type: "Form FDA 483",
            icon: FileText,
            status: form.status,
            lastModified: form.publishedDate ?? form.issuedDate ?? new Date(),
            href: `/documents/483/${form.id}`,
          },
        ]
      : []),
    {
      id: "eir-placeholder",
      type: "Establishment Inspection Report",
      icon: FileCheck,
      status: "draft" as const,
      lastModified: new Date(),
      href: `/documents/eir/${inspectionId}`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inspection Documents"
        description={`Documents associated with ${inspectionId}`}
      />

      <div className="space-y-3">
        {documents.map((doc) => {
          const Icon = doc.icon;
          const status = statusConfig[doc.status] ?? statusConfig.draft;

          return (
            <Link
              key={doc.id}
              href={doc.href}
              className="flex items-center gap-4 border border-border bg-surface-elevated p-4 transition-colors hover:border-border-active"
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm font-medium text-text-primary">
                  {doc.type}
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-muted">
                  {doc.id}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "font-mono text-xs font-medium",
                    status.color
                  )}
                >
                  {status.label}
                </span>
                <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                  {formatDate(doc.lastModified)}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 border border-dashed border-border bg-surface p-6 text-center">
        <Upload className="h-5 w-5 text-text-muted" />
        <div>
          <p className="text-sm text-text-secondary">
            Additional documents can be uploaded and attached to this inspection.
          </p>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            Supported formats: PDF, DOCX, XLSX, JPG, PNG
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Rocket, Sparkles, Construction } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

const sections = [
  {
    number: 1,
    title: "Cover Page",
    description: "Inspection identification, firm details, FEI number, dates of inspection, and investigator information.",
  },
  {
    number: 2,
    title: "Introduction & Inspection Scope",
    description: "Purpose of the inspection, regulatory authority, systems covered, and inspection classification.",
  },
  {
    number: 3,
    title: "Facility Description",
    description: "Physical layout, buildings, operations conducted, products manufactured, and general conditions.",
  },
  {
    number: 4,
    title: "Personnel Interviewed",
    description: "Names, titles, and roles of firm personnel interviewed during the inspection.",
  },
  {
    number: 5,
    title: "Records Reviewed",
    description: "Types and dates of records examined, sample sizes, and document identifiers.",
  },
  {
    number: 6,
    title: "Observations Summary",
    description: "Summary of Form FDA 483 observations with cross-references to supporting evidence.",
  },
  {
    number: 7,
    title: "Supporting Evidence Log",
    description: "Index of collected evidence including photographs, records, samples, and affidavits.",
  },
  {
    number: 8,
    title: "Investigator Narrative",
    description: "Detailed narrative of inspection activities, findings, and investigator analysis by system.",
  },
  {
    number: 9,
    title: "Regulatory Conclusions",
    description: "Classification recommendation, compliance status assessment, and follow-up actions.",
  },
  {
    number: 10,
    title: "Attachments",
    description: "Supporting documents, photographs, correspondence, and firm responses.",
  },
];

export default function EIRListPage() {
  return (
    <div>
      <PageHeader
        title="EIR Documents"
        description="Establishment Inspection Reports"
      />

      <div className="mb-8 flex items-start gap-4 rounded border border-accent/30 bg-accent/10 p-6">
        <Rocket className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
        <div>
          <h2 className="font-serif text-lg font-semibold text-accent">
            EIR generation and regulatory sources
          </h2>
          <p className="mt-1 text-sm text-accent/80">
            End-to-end EIR narrative generation runs through the{' '}
            <strong>inspection workflow</strong> and backend AI services (not this preview page). Regulatory context comes
            from <strong>Title 21 CFR</strong> (database or files) plus PDFs ingested into the knowledge base under{' '}
            <code className="rounded bg-background/80 px-1 text-[11px]">data/</code>, especially{' '}
            <strong>InvestigationsOperationsManualComplete.pdf</strong> (IOM inspection and reporting expectations) and{' '}
            <strong>Establishment_Inspection_Report_(EIR).pdf</strong> (EIR format reference). Exported reports can follow{' '}
            <strong>Establishment_Inspection_Report_(EIR).docx</strong>.
          </p>
        </div>
      </div>

      <div className="mb-6 border border-border bg-surface p-5">
        <h3 className="font-serif text-base font-medium text-text-primary">
          About Establishment Inspection Reports
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          The EIR is the official narrative report prepared by FDA investigators following
          a facility inspection. It documents the inspection scope, findings, evidence collected,
          personnel interviewed, and regulatory conclusions. The EIR is structured into standardized
          sections to ensure consistency and completeness across all district offices.
        </p>
      </div>

      <h3 className="mb-4 font-serif text-lg font-semibold text-text-primary">
        Report Sections
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.number}
            className="border border-border bg-surface-elevated p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-text-muted">
                  Section {section.number}
                </p>
                <h4 className="mt-1 font-serif text-sm font-medium text-text-primary">
                  {section.title}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {section.description}
                </p>
              </div>
              <span className="shrink-0 rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-text-muted">
                Not Started
              </span>
            </div>
            <button
              disabled
              className="mt-3 flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-primary opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              Generate with AI
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => toast("Feature request noted")}
          className="rounded border border-accent/30 bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          Request Early Access
        </button>
      </div>
    </div>
  );
}

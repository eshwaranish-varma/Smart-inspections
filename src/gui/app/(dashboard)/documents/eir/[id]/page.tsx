"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Rocket, ChevronRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useWorkflowGuard } from "@/hooks/useWorkflowGuard";
import { canAccessEirDocument } from "@/lib/inspection-workflow-policy";

const sectionTree = [
  { id: "cover", label: "Cover Page" },
  { id: "intro", label: "Introduction & Inspection Scope" },
  { id: "facility", label: "Facility Description" },
  { id: "personnel", label: "Personnel Interviewed" },
  { id: "records", label: "Records Reviewed" },
  { id: "observations", label: "Observations Summary" },
  { id: "evidence", label: "Supporting Evidence Log" },
  { id: "narrative", label: "Investigator Narrative" },
  { id: "conclusions", label: "Regulatory Conclusions" },
  { id: "attachments", label: "Attachments" },
];

const placeholderContent: Record<string, { title: string; body: string }> = {
  cover: {
    title: "Cover Page",
    body: "This section will contain the inspection identification header, firm legal name and address, FEI number, dates of inspection, investigator names and badge numbers, and district office information.",
  },
  intro: {
    title: "Introduction & Inspection Scope",
    body: "This section will describe the purpose of the inspection, the statutory authority under which it was conducted, the systems and areas covered, and the inspection classification type.",
  },
  facility: {
    title: "Facility Description",
    body: "This section will document the physical layout, number of buildings, square footage, operations conducted on-site, products manufactured or processed, and general facility conditions observed during the inspection.",
  },
  personnel: {
    title: "Personnel Interviewed",
    body: "This section will list all firm personnel interviewed during the inspection, including their names, titles, and roles, along with the dates and topics of each interview.",
  },
  records: {
    title: "Records Reviewed",
    body: "This section will catalog all records examined during the inspection, organized by type, date range, and sample size. Includes batch records, SOPs, training logs, and quality system documents.",
  },
  observations: {
    title: "Observations Summary",
    body: "This section will provide a summary of all Form FDA 483 observations with cross-references to supporting evidence documented in the EIR.",
  },
  evidence: {
    title: "Supporting Evidence Log",
    body: "This section will index all collected evidence including photographs, photocopied records, environmental samples, and sworn affidavits, with metadata and chain-of-custody information.",
  },
  narrative: {
    title: "Investigator Narrative",
    body: "This section will contain the detailed narrative describing inspection activities day by day, findings organized by quality system, and investigator analysis of the firm's compliance status.",
  },
  conclusions: {
    title: "Regulatory Conclusions",
    body: "This section will document the recommended inspection classification (OAI, VAI, NAI), overall compliance status assessment, and recommended follow-up actions.",
  },
  attachments: {
    title: "Attachments",
    body: "This section will include all supporting documents, high-resolution photographs, firm correspondence, management response notes, and additional reference materials.",
  },
};

export default function EIRDetailPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const { allowed, loading: guardLoading } = useWorkflowGuard(inspectionId, canAccessEirDocument);
  const [activeSection, setActiveSection] = useState("cover");
  const content = placeholderContent[activeSection];

  if (guardLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title="EIR Builder"
        description={`Establishment Inspection Report — ${params.id}`}
      />

      <div className="mb-6 flex items-start gap-4 rounded border border-accent/30 bg-accent/10 p-5">
        <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <h2 className="font-serif text-base font-semibold text-accent">
            Preview only — live EIR uses workflow + API
          </h2>
          <p className="mt-1 text-sm text-accent/80">
            This screen is a layout preview. Generate EIR narrative content from an inspection in{' '}
            <strong>Workflow</strong>; the backend uses IOM and EIR reference PDFs in{' '}
            <code className="rounded bg-background/80 px-1 text-[11px]">data/</code> (
            <strong>InvestigationsOperationsManualComplete.pdf</strong>,{' '}
            <strong>Establishment_Inspection_Report_(EIR).pdf</strong>) plus CFR citations. Forms below stay disabled
            here.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <nav className="w-56 shrink-0 border border-border bg-surface">
          <p className="border-b border-border px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Sections
          </p>
          {sectionTree.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors",
                activeSection === section.id
                  ? "bg-primary-muted text-primary"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 transition-transform",
                  activeSection === section.id && "rotate-90"
                )}
              />
              <span className="truncate">{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-serif text-lg font-medium text-text-primary">
              {content.title}
            </h3>
          </div>

          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-text-secondary">
              {content.body}
            </p>

            <div className="relative mt-6">
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded bg-background/60">
                <span className="rounded border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold text-accent">
                  Use Workflow for live EIR
                </span>
              </div>

              <fieldset disabled className="space-y-4 opacity-50">
                <div>
                  <label className="mb-1 block font-mono text-xs text-text-muted">
                    Products Manufactured
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Metformin HCl 500mg Tablets"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-mono text-xs text-text-muted">
                    Processes Reviewed
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Granulation, Compression, Coating, Packaging"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-mono text-xs text-text-muted">
                    Personnel Interviewed
                  </label>
                  <div className="overflow-x-auto border border-border">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-background">
                          <th className="px-3 py-2 font-mono text-xs font-medium text-text-muted">Name</th>
                          <th className="px-3 py-2 font-mono text-xs font-medium text-text-muted">Title</th>
                          <th className="px-3 py-2 font-mono text-xs font-medium text-text-muted">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((row) => (
                          <tr key={row} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              <input type="text" className="w-full bg-transparent text-sm text-text-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" className="w-full bg-transparent text-sm text-text-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" className="w-full bg-transparent text-sm text-text-primary" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-xs text-text-muted">
                    Records Reviewed
                  </label>
                  <div className="overflow-x-auto border border-border">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-background">
                          <th className="px-3 py-2 font-mono text-xs font-medium text-text-muted">Type</th>
                          <th className="px-3 py-2 font-mono text-xs font-medium text-text-muted">Date</th>
                          <th className="px-3 py-2 font-mono text-xs font-medium text-text-muted">Sample Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((row) => (
                          <tr key={row} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              <input type="text" className="w-full bg-transparent text-sm text-text-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="date" className="w-full bg-transparent text-sm text-text-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" className="w-full bg-transparent text-sm text-text-primary" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

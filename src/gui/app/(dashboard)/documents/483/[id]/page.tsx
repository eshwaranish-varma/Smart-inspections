"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Hash,
  Building2,
  CalendarDays,
  MapPin,
  User,
  PenLine,
  Eye,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { form483s, inspections } from "@/lib/mockData";
import type { Form483, Inspection, Observation, DocumentSignature } from "@/lib/types";
import DocumentStamp from "@/components/documents/DocumentStamp";
import CitationBadge from "@/components/documents/CitationBadge";
import ChecklistPanel from "@/components/workflow/ChecklistPanel";
import SignatureCapture from "@/components/workflow/SignatureCapture";
import PublishGate from "@/components/workflow/PublishGate";

type OutlineItem =
  | "district"
  | "dates"
  | "fei"
  | "firm"
  | "address"
  | "issuedTo"
  | `obs-${number}`
  | "signatures";

const statusBadge: Record<Form483["status"], { label: string; className: string }> = {
  draft: { label: "DRAFT", className: "border-stamp-red text-stamp-red bg-stamp-red/10" },
  under_review: { label: "UNDER REVIEW", className: "border-accent text-accent bg-accent/10" },
  approved: { label: "APPROVED", className: "border-primary text-primary bg-primary/10" },
  published: { label: "PUBLISHED", className: "border-success text-success bg-success/10" },
};

const significanceColor: Record<Observation["significance"], string> = {
  critical: "bg-danger",
  significant: "bg-accent",
  minor: "bg-text-muted",
};

export default function Form483DetailPage() {
  const form483 = form483s[0];
  const inspection = inspections.find((i) => i.id === form483.inspectionId)!;

  const [activeItem, setActiveItem] = useState<OutlineItem>("district");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signingInvestigator, setSigningInvestigator] = useState<{
    id: string;
    name: string;
    title: string;
  } | null>(null);

  const [formState, setFormState] = useState({
    districtOffice: inspection.districtOffice,
    dateStart: formatDate(inspection.dates.start),
    dateEnd: formatDate(inspection.dates.end),
    feiNumber: inspection.firm.feiNumber,
    issuedToName: inspection.reportIssuedTo.name,
    issuedToTitle: inspection.reportIssuedTo.title,
    firmName: inspection.firm.name,
    street: inspection.firm.address.street,
    city: inspection.firm.address.city,
    state: inspection.firm.address.state,
    zip: inspection.firm.address.zip,
    observationTexts: form483.observations.map((o) => o.text),
  });

  const [localSignatures, setLocalSignatures] = useState<DocumentSignature[]>(
    form483.signatures
  );
  const [localChecklist, setLocalChecklist] = useState(form483.checklistItems);

  const badge = statusBadge[form483.status];
  const fullAddress = `${formState.street}, ${formState.city}, ${formState.state} ${formState.zip}`;

  function handleFieldChange(field: string, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function handleObservationChange(index: number, value: string) {
    setFormState((prev) => {
      const updated = [...prev.observationTexts];
      updated[index] = value;
      return { ...prev, observationTexts: updated };
    });
  }

  function handleChecklistToggle(id: string) {
    setLocalChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "completed"
                  ? "not_started"
                  : item.status === "not_started"
                  ? "in_progress"
                  : "completed",
            }
          : item
      )
    );
  }

  function openSignatureModal(inv: { id: string; name: string; title: string }) {
    setSigningInvestigator(inv);
    setSignatureModalOpen(true);
  }

  function handleSign(data: { signatureImage: string }) {
    if (!signingInvestigator) return;
    const newSig: DocumentSignature = {
      investigatorId: signingInvestigator.id,
      investigatorName: signingInvestigator.name,
      title: signingInvestigator.title,
      signatureImage: data.signatureImage,
      signedAt: new Date(),
      required: true,
    };
    setLocalSignatures((prev) => [...prev, newSig]);
    setSignatureModalOpen(false);
    setSigningInvestigator(null);
  }

  function handlePublish() {
    // placeholder
  }

  function InlineField({
    field,
    label,
    value,
    mono,
  }: {
    field: string;
    label: string;
    value: string;
    mono?: boolean;
  }) {
    const isEditing = editingField === field;
    return (
      <div className="group flex gap-2 py-1">
        <span className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
            className={cn(
              "flex-1 border-b border-blue-400 bg-transparent px-0 py-0 text-sm outline-none",
              mono && "font-mono"
            )}
          />
        ) : (
          <span
            onClick={() => setEditingField(field)}
            className={cn(
              "flex-1 cursor-text border-b border-transparent text-sm text-gray-900 transition-colors hover:border-gray-300",
              mono && "font-mono"
            )}
          >
            {value}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Panel 1 — Outline Navigator */}
      <aside className="flex w-1/4 flex-col overflow-y-auto border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <Link
            href="/documents/483"
            className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All 483 Documents
          </Link>
          <h1 className="font-serif text-lg font-semibold text-text-primary">
            Form FDA 483
          </h1>
          <p className="mt-0.5 font-mono text-xs text-text-muted">{form483.id}</p>
          <div className="mt-3">
            <span
              className={cn(
                "inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3">
          <p className="px-2 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Header Fields
          </p>
          {([
            { key: "district" as const, label: "District Office", icon: Building2 },
            { key: "dates" as const, label: "Dates of Inspection", icon: CalendarDays },
            { key: "fei" as const, label: "FEI Number", icon: Hash },
            { key: "issuedTo" as const, label: "Issued To", icon: User },
            { key: "firm" as const, label: "Firm Name", icon: Building2 },
            { key: "address" as const, label: "Address", icon: MapPin },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveItem(key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                activeItem === key
                  ? "border-l-2 border-l-primary bg-primary-muted/30 text-text-primary"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}

          <p className="mt-4 px-2 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Observations
          </p>
          {form483.observations.map((obs, i) => (
            <button
              key={obs.id}
              type="button"
              onClick={() => setActiveItem(`obs-${i}`)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                activeItem === `obs-${i}`
                  ? "border-l-2 border-l-primary bg-primary-muted/30 text-text-primary"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  significanceColor[obs.significance]
                )}
              />
              Obs {obs.number}
              <span className="ml-auto font-mono text-[10px] text-text-muted">
                {obs.significance.charAt(0).toUpperCase()}
              </span>
            </button>
          ))}

          <p className="mt-4 px-2 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Signatures
          </p>
          <button
            type="button"
            onClick={() => setActiveItem("signatures")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
              activeItem === "signatures"
                ? "border-l-2 border-l-primary bg-primary-muted/30 text-text-primary"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            )}
          >
            <PenLine className="h-3.5 w-3.5 shrink-0" />
            Investigator Signatures
          </button>
        </nav>
      </aside>

      {/* Panel 2 — Document Canvas */}
      <main className="relative flex-1 overflow-y-auto bg-gray-100 p-8">
        <div className="relative mx-auto max-w-[8.5in] bg-white p-8 text-gray-900 shadow-xl">
          {form483.status === "draft" && <DocumentStamp status="draft" />}

          <header className="mb-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              Department of Health and Human Services
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Food and Drug Administration</p>
            <hr className="my-3 border-gray-300" />
            <h2 className="font-serif text-lg font-bold tracking-wide text-gray-900">
              INSPECTIONAL OBSERVATIONS
            </h2>
            <p className="mt-0.5 font-mono text-xs font-medium text-gray-500">
              FORM FDA 483
            </p>
          </header>

          <section className="mb-6 space-y-0.5 border-b border-gray-200 pb-4">
            <InlineField
              field="districtOffice"
              label="District Office"
              value={formState.districtOffice}
            />
            <InlineField
              field="dateStart"
              label="Date(s) of Inspection"
              value={`${formState.dateStart} – ${formState.dateEnd}`}
            />
            <InlineField
              field="feiNumber"
              label="FEI Number"
              value={formState.feiNumber}
              mono
            />
            <InlineField
              field="issuedToName"
              label="Name and Title"
              value={`${formState.issuedToName}, ${formState.issuedToTitle}`}
            />
            <InlineField
              field="firmName"
              label="Firm Name"
              value={formState.firmName}
            />
            <InlineField
              field="street"
              label="Street Address"
              value={formState.street}
            />
            <div className="group flex gap-2 py-1">
              <span className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                City, State, ZIP
              </span>
              <span className="text-sm text-gray-900">
                {formState.city}, {formState.state} {formState.zip}
              </span>
            </div>
          </section>

          <p className="mb-6 text-sm leading-relaxed text-gray-700">
            During an inspection of your establishment located at{" "}
            <span className="font-medium text-gray-900">{fullAddress}</span>{" "}
            I (we) observed:
          </p>

          <ol className="space-y-6">
            {form483.observations.map((obs, i) => (
              <li key={obs.id} id={`observation-${i}`}>
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="font-serif text-base font-bold text-gray-900">
                    {obs.number}.
                  </span>
                  {obs.evidence.length > 0 && (
                    <sup className="font-mono text-[10px] text-blue-600">
                      [{obs.evidence.length} evidence item{obs.evidence.length > 1 ? "s" : ""}]
                    </sup>
                  )}
                </div>
                <textarea
                  value={formState.observationTexts[i]}
                  onChange={(e) => handleObservationChange(i, e.target.value)}
                  rows={Math.max(4, Math.ceil(formState.observationTexts[i].length / 100))}
                  className="w-full resize-y border border-transparent bg-transparent px-0 text-sm leading-relaxed text-gray-800 transition-colors focus:border-blue-300 focus:outline-none"
                />
                {obs.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {obs.citations.map((c) => (
                      <CitationBadge key={c.fullCitation} citation={c} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <footer className="mt-12 border-t border-gray-200 pt-4 text-center">
            <p className="font-mono text-[10px] text-gray-400">Page 1 of 1</p>
          </footer>
        </div>
      </main>

      {/* Panel 3 — Actions & Metadata */}
      <aside className="flex w-1/4 flex-col overflow-y-auto border-l border-border bg-surface p-4">
        <div className="mb-6">
          <h2 className="font-serif text-base font-semibold text-text-primary">
            Document Details
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Status</dt>
              <dd>
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Inspection</dt>
              <dd className="font-mono text-xs text-text-primary">{form483.inspectionId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Observations</dt>
              <dd className="font-mono text-xs text-text-primary">
                {form483.observations.length}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mb-6 border-t border-border pt-4">
          <h3 className="mb-3 font-serif text-base font-semibold text-text-primary">
            Pre-Issue Checklist
          </h3>
          <ChecklistPanel items={localChecklist} onToggle={handleChecklistToggle} />
        </div>

        <div className="mb-6 border-t border-border pt-4">
          <h3 className="mb-3 font-serif text-base font-semibold text-text-primary">
            Signatures
          </h3>
          <ul className="space-y-3">
            {inspection.investigators.map((inv) => {
              const signed = localSignatures.find(
                (s) => s.investigatorId === inv.id
              );
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-elevated px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{inv.name}</p>
                    <p className="text-xs text-text-muted">{inv.title}</p>
                  </div>
                  {signed ? (
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-success">
                      Signed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        openSignatureModal({
                          id: inv.id,
                          name: inv.name,
                          title: inv.title,
                        })
                      }
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      Sign Document
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border pt-4">
          <PublishGate
            checklistItems={localChecklist}
            signatures={localSignatures}
            observationCount={form483.observations.length}
            hasDistrictOffice={formState.districtOffice.length > 0}
            hasReportIssuedTo={formState.issuedToName.length > 0}
            onPublish={handlePublish}
          />
        </div>
      </aside>

      <SignatureCapture
        open={signatureModalOpen}
        onClose={() => {
          setSignatureModalOpen(false);
          setSigningInvestigator(null);
        }}
        onSign={handleSign}
        investigatorName={signingInvestigator?.name ?? ""}
        title={`Signature — ${signingInvestigator?.name ?? ""}`}
      />
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface PublishGateProps {
  checklistItems: Array<{ id: string; status: string }>;
  signatures: Array<{
    investigatorId: string;
    signatureImage: string;
    required: boolean;
  }>;
  observationCount: number;
  hasDistrictOffice: boolean;
  hasReportIssuedTo: boolean;
  onPublish: () => void;
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="var(--success)" />
      <path
        d="M5.5 9l2 2L12.5 7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="var(--danger)" />
      <path
        d="M6.5 6.5l5 5M11.5 6.5l-5 5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PublishGate({
  checklistItems,
  signatures,
  observationCount,
  hasDistrictOffice,
  hasReportIssuedTo,
  onPublish,
}: PublishGateProps) {
  const allChecklistComplete = checklistItems.every(
    (item) => item.status === "completed"
  );
  const allSignaturesPresent = signatures
    .filter((s) => s.required)
    .every((s) => s.signatureImage.length > 0);
  const hasObservations = observationCount >= 1;

  const conditions = [
    { met: allChecklistComplete, label: "All checklist items completed" },
    { met: allSignaturesPresent, label: "All required signatures captured" },
    { met: hasObservations, label: "At least one observation recorded" },
    { met: hasDistrictOffice, label: "District office assigned" },
    { met: hasReportIssuedTo, label: "Report issued-to party set" },
  ];

  const passedCount = conditions.filter((c) => c.met).length;
  const allMet = passedCount === conditions.length;
  const missing = conditions.filter((c) => !c.met).map((c) => c.label);
  const pct = (passedCount / conditions.length) * 100;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-base font-semibold text-text-primary">
        Publish Readiness
      </h3>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {passedCount} of {conditions.length} pre-publish checks passed
          </span>
          <span className="font-mono text-xs text-text-muted">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              allMet ? "bg-success" : "bg-accent"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {conditions.map((condition) => (
          <li key={condition.label} className="flex items-center gap-3">
            {condition.met ? <CheckIcon /> : <XIcon />}
            <span
              className={cn(
                "text-sm",
                condition.met ? "text-text-primary" : "text-text-secondary"
              )}
            >
              {condition.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="relative inline-block">
        <button
          type="button"
          disabled={!allMet}
          onClick={onPublish}
          title={allMet ? undefined : `Missing: ${missing.join(", ")}`}
          className={cn(
            "rounded-md px-5 py-2.5 text-sm font-medium transition-colors",
            allMet
              ? "bg-primary text-white hover:bg-primary/90"
              : "cursor-not-allowed bg-primary/40 text-white/60"
          )}
        >
          Publish Document
        </button>
      </div>
    </div>
  );
}

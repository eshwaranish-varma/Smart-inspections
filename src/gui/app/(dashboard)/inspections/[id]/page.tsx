"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  FileText,
  Users,
  ClipboardList,
  FileCheck,
  History,
  MapPin,
  Hash,
  User,
  Briefcase,
} from "lucide-react";
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

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const inspection = inspections.find((i) => i.id === inspectionId) ?? inspections[0];
  const status = statusConfig[inspection.status];

  const criticalCount = inspection.observations.filter((o) => o.significance === "critical").length;
  const significantCount = inspection.observations.filter((o) => o.significance === "significant").length;
  const minorCount = inspection.observations.filter((o) => o.significance === "minor").length;

  const address = inspection.firm.address;
  const addressStr = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={inspection.firm.name}
        description={`Inspection ${inspection.id}`}
        actions={
          <span
            className={cn(
              "inline-flex items-center rounded border px-2.5 py-1 font-mono text-xs font-medium",
              status.bg,
              status.text,
              status.border
            )}
          >
            {status.label}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="border border-border bg-surface px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold text-text-primary">
              Establishment Info
            </h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                <Briefcase className="h-3 w-3" /> Name
              </dt>
              <dd className="ml-auto text-right font-sans text-text-primary">{inspection.firm.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                <Hash className="h-3 w-3" /> FEI
              </dt>
              <dd className="ml-auto font-mono text-text-secondary">{inspection.firm.feiNumber}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                <MapPin className="h-3 w-3" /> Address
              </dt>
              <dd className="ml-auto text-right font-sans text-xs text-text-secondary">
                {addressStr}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-mono text-xs text-text-muted">Type</dt>
              <dd className="ml-auto font-mono text-xs text-text-secondary">{inspection.firm.type}</dd>
            </div>
          </dl>
        </div>

        <div className="border border-border bg-surface px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold text-text-primary">
              Inspection Details
            </h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-mono text-xs text-text-muted">Start Date</dt>
              <dd className="font-mono text-text-secondary">{formatDate(inspection.dates.start)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-mono text-xs text-text-muted">End Date</dt>
              <dd className="font-mono text-text-secondary">{formatDate(inspection.dates.end)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-mono text-xs text-text-muted">Type</dt>
              <dd className="font-mono text-xs text-text-secondary">{inspection.firm.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-mono text-xs text-text-muted">District</dt>
              <dd className="text-right font-sans text-xs text-text-secondary">{inspection.districtOffice}</dd>
            </div>
          </dl>
        </div>

        <div className="border border-border bg-surface px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold text-text-primary">
              Report Issued To
            </h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                <User className="h-3 w-3" /> Name
              </dt>
              <dd className="font-sans text-text-primary">{inspection.reportIssuedTo.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-mono text-xs text-text-muted">Title</dt>
              <dd className="text-right font-sans text-xs text-text-secondary">
                {inspection.reportIssuedTo.title}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border border-border bg-surface px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-sm font-semibold text-text-primary">
              Team Members
            </h3>
          </div>
          <ul className="space-y-2">
            {inspection.investigators.map((inv) => (
              <li key={inv.id} className="flex items-center gap-2 text-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-mono text-xs text-text-muted">
                  {inv.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-sans text-text-primary">{inv.name}</p>
                  <p className="font-mono text-[10px] text-text-muted">
                    {inv.title} — {inv.badgeNumber}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/inspections/${inspection.id}/observations`}
          className="flex items-center gap-2 rounded border border-border bg-surface px-4 py-2.5 font-mono text-xs font-medium text-text-primary transition-colors hover:bg-surface-elevated"
        >
          <ClipboardList className="h-4 w-4 text-primary" />
          View Observations
        </Link>
        <Link
          href={`/inspections/${inspection.id}/generate-483`}
          className="flex items-center gap-2 rounded border border-border bg-surface px-4 py-2.5 font-mono text-xs font-medium text-text-primary transition-colors hover:bg-surface-elevated"
        >
          <FileCheck className="h-4 w-4 text-primary" />
          Generate 483
        </Link>
        <Link
          href={`/inspections/${inspection.id}/audit-trail`}
          className="flex items-center gap-2 rounded border border-border bg-surface px-4 py-2.5 font-mono text-xs font-medium text-text-primary transition-colors hover:bg-surface-elevated"
        >
          <History className="h-4 w-4 text-primary" />
          Audit Trail
        </Link>
      </div>

      <section className="border border-border bg-surface px-5 py-4 space-y-3">
        <h3 className="font-serif text-sm font-semibold text-text-primary">
          Observation Summary
        </h3>
        <div className="flex items-center gap-6">
          <div>
            <p className="font-serif text-2xl font-bold text-text-primary">
              {inspection.observations.length}
            </p>
            <p className="font-mono text-xs text-text-muted">Total</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex gap-4">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="font-mono text-xs text-text-secondary">
                  {criticalCount} Critical
                </span>
              </div>
            )}
            {significantCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-mono text-xs text-text-secondary">
                  {significantCount} Significant
                </span>
              </div>
            )}
            {minorCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-text-muted" />
                <span className="font-mono text-xs text-text-secondary">
                  {minorCount} Minor
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

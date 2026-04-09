"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuditTrailTimeline, { type AuditEntry } from "@/components/inspection-components/workflow/AuditTrailTimeline";
import { downloadDocument } from "@/lib/api";
import type {
  ApprovedDocumentRecord,
  DraftObservation,
  EIRNarrative,
  InspectionMetadata,
} from "@/types/inspection";

const STATUS_FILTERS = [
  { value: "all", label: "All library" },
  { value: "published", label: "Published" },
  { value: "ready_to_publish", label: "Ready to publish" },
] as const;

function parseEirNarrative(json: string): EIRNarrative | null {
  try {
    const raw = JSON.parse(json || "{}") as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;
    const pick = (k: string) => String(raw[k] ?? "");
    const n = {
      cover_info: pick("cover_info"),
      purpose_scope: pick("purpose_scope"),
      regulatory_framework: pick("regulatory_framework"),
      background_scope: pick("background_scope"),
      inspection_methodology: pick("inspection_methodology"),
      observations_summary: pick("observations_summary"),
      evidence_descriptions: pick("evidence_descriptions"),
      chronological_account: pick("chronological_account"),
      references_and_citations: pick("references_and_citations"),
    };
    const hasContent = Object.values(n).some((v) => v.trim().length > 0);
    return hasContent ? n : null;
  } catch {
    return null;
  }
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "published") return "Published";
  if (s === "ready_to_publish") return "Ready to publish";
  return status.replace(/_/g, " ");
}

function buildDetails(doc: ApprovedDocumentRecord, meta: InspectionMetadata): string {
  const firm = meta.firm_name?.trim() || "—";
  const fei = meta.fei_number?.trim() || "—";
  return `${doc.title} · Firm: ${firm} · FEI: ${fei}`;
}

export default function AuditTrail() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");
  const [documents, setDocuments] = useState<ApprovedDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/document-library?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load document library");
      setDocuments(data.documents || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries: AuditEntry[] = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime())
      .map((doc) => {
        let meta: InspectionMetadata = {} as InspectionMetadata;
        try {
          meta = JSON.parse(doc.final_metadata_json || "{}") as InspectionMetadata;
        } catch {
          /* ignore */
        }
        let observations: DraftObservation[] = [];
        try {
          observations = JSON.parse(doc.final_observations_json || "[]") as DraftObservation[];
        } catch {
          observations = [];
        }

        const eirNarrative = parseEirNarrative(doc.final_eir_json || "");

        const download483 = async () => {
          try {
            await downloadDocument("483", { form_data: meta, observations });
            toast.success("FDA 483 downloaded");
          } catch {
            toast.error("483 download failed");
          }
        };

        const downloadEir = async () => {
          try {
            if (eirNarrative) {
              await downloadDocument("eir", {
                form_data: meta,
                observations,
                eir_narrative: eirNarrative,
              });
              toast.success("EIR narrative downloaded");
            } else {
              await downloadDocument("eir", { form_data: meta, observations });
              toast.success("EIR narrative downloaded (regenerated)");
            }
          } catch {
            toast.error("EIR download failed");
          }
        };

        const downloadBoth = async () => {
          try {
            await downloadDocument("both", {
              form_data: meta,
              observations,
              ...(eirNarrative ? { eir_narrative: eirNarrative } : {}),
            });
            toast.success("Package downloaded");
          } catch {
            toast.error("Download failed");
          }
        };

        const openWorkflow = () => {
          if (doc.inspection_id) router.push(`/workflow/${encodeURIComponent(doc.inspection_id)}`);
          else toast.error("No workflow linked to this record");
        };

        const st = doc.status?.toLowerCase() ?? "";
        const actionTitle =
          st === "published"
            ? "Form published"
            : st === "ready_to_publish"
              ? "Ready to publish"
              : "Document library record";

        const actions: AuditEntry["actions"] = [
          ...(doc.inspection_id
            ? [{ key: "wf", label: "Open inspection workflow", onClick: openWorkflow }]
            : []),
          { key: "483", label: "View / download 483", onClick: download483 },
          {
            key: "eir",
            label: eirNarrative ? "View / download EIR" : "Download EIR (regenerates if empty)",
            onClick: downloadEir,
          },
          { key: "both", label: "Download 483 + EIR (zip)", onClick: downloadBoth },
        ];

        return {
          id: doc.id,
          timestamp: doc.approved_at,
          action: actionTitle,
          user: "Document library",
          details: buildDetails(doc, meta),
          investigator: doc.investigator_name?.trim() || undefined,
          supervisor: doc.supervisor_name?.trim() || undefined,
          statusBadge: statusLabel(doc.status),
          actions,
        };
      });
  }, [documents, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500">
          Inspection packages published or staged in the document library — investigator and supervisor sign-off,
          with quick access to Form FDA 483 and EIR outputs.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number]["value"])}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {!loading && (
          <span className="text-xs text-gray-400">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-8 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin text-navy-600" />
          Loading document library…
        </div>
      ) : entries.length > 0 ? (
        <AuditTrailTimeline entries={entries} />
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <History className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No document library entries for this filter.</p>
          <p className="mt-1 max-w-md text-sm text-gray-400">
            Final packages appear here after supervisor approval (ready to publish) and when marked published. Use the
            Document Library page to manage records.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Workflow rules for FDA inspection drafting (483 / EIR).
 * Shared by Next.js API routes and client components.
 */

import type { InspectionRecord } from "@/lib/db/inspection-service";

const STATUSES_ALLOW_483_EDIT = new Set(["assigned", "in_progress"]);
const STATUSES_ALLOW_GENERATE_483 = new Set(["assigned", "in_progress"]);

/** Lock rule from status only (client-safe). */
export function are483ObservationsLockedFromStatus(status: string | null | undefined): boolean {
  const s = (status || "").trim();
  if (!s) return false;
  if (STATUSES_ALLOW_483_EDIT.has(s)) return false;
  if (s === "rework_required") return false;
  return true;
}

export function are483ObservationsLocked(inspection: InspectionRecord): boolean {
  return are483ObservationsLockedFromStatus(inspection.status);
}

export function canGenerate483Draft(
  inspection: InspectionRecord,
  userId: string,
  role: string
): { ok: boolean; reason?: string } {
  if (role !== "investigator") {
    return { ok: false, reason: "Only assigned investigators can generate 483 draft observations" };
  }
  if (inspection.assigned_to && inspection.assigned_to !== userId) {
    return { ok: false, reason: "This inspection is assigned to another investigator" };
  }
  if (!STATUSES_ALLOW_GENERATE_483.has(inspection.status)) {
    return {
      ok: false,
      reason: `483 generation is not allowed in status ${inspection.status}. Open the workflow to request rework or continue from the correct phase.`,
    };
  }
  return { ok: true };
}

export function canUpdate483Observations(
  inspection: InspectionRecord,
  userId: string,
  role: string
): { ok: boolean; reason?: string } {
  if (are483ObservationsLocked(inspection)) {
    return {
      ok: false,
      reason:
        "483 observations are locked after submission. Request rework from the workflow if changes are required.",
    };
  }
  if (role !== "investigator") {
    return { ok: false, reason: "Only investigators can edit draft observations" };
  }
  if (inspection.assigned_to && inspection.assigned_to !== userId) {
    return { ok: false, reason: "This inspection is assigned to another investigator" };
  }
  return { ok: true };
}

export function canAccessDraftWorkspace(
  inspection: InspectionRecord,
  phase: "483" | "eir"
): { ok: boolean; reason?: string } {
  const st = (inspection.status || "").trim();
  if (phase === "483") {
    if (STATUSES_ALLOW_GENERATE_483.has(st)) return { ok: true };
    const allow483Review = new Set(["draft_completed", "rework_required"]);
    if (allow483Review.has(st)) return { ok: true };
    return {
      ok: false,
      reason: "483 workspace opens for assigned/in-progress drafting or after draft submission for review.",
    };
  }
  const eirDraft = new Set([
    "draft_completed",
    "approved_483",
    "sent_to_firm",
    "eir_assigned",
    "eir_drafting",
    "eir_submitted",
    "under_review",
    "rework_required",
  ]);
  if (eirDraft.has(st)) return { ok: true };
  return {
    ok: false,
    reason: "EIR drafting opens after the 483 draft is submitted and the workflow advances to EIR phases.",
  };
}

// ---------------------------------------------------------------------------
// eNSpect workflow guards — enforce that certain pages are only accessible
// when the inspection has reached the appropriate status.
// ---------------------------------------------------------------------------

const STATUSES_ALLOW_EIR_VIEW = new Set([
  "eir_assigned",
  "eir_drafting",
  "eir_submitted",
  "under_review",
  "rework_required",
  "eir_approved",
  "approved",
  "closed",
]);

const STATUSES_ALLOW_EVALUATION = new Set([
  "draft_completed",
  "approved_483",
  "sent_to_firm",
  "eir_assigned",
  "eir_drafting",
  "eir_submitted",
  "under_review",
  "rework_required",
  "eir_approved",
  "approved",
  "closed",
]);

const STATUSES_ALLOW_PUBLISH = new Set([
  "eir_approved",
  "approved",
  "closed",
]);

export function canAccessEirDocument(
  status: string | null | undefined
): { ok: boolean; reason?: string; redirectTo?: string } {
  const st = (status || "").trim();
  if (!st || !STATUSES_ALLOW_EIR_VIEW.has(st)) {
    return {
      ok: false,
      reason: "EIR documents are available after the 483 is approved and EIR drafting begins.",
      redirectTo: "/workflow",
    };
  }
  return { ok: true };
}

export function canAccessEvaluation(
  status: string | null | undefined
): { ok: boolean; reason?: string; redirectTo?: string } {
  const st = (status || "").trim();
  if (!st || !STATUSES_ALLOW_EVALUATION.has(st)) {
    return {
      ok: false,
      reason: "Evaluation is available after the draft is completed. Complete the 483 draft first.",
      redirectTo: "/workflow",
    };
  }
  return { ok: true };
}

export function canAccessPublish(
  status: string | null | undefined
): { ok: boolean; reason?: string; redirectTo?: string } {
  const st = (status || "").trim();
  if (!st || !STATUSES_ALLOW_PUBLISH.has(st)) {
    return {
      ok: false,
      reason: "Publishing is available only after final approval. Complete the review workflow first.",
      redirectTo: "/workflow",
    };
  }
  return { ok: true };
}

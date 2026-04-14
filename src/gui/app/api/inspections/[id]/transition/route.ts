import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  getInspectionById,
  mergeInspectionMetadata,
  saveUserSignatureProfile,
  transitionStatus,
  updateInspectionData,
  isFda483Pipeline,
  isFdaSequencedWorkflow,
  canUserAccessInspection,
  type InspectionStatus,
} from "@/lib/db/inspection-service";

const INVESTIGATOR_ACTIONS: Record<string, { status: InspectionStatus; action: string }> = {
  start: { status: "in_progress", action: "STARTED" },
  complete_draft: { status: "draft_completed", action: "DRAFT_COMPLETED" },
  submit_eir: { status: "eir_submitted", action: "EIR_SUBMITTED" },
  resume_rework: { status: "in_progress", action: "REWORK_STARTED" },
  resume_eir_rework: { status: "eir_drafting", action: "EIR_REWORK_STARTED" },
  start_eir_draft: { status: "eir_drafting", action: "EIR_DRAFTING_STARTED" },
};

const SUPERVISOR_ACTIONS: Record<string, { status: InspectionStatus; action: string }> = {
  start_review: { status: "under_review", action: "REVIEW_STARTED" },
  close: { status: "closed", action: "CLOSED" },
  approve_483: { status: "approved_483", action: "APPROVED_483" },
  /** Phase 5: supervisor rejects 483 draft → investigator continues in `in_progress`. */
  return_483_revision: { status: "in_progress", action: "483_RETURNED_FOR_REVISION" },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { transition, comments, signature } = await req.json();
    if (!transition) {
      return NextResponse.json({ error: "transition is required" }, { status: 400 });
    }

    const current = await getInspectionById(id);
    if (!current) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    if (!canUserAccessInspection(current, user.id, user.role)) {
      return NextResponse.json({ error: "Access restricted — this inspection is not assigned to you." }, { status: 403 });
    }

    const mapping =
      user.role === "supervisor"
        ? { ...INVESTIGATOR_ACTIONS, ...SUPERVISOR_ACTIONS }
        : INVESTIGATOR_ACTIONS;

    const entry = mapping[transition];
    if (!entry) {
      return NextResponse.json(
        { error: `Unknown transition '${transition}' for role '${user.role}'` },
        { status: 400 }
      );
    }

    if (transition === "approve_483" && user.role !== "supervisor") {
      return NextResponse.json({ error: "Only supervisors can approve Form FDA 483" }, { status: 403 });
    }

    if (transition === "start" && current.status !== "assigned") {
      return NextResponse.json(
        { error: "Start inspection is only valid when status is assigned" },
        { status: 400 }
      );
    }

    if (transition === "return_483_revision") {
      if (user.role !== "supervisor") {
        return NextResponse.json({ error: "Only supervisors can return the 483 for revision" }, { status: 403 });
      }
      if (current.status !== "draft_completed") {
        return NextResponse.json(
          { error: `Return 483 for revision requires draft_completed (current: ${current.status})` },
          { status: 400 }
        );
      }
    }

    if (transition === "submit_eir") {
      if (current.status !== "draft_completed" && current.status !== "eir_drafting") {
        return NextResponse.json(
          { error: `Sign and submit EIR is only valid from draft_completed or eir_drafting (current: ${current.status})` },
          { status: 400 }
        );
      }
    }

    const fdaWorkflowPath =
      isFda483Pipeline(current.metadata_json) || isFdaSequencedWorkflow(current.metadata_json);

    if (transition === "resume_rework") {
      if (fdaWorkflowPath) {
        return NextResponse.json(
          { error: "Use resume EIR rework for FDA pipeline inspections" },
          { status: 400 }
        );
      }
    }

    if (transition === "resume_eir_rework") {
      if (!fdaWorkflowPath) {
        return NextResponse.json({ error: "resume_eir_rework is only for FDA pipeline inspections" }, { status: 400 });
      }
      if (current.status !== "rework_required") {
        return NextResponse.json({ error: "Invalid status for EIR rework resume" }, { status: 400 });
      }
    }

    if (transition === "start_eir_draft") {
      if (current.status !== "eir_assigned") {
        return NextResponse.json({ error: "Start EIR draft is only valid from eir_assigned" }, { status: 400 });
      }
    }

    if (transition === "close") {
      if (current.status !== "approved" && current.status !== "eir_approved") {
        return NextResponse.json({ error: "Close is only valid from approved or eir_approved" }, { status: 400 });
      }
    }

    if (signature) {
      await saveUserSignatureProfile(user.id, {
        signatureType: signature.signatureType,
        signatureText: signature.signatureText,
        signatureImage: signature.signatureImage,
        signedName: signature.signedName,
        signedAt: signature.signedAt,
      });
      const insp = await getInspectionById(id);
      if (insp) {
        const metadata = (() => {
          try {
            return JSON.parse(insp.metadata_json || "{}");
          } catch {
            return {};
          }
        })();
        if (transition === "submit_eir") {
          metadata.investigator_signature_type = signature.signatureType;
          metadata.investigator_signature_text = signature.signatureText;
          metadata.investigator_signature_image = signature.signatureImage;
          metadata.investigator_signed_name = signature.signedName;
          metadata.investigator_signed_at = signature.signedAt;
        }
        await updateInspectionData(id, {
          metadata_json: JSON.stringify(metadata),
        });
      }
    }

    if (transition === "approve_483") {
      await mergeInspectionMetadata(id, { fda_pipeline: true });
    }

    const inspection = await transitionStatus(id, entry.status, user.id, entry.action, comments || "");
    return NextResponse.json({ inspection });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Cannot") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

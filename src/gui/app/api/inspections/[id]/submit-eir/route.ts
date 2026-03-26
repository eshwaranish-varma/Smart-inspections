import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  getInspectionById,
  saveUserSignatureProfile,
  transitionStatus,
  updateInspectionData,
} from "@/lib/db/inspection-service";

/** Investigator submits EIR after eir_drafting (FDA pipeline). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "investigator") {
      return NextResponse.json({ error: "Only investigators can submit EIR" }, { status: 403 });
    }

    const { comments, signature } = await req.json();
    const current = await getInspectionById(id);
    if (!current) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    if (current.status !== "eir_drafting") {
      return NextResponse.json(
        { error: `submit-eir requires status eir_drafting (current: ${current.status}). Use /transition with submit_eir for legacy draft_completed.` },
        { status: 400 }
      );
    }
    if (current.assigned_to && current.assigned_to !== user.id) {
      return NextResponse.json({ error: "This inspection is assigned to another investigator" }, { status: 403 });
    }

    if (signature) {
      await saveUserSignatureProfile(user.id, {
        signatureType: signature.signatureType,
        signatureText: signature.signatureText,
        signatureImage: signature.signatureImage,
        signedName: signature.signedName,
        signedAt: signature.signedAt,
      });
      const metadata = (() => {
        try {
          return JSON.parse(current.metadata_json || "{}");
        } catch {
          return {};
        }
      })();
      metadata.investigator_signature_type = signature.signatureType;
      metadata.investigator_signature_text = signature.signatureText;
      metadata.investigator_signature_image = signature.signatureImage;
      metadata.investigator_signed_name = signature.signedName;
      metadata.investigator_signed_at = signature.signedAt;
      await updateInspectionData(id, { metadata_json: JSON.stringify(metadata) });
    }

    const inspection = await transitionStatus(
      id,
      "eir_submitted",
      user.id,
      "EIR_SUBMITTED",
      typeof comments === "string" ? comments : ""
    );
    return NextResponse.json({ inspection });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Cannot") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

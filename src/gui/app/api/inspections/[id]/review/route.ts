import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { createReview, getInspectionById, updateInspectionData } from "@/lib/db/inspection-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json({ error: "Only supervisors can review inspections" }, { status: 403 });
    }

    const { decision, comments, signature } = await req.json();
    if (!decision || !["approved", "rework_required"].includes(decision)) {
      return NextResponse.json({ error: "decision must be 'approved' or 'rework_required'" }, { status: 400 });
    }

    if (signature) {
      const inspection = await getInspectionById(id);
      if (inspection) {
        const metadata = (() => {
          try {
            return JSON.parse(inspection.metadata_json || "{}");
          } catch {
            return {};
          }
        })();
        metadata.supervisor_signature_type = signature.signatureType;
        metadata.supervisor_signature_text = signature.signatureText;
        metadata.supervisor_signature_image = signature.signatureImage;
        metadata.supervisor_signed_name = signature.signedName;
        metadata.supervisor_signed_at = signature.signedAt;
        await updateInspectionData(id, {
          metadata_json: JSON.stringify(metadata),
        });
      }
    }

    await createReview(id, user.id, decision, comments || "", signature);
    return NextResponse.json({ success: true, decision });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Cannot") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

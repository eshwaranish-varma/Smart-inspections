import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  getInspectionById,
  mergeInspectionMetadata,
  transitionStatus,
} from "@/lib/db/inspection-service";
import { sendFda483ToFirmEmail } from "@/lib/email/send-fda483-email";
import { getBackendApiBaseUrl } from "@/lib/server/backend-api";
import {
  buildInspectionMetadataPayload,
  parseObservationsJson,
} from "@/lib/server/inspection-backend-payload";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json({ error: "Only supervisors can send Form FDA 483 to the firm" }, { status: 403 });
    }

    const body = await req.json();
    const firm_email = typeof body.firm_email === "string" ? body.firm_email.trim() : "";
    if (!firm_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firm_email)) {
      return NextResponse.json({ error: "firm_email is required and must be valid" }, { status: 400 });
    }

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    if (inspection.status !== "approved_483") {
      return NextResponse.json(
        { error: `Send to firm requires status approved_483 (current: ${inspection.status})` },
        { status: 400 }
      );
    }

    const observations = parseObservationsJson(inspection.observations_json);
    if (observations.length === 0) {
      return NextResponse.json({ error: "No FDA 483 observations to attach" }, { status: 400 });
    }

    const form_data = buildInspectionMetadataPayload(inspection);
    const api = getBackendApiBaseUrl();
    const genRes = await fetch(`${api}/documents/generate-483`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_data,
        observations,
        raw_notes: inspection.raw_notes || "",
      }),
    });
    if (!genRes.ok) {
      const errText = await genRes.text();
      return NextResponse.json(
        { error: `Document generation failed: ${errText.slice(0, 500)}` },
        { status: 502 }
      );
    }
    const buf = Buffer.from(await genRes.arrayBuffer());

    await sendFda483ToFirmEmail({
      to: firm_email,
      firmName: String(form_data.firm_name || inspection.firm_name),
      inspectionTitle: inspection.title,
      docxBuffer: buf,
      filename: `FDA_483_${inspection.fei_number || inspection.id}.docx`,
    });

    await mergeInspectionMetadata(id, {
      firm_sent_483_email: firm_email,
      firm_sent_483_at: new Date().toISOString(),
    });

    const updated = await transitionStatus(id, "sent_to_firm", user.id, "SENT_483_TO_FIRM", `Emailed to ${firm_email}`);
    return NextResponse.json({ inspection: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Cannot") || msg.includes("SMTP") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

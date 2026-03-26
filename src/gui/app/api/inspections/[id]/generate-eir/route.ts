import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  getInspectionById,
  isFda483Pipeline,
  isFdaSequencedWorkflow,
  updateInspectionData,
} from "@/lib/db/inspection-service";
import { getBackendApiBaseUrl } from "@/lib/server/backend-api";
import {
  buildInspectionMetadataPayload,
  parseObservationsJson,
} from "@/lib/server/inspection-backend-payload";

const ALLOWED: Set<string> = new Set(["eir_assigned", "eir_drafting", "rework_required"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "investigator") {
      return NextResponse.json({ error: "Only investigators can generate EIR drafts" }, { status: 403 });
    }

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });

    if (!ALLOWED.has(inspection.status)) {
      return NextResponse.json(
        { error: `EIR generation not allowed in status ${inspection.status}` },
        { status: 400 }
      );
    }
    if (
      inspection.status === "rework_required" &&
      !isFda483Pipeline(inspection.metadata_json) &&
      !isFdaSequencedWorkflow(inspection.metadata_json)
    ) {
      return NextResponse.json({ error: "EIR pipeline generation is only for FDA workflow inspections" }, { status: 400 });
    }
    if (inspection.assigned_to && inspection.assigned_to !== user.id) {
      return NextResponse.json({ error: "This inspection is assigned to another investigator" }, { status: 403 });
    }

    const observations = parseObservationsJson(inspection.observations_json);
    if (observations.length === 0) {
      return NextResponse.json({ error: "FDA 483 observations are required before EIR generation" }, { status: 400 });
    }

    const form_data = buildInspectionMetadataPayload(inspection);
    const api = getBackendApiBaseUrl();
    const genRes = await fetch(`${api}/ai/generate-eir-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observations,
        inspection_metadata: form_data,
        raw_notes: inspection.raw_notes || "",
      }),
    });
    if (!genRes.ok) {
      const errText = await genRes.text();
      return NextResponse.json(
        { error: `EIR pipeline failed: ${errText.slice(0, 500)}` },
        { status: 502 }
      );
    }
    const eirPayload = await genRes.json();
    const meta = JSON.parse(inspection.metadata_json || "{}") as Record<string, unknown>;
    meta.eir_generated_at = new Date().toISOString();
    meta.eir_generation_source = "pipeline_v1";

    const updated = await updateInspectionData(id, {
      eir_json: JSON.stringify(eirPayload),
      metadata_json: JSON.stringify(meta),
      create_version: true,
      version_type: "DRAFT",
      version_comments: "EIR narrative generated (post–483 pipeline)",
      performed_by: user.id,
    });

    return NextResponse.json({ inspection: updated, eir: eirPayload });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getInspectionById, updateInspectionData, canUserAccessInspection } from "@/lib/db/inspection-service";
import { canUpdate483Observations } from "@/lib/inspection-workflow-policy";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const current = await getInspectionById(id);
    if (!current) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    if (!canUserAccessInspection(current, user.id, user.role)) {
      return NextResponse.json({ error: "Access restricted" }, { status: 403 });
    }

    const body = await req.json();

    if (body.observations_json !== undefined) {
      const obsGate = canUpdate483Observations(current, user.id, user.role);
      if (!obsGate.ok) {
        return NextResponse.json({ error: obsGate.reason }, { status: 403 });
      }
    }

    const inspection = await updateInspectionData(id, {
      observations_json: body.observations_json,
      eir_json: body.eir_json,
      metadata_json: body.metadata_json,
      raw_notes: body.raw_notes,
      create_version: body.create_version,
      version_type: body.version_type,
      version_comments: body.version_comments,
      performed_by: user.id,
    });
    return NextResponse.json({ inspection });
  } catch (error) {
    console.error("PUT inspection data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

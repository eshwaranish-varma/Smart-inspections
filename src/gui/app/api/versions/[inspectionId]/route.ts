import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getInspectionVersions } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

/** Alias for GET /api/inspections/[id]/versions — document version history for an inspection. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params;
    const user = await getCurrentUserFromRequest(_req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const document_versions = await getInspectionVersions(inspectionId);
    return NextResponse.json({ inspection_id: inspectionId, document_versions });
  } catch (error) {
    console.error("GET /api/versions/[inspectionId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

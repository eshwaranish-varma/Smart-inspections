import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getInspectionById, canUserAccessInspection } from "@/lib/db/inspection-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!canUserAccessInspection(inspection, user.id, user.role)) {
      return NextResponse.json({ error: "Access restricted — this inspection is not assigned to you." }, { status: 403 });
    }

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error("GET /api/inspections/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

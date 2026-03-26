import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getInspectionVersions } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const versions = await getInspectionVersions(id);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("GET /api/inspections/[id]/versions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

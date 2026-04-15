import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getInspectionById, setInspectionWorkflowArchived } from "@/lib/db/inspection-service";

/** Supervisor-only: set `workflow_archived` to hide an inspection from active workflow or restore it. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json(
        { error: "Only supervisors can archive or restore inspections" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const archived = Boolean((body as { archived?: unknown }).archived);

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });

    const updated = await setInspectionWorkflowArchived(id, archived, user.id);
    return NextResponse.json({ inspection: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("POST /api/inspections/[id]/archive error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

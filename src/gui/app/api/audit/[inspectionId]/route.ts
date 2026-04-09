import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  getWorkflowLogs,
  listAiRunsForInspection,
  listInspectionReviewsForAudit,
  listSupplementalAuditLogs,
} from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

/** Aggregated audit trail: workflow history, reviews, AI runs, and supplemental audit rows. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ inspectionId: string }> }
) {
  try {
    const { inspectionId } = await params;
    const user = await getCurrentUserFromRequest(_req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [workflow, reviews, aiRuns, auditLogs] = await Promise.all([
      getWorkflowLogs(inspectionId),
      listInspectionReviewsForAudit(inspectionId),
      listAiRunsForInspection(inspectionId),
      listSupplementalAuditLogs(inspectionId),
    ]);

    return NextResponse.json({
      inspection_id: inspectionId,
      workflow_logs: workflow,
      inspection_reviews: reviews,
      ai_runs: aiRuns,
      audit_logs: auditLogs,
    });
  } catch (error) {
    console.error("GET /api/audit/[inspectionId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

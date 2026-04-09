import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  getInspectionById,
  insertAiRun,
  insertAuditLog,
} from "@/lib/db/inspection-service";
import { getBackendApiBaseUrl } from "@/lib/server/backend-api";
import { canGenerate483Draft } from "@/lib/inspection-workflow-policy";

/**
 * Workflow-scoped 483 draft observation generation (replaces calling /api/ai/generate-observations directly).
 * Validates inspection status and investigator assignment before invoking the AI backend.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });

    const gate = canGenerate483Draft(inspection, user.id, user.role);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: 403 });
    }

    const body = await req.json();
    const {
      raw_notes,
      establishment_type,
      cfr_parts = [],
      additional_context,
      ground_truth,
      inspection_title,
      skip_observation_count_estimate,
      refinement_feedback,
    } = body;

    if (!raw_notes || typeof raw_notes !== "string" || !raw_notes.trim()) {
      return NextResponse.json({ error: "raw_notes is required" }, { status: 400 });
    }
    if (!establishment_type || typeof establishment_type !== "string") {
      return NextResponse.json({ error: "establishment_type is required" }, { status: 400 });
    }

    const api = getBackendApiBaseUrl();
    const genRes = await fetch(`${api}/ai/generate-observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw_notes,
        establishment_type,
        cfr_parts: Array.isArray(cfr_parts) ? cfr_parts : [],
        additional_context: additional_context ?? {},
        ground_truth: ground_truth ?? null,
        inspection_id: id,
        inspection_title: inspection_title ?? null,
        skip_observation_count_estimate: Boolean(skip_observation_count_estimate),
        refinement_feedback: refinement_feedback ?? null,
      }),
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      return NextResponse.json(
        { error: `Generate 483 failed: ${errText.slice(0, 500)}` },
        { status: 502 }
      );
    }

    const payload = await genRes.json();

    await insertAiRun({
      inspectionId: id,
      userId: user.id,
      runType: "generate_483_observations",
      model: "generate-observations",
      docId: typeof payload?.doc_id === "string" ? payload.doc_id : null,
      outputSummary: {
        observation_count: Array.isArray(payload?.observations) ? payload.observations.length : 0,
        pipeline_run_id:
          typeof payload?.pipeline_run_id === "string" ? payload.pipeline_run_id : null,
      },
    });
    await insertAuditLog({
      inspectionId: id,
      userId: user.id,
      action: "GENERATE_483_DRAFT",
      entityType: "observations",
      changes: { doc_id: payload?.doc_id ?? null },
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

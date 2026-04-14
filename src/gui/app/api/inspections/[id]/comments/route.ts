import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { addInspectionComment, getInspectionComments, getInspectionById, canUserAccessInspection } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canUserAccessInspection(inspection, user.id, user.role)) {
      return NextResponse.json({ error: "Access restricted" }, { status: 403 });
    }

    const comments = await getInspectionComments(id);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET /api/inspections/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const inspection = await getInspectionById(id);
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canUserAccessInspection(inspection, user.id, user.role)) {
      return NextResponse.json({ error: "Access restricted" }, { status: 403 });
    }

    const { comment } = await req.json();
    if (!comment || !String(comment).trim()) {
      return NextResponse.json({ error: "comment is required" }, { status: 400 });
    }
    const created = await addInspectionComment(id, user.id, user.role, String(comment).trim());
    return NextResponse.json({ comment: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/inspections/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

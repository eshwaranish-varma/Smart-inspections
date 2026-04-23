import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { reassignAssociateInvestigator } from "@/lib/db/inspection-service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json(
        { error: "Only supervisors can edit the associate investigator" },
        { status: 403 }
      );
    }

    const { assignedTo, comments } = await req.json();
    if (!assignedTo || typeof assignedTo !== "string") {
      return NextResponse.json({ error: "assignedTo is required" }, { status: 400 });
    }

    const inspection = await reassignAssociateInvestigator(
      id,
      assignedTo,
      user.id,
      typeof comments === "string" ? comments : ""
    );

    return NextResponse.json({ inspection });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Cannot") || msg.includes("not") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

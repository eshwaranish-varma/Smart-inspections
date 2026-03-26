import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getWorkflowLogs } from "@/lib/db/inspection-service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const logs = await getWorkflowLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET timeline error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { markNotificationRead } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await markNotificationRead(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/[id]/read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

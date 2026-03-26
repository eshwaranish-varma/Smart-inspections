import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { markAllNotificationsRead } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/read-all error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

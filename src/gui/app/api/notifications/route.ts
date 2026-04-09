import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getNotifications, getUnreadNotificationCount } from "@/lib/db/inspection-service";
import { jsonServerError } from "@/lib/server/json-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(user.id),
      getUnreadNotificationCount(user.id),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return jsonServerError("Internal server error", error);
  }
}

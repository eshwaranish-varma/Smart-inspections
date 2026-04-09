import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getActiveDraftCount, getDocumentPublishSummary } from "@/lib/db/inspection-service";
import { jsonServerError } from "@/lib/server/json-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [summary, activeDrafts] = await Promise.all([getDocumentPublishSummary(), getActiveDraftCount()]);
    return NextResponse.json({ ...summary, activeDrafts });
  } catch (error) {
    return jsonServerError("Internal server error", error);
  }
}

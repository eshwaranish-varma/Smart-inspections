import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getInvestigators } from "@/lib/db/user-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const investigators = await getInvestigators();
    return NextResponse.json({ investigators });
  } catch (error) {
    console.error("GET investigators error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

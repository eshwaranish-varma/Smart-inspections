import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getBestPdfUrlForInspection } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

/** Resolve PDF URL for evidence viewer: latest version snapshot, else document library final PDF. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(_req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const pdf_url = await getBestPdfUrlForInspection(id);
    return NextResponse.json({ pdf_url });
  } catch (e) {
    console.error("GET evidence-pdf:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

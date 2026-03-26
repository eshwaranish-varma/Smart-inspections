import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getApprovedDocument, listApprovedDocuments } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const document = await getApprovedDocument(id);
      if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ document });
    }

    const year = req.nextUrl.searchParams.get("year");
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const investigatorId = req.nextUrl.searchParams.get("investigatorId") || undefined;
    const supervisorId = req.nextUrl.searchParams.get("supervisorId") || undefined;
    const documents = await listApprovedDocuments({
      year: year ? Number(year) : undefined,
      status,
      investigatorId,
      supervisorId,
    });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("GET /api/document-library error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

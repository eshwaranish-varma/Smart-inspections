import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  createInspection,
  getAllInspections,
  getInspectionsByUser,
} from "@/lib/db/inspection-service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const view = req.nextUrl.searchParams.get("view");

    if (user.role === "supervisor" || view === "all") {
      const inspections = await getAllInspections(status);
      return NextResponse.json({ inspections });
    }

    const inspections = await getInspectionsByUser(user.id);
    return NextResponse.json({ inspections });
  } catch (error) {
    console.error("GET /api/inspections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json({ error: "Only supervisors can create assignments" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title || !body.firmName) {
      return NextResponse.json({ error: "Title and firm name are required" }, { status: 400 });
    }

    const inspection = await createInspection({ ...body, createdBy: user.id });
    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error) {
    console.error("POST /api/inspections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

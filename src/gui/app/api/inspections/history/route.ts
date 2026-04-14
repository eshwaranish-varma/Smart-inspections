import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import pool from "@/lib/db/client";
import { ensureAuthTables } from "@/lib/db/user-service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json({ error: "Only supervisors can view company history" }, { status: 403 });
    }

    const companyName = req.nextUrl.searchParams.get("company_name");
    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ history: [] });
    }

    await ensureAuthTables();

    const result = await pool.query<{
      inspection_id: string;
      title: string;
      investigator_name: string | null;
      year: string;
      status: string;
      firm_name: string;
    }>(
      `SELECT
         i.id AS inspection_id,
         i.title,
         (u.first_name || ' ' || u.last_name) AS investigator_name,
         EXTRACT(YEAR FROM i.created_at)::text AS year,
         i.status,
         i.firm_name
       FROM inspections i
       LEFT JOIN users u ON u.id = i.assigned_to
       WHERE i.firm_name ILIKE $1
       ORDER BY i.created_at DESC
       LIMIT 50`,
      [`%${companyName.trim()}%`]
    );

    return NextResponse.json({ history: result.rows });
  } catch (error) {
    console.error("GET /api/inspections/history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

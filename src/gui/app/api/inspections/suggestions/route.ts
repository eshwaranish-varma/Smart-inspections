import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import pool from "@/lib/db/client";
import { ensureAuthTables } from "@/lib/db/user-service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "supervisor") {
      return NextResponse.json({ error: "Only supervisors can view suggestions" }, { status: 403 });
    }

    const companyName = req.nextUrl.searchParams.get("company_name");
    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ suggestions: [] });
    }

    await ensureAuthTables();

    const result = await pool.query<{
      investigator_id: string;
      investigator_name: string;
      total_inspections: string;
      completed_count: string;
      avg_completion_days: string | null;
      last_inspection_year: string | null;
      last_inspection_date: string | null;
      last_status: string | null;
    }>(
      `SELECT
         i.assigned_to AS investigator_id,
         (u.first_name || ' ' || u.last_name) AS investigator_name,
         COUNT(*)::text AS total_inspections,
         COUNT(*) FILTER (WHERE i.status IN ('approved','eir_approved','closed'))::text AS completed_count,
         ROUND(AVG(
           CASE WHEN i.completed_at IS NOT NULL AND i.created_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (i.completed_at - i.created_at)) / 86400.0
                ELSE NULL
           END
         ), 1)::text AS avg_completion_days,
         EXTRACT(YEAR FROM MAX(i.created_at))::text AS last_inspection_year,
         MAX(i.created_at)::text AS last_inspection_date,
         (ARRAY_AGG(i.status ORDER BY i.created_at DESC))[1] AS last_status
       FROM inspections i
       JOIN users u ON u.id = i.assigned_to
       WHERE i.firm_name ILIKE $1
         AND i.assigned_to IS NOT NULL
       GROUP BY i.assigned_to, u.first_name, u.last_name
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [`%${companyName.trim()}%`]
    );

    return NextResponse.json({ suggestions: result.rows.map(r => ({
      investigator_id: r.investigator_id,
      investigator_name: r.investigator_name,
      total_inspections: Number(r.total_inspections),
      completed_count: Number(r.completed_count),
      avg_completion_days: r.avg_completion_days ? Number(r.avg_completion_days) : null,
      last_inspection_year: r.last_inspection_year,
      last_inspection_date: r.last_inspection_date,
      last_status: r.last_status,
    }))});
  } catch (error) {
    console.error("GET /api/inspections/suggestions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

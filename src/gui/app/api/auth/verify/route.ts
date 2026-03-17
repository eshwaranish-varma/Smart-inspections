import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();

    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND verification_code = $2 AND verification_expires_at > NOW()`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE users
         SET is_verified = TRUE,
             verification_code = NULL,
             verification_expires_at = NULL,
             updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    await pool.query(
      `UPDATE email_verifications SET used = TRUE WHERE user_id = $1 AND code = $2`,
      [userId, code]
    );

    return NextResponse.json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


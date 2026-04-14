import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/client";
import { signToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and verification code are required." },
        { status: 400 }
      );
    }

    const trimmedCode = String(code).trim();

    // Try users table first (primary store)
    let result = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND verification_code = $2 AND verification_expires_at > NOW()`,
      [userId, trimmedCode]
    );

    // Fallback: check email_verifications table (resent codes are also stored here)
    if (result.rows.length === 0) {
      const evResult = await pool.query(
        `SELECT u.* FROM email_verifications ev
           JOIN users u ON u.id = ev.user_id
         WHERE ev.user_id = $1 AND ev.code = $2 AND ev.used = FALSE AND ev.expires_at > NOW()
         LIMIT 1`,
        [userId, trimmedCode]
      );
      if (evResult.rows.length > 0) {
        result = evResult;
      }
    }

    if (result.rows.length === 0) {
      // Check if code matched but expired, to give a better error message
      const expiredCheck = await pool.query(
        `SELECT verification_code, verification_expires_at FROM users WHERE id = $1`,
        [userId]
      );
      const row = expiredCheck.rows[0];
      if (row && row.verification_code === trimmedCode && row.verification_expires_at) {
        return NextResponse.json(
          { error: "Verification code has expired. Please resend a new code." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    const user = result.rows[0];

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

    const token = signToken({
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fdaPosition: user.fda_position || undefined,
      role: user.role || "investigator",
    });

    const response = NextResponse.json({
      message: "Email verified successfully. Signing you in…",
      autoLogin: true,
    });

    setSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


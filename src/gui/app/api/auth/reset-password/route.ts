import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithOtp } from "@/lib/auth/auth-service";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const trimmedCode = String(code || "").trim();
    const newPassword = String(password || "");

    if (!normalizedEmail || !trimmedCode || !newPassword) {
      return NextResponse.json(
        { error: "Email, verification code, and new password are required." },
        { status: 400 }
      );
    }

    if (trimmedCode.length !== 6) {
      return NextResponse.json(
        { error: "Verification code must be 6 digits." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithOtp({
      email: normalizedEmail,
      code: trimmedCode,
      password: newPassword,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired reset code." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      message: "Password reset successfully. Redirecting to dashboard.",
    });
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

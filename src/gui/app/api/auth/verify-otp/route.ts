import { NextRequest, NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/auth/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();
    const verifiedUser = await verifyEmailOtp(String(userId || ""), String(code || ""));

    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

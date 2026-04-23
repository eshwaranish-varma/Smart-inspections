import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetOtp } from "@/lib/auth/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    await sendPasswordResetOtp(normalizedEmail);

    return NextResponse.json({
      message: "If an account exists for this email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

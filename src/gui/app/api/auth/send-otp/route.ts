import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getUserById } from "@/lib/db/user-service";
import { resendVerificationOtp } from "@/lib/auth/auth-service";

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json();

    const user = userId
      ? await getUserById(String(userId))
      : email
        ? await getUserByEmail(String(email))
        : null;

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.is_verified) {
      return NextResponse.json({ error: "Email already verified." }, { status: 400 });
    }

    await resendVerificationOtp(user);
    return NextResponse.json({ message: "Verification code sent." });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

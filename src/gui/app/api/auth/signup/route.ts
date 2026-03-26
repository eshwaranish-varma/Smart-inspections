import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/user-service";
import { registerUser, resendVerificationOtp } from "@/lib/auth/auth-service";

export async function POST(req: NextRequest) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      fdaPosition,
      role,
      address,
      city,
      state,
      country,
      zipCode,
      password,
    } = await req.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "Required fields missing." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      if (existingUser.is_verified) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      await resendVerificationOtp(existingUser);
      return NextResponse.json({
        message:
          "Account already exists but is not verified. A new verification code has been sent.",
        userId: existingUser.id,
      });
    }

    const { user } = await registerUser({
      firstName,
      lastName,
      email,
      phone,
      fdaPosition,
      role: role === "supervisor" ? "supervisor" : "investigator",
      address,
      city,
      state,
      country,
      zipCode,
      password,
    });

    return NextResponse.json(
      {
        message:
          "Account created. Please check your email for a verification code.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


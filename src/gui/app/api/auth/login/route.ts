import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import { validateLoginCredentials } from "@/lib/auth/auth-service";
import { isDatabaseUnavailableError } from "@/lib/db/user-service";
import { jsonServerError } from "@/lib/server/json-error";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const result = await validateLoginCredentials(email, password);
    if (result.status === "invalid_credentials") {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (result.status === "verification_required") {
      return NextResponse.json(
        {
          error: "Please verify your email before logging in.",
          status: "verification_required",
          needsVerification: true,
          userId: result.user.id,
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      message: "Login successful.",
      user: {
        id: result.user.id,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        email: result.user.email,
        fdaPosition: result.user.fda_position,
      },
    });

    setSessionCookie(response, result.token);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 503 }
      );
    }
    return jsonServerError("Internal server error.", error);
  }
}


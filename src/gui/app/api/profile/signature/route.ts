import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import { getUserSignatureProfile, saveUserSignatureProfile } from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const signature = await getUserSignatureProfile(user.id);
    return NextResponse.json({ signature });
  } catch (error) {
    console.error("GET /api/profile/signature error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    await saveUserSignatureProfile(user.id, {
      signatureType: body.signatureType,
      signatureText: body.signatureText,
      signatureImage: body.signatureImage,
      signedName: body.signedName,
      signedAt: body.signedAt,
    });
    const signature = await getUserSignatureProfile(user.id);
    return NextResponse.json({ signature });
  } catch (error) {
    console.error("PUT /api/profile/signature error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

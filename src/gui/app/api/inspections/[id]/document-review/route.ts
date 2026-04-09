import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/get-current-user";
import {
  addDocumentReviewComment,
  addDocumentReviewSignature,
  listDocumentReviewComments,
  listDocumentReviewSignatures,
} from "@/lib/db/inspection-service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(_req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const [comments, signatures] = await Promise.all([
      listDocumentReviewComments(id),
      listDocumentReviewSignatures(id),
    ]);
    return NextResponse.json({ comments, signatures });
  } catch (e) {
    console.error("GET document-review:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      type: "comment" | "signature";
      body?: string;
      document_kind?: string;
      page_number?: number | null;
      signer_name?: string;
      decision?: "approve" | "reject";
      signature_note?: string | null;
    };

    if (body.type === "comment") {
      if (!body.body?.trim()) {
        return NextResponse.json({ error: "Comment body required" }, { status: 400 });
      }
      const row = await addDocumentReviewComment({
        inspectionId: id,
        authorId: user.id,
        body: body.body.trim(),
        documentKind: body.document_kind,
        pageNumber: body.page_number ?? null,
      });
      return NextResponse.json({ comment: row });
    }

    if (body.type === "signature") {
      if (user.role !== "supervisor") {
        return NextResponse.json({ error: "Only supervisors can sign review decisions" }, { status: 403 });
      }
      const name =
        body.signer_name?.trim() ||
        [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
        user.email;
      if (!body.decision) {
        return NextResponse.json({ error: "decision required" }, { status: 400 });
      }
      const row = await addDocumentReviewSignature({
        inspectionId: id,
        signerId: user.id,
        signerName: name,
        decision: body.decision,
        signatureNote: body.signature_note ?? null,
      });
      return NextResponse.json({ signature: row });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    console.error("POST document-review:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

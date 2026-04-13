import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * JSON error response. In development, `error` includes the underlying message
 * so UI toasts and Network responses show what failed (without exposing stacks).
 */
export function jsonServerError(
  publicMessage: string,
  error: unknown,
  status = 500
): NextResponse {
  const detail = messageFromUnknown(error);
  console.error(publicMessage, error);
  return NextResponse.json(
    {
      error: isDev ? `${publicMessage}: ${detail}` : publicMessage,
      ...(isDev && { detail }),
    },
    { status }
  );
}

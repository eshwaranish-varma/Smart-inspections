/**
 * Lightweight fetch wrapper for Next.js App Router.
 * All calls go through /api/* (BFF pattern) — the Next.js API routes
 * proxy to the FastAPI backend so the browser never hits the backend directly.
 */

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: isFormData
      ? (options?.headers || {})
      : {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
  });

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? (data as Record<string, unknown>).detail
        : null) ??
      (data && typeof data === "object" && "error" in data
        ? (data as Record<string, unknown>).error
        : null) ??
      res.statusText;
    throw new ApiError(String(detail), res.status, data);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return res as unknown as T;
}

export async function apiFetchBlob(
  url: string,
  options?: RequestInit,
): Promise<Blob> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(`Download failed: ${res.statusText}`, res.status);
  }

  return res.blob();
}

/** Base URL for the FastAPI backend (e.g. http://localhost:8000/api). */
export function getBackendApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.BACKEND_API_URL?.trim();
  const base = configured || "http://localhost:8000";
  const trimmed = base.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

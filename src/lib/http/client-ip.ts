import type { NextRequest } from "next/server";

/**
 * Best-effort client IP for rate limiting (NFR-4.8). `x-forwarded-for` can
 * carry a comma-separated chain through multiple proxies — the first entry
 * is the original client. Falls back to `"unknown"` rather than throwing,
 * so a deployment without a proxy in front of it still rate-limits (all
 * such requests share one bucket, which is the safe direction to fail in).
 *
 * Shared by every auth route that rate-limits by IP, so the extraction
 * logic has exactly one definition to keep in sync.
 */
export function clientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

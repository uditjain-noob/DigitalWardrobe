import { NextResponse, type NextRequest } from "next/server";

import { registerAccount } from "../../../../features/accounts/register";
import { setSessionCookie } from "../../../../lib/auth/cookies";
import { createSession } from "../../../../lib/auth/session";

/**
 * Best-effort client IP for rate limiting (NFR-4.8). `x-forwarded-for` can
 * carry a comma-separated chain through multiple proxies — the first entry
 * is the original client. Falls back to `"unknown"` rather than throwing,
 * so a deployment without a proxy in front of it still rate-limits (all
 * such requests share one bucket, which is the safe direction to fail in).
 */
function clientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const result = await registerAccount({
    email,
    password,
    ip: clientIp(request),
  });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/signup?error=${result.error}`, request.url),
      { status: 303 },
    );
  }

  // Signed in but unverified: the session exists so the user lands inside
  // the app immediately, while `emailVerifiedAt` stays null until they
  // follow the emailed link.
  const { token, expiresAt } = await createSession(result.value.userId);
  await setSessionCookie(token, expiresAt);

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

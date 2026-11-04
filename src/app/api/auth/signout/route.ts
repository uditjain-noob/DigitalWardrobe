import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "../../../../env";
import { clearSessionCookie } from "../../../../lib/auth/cookies";
import { revokeSession } from "../../../../lib/auth/session";

/**
 * Sign-out must do two things together, not either alone: revoke the
 * session server-side (so the token is dead even if a copy of the cookie
 * survives somewhere — a shared machine, a proxy cache, browser history)
 * and clear the cookie client-side (so the browser stops presenting it).
 * Clearing the cookie without revoking the session would leave the token
 * itself still valid against the database; revoking without clearing
 * would leave the browser holding a cookie that silently stops working.
 * Both run on every sign-out, in that order, from this one handler.
 *
 * POST, not GET: a cross-site top-level navigation still carries a
 * `sameSite: 'lax'` cookie (see `setSessionCookie`'s comment), so a GET
 * sign-out link could be triggered by a plain `<a>`/prefetch on another
 * site. A cross-site POST does not carry the cookie, so only this site's
 * own sign-out form can trigger it.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;

  if (token) {
    await revokeSession(token);
  }
  await clearSessionCookie();

  return NextResponse.redirect(new URL("/signin", request.url), {
    status: 303,
  });
}

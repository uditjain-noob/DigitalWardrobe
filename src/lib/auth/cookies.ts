import { cookies } from "next/headers";

import { env } from "../../env";
import { type SessionUser, validateSessionToken } from "./session";

/**
 * `sameSite: 'lax'` plus Next Server Actions' built-in origin check is this
 * project's CSRF protection (NFR-4.8) — do not weaken either half of it.
 */
export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies();
  store.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete({
    name: env.SESSION_COOKIE_NAME,
    path: "/",
  });
}

/**
 * Reads the session cookie from the current request and resolves it to the
 * signed-in user, or `null` if there is no cookie or the token no longer
 * validates (unknown, expired, or revoked).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return validateSessionToken(token);
}

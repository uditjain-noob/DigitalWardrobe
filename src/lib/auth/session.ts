import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "../../db";
import { sessions, users } from "../../db/schema";

const SESSION_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — FR-12.3.

export type SessionUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
};

/**
 * SHA-256 of the raw token, hex-encoded. Deterministic and one-way, so the
 * database never stores (or leaks) anything an attacker could present back
 * as a valid session.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new session for `userId` and returns the raw token (to be set
 * in the cookie) and its expiry. Only the token's SHA-256 hash is persisted.
 */
export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Looks up the session for a raw token and returns the owning user, or
 * `null` if the token is unknown, expired, or has been revoked — all three
 * are indistinguishable to the caller by design.
 */
export async function validateSessionToken(
  token: string,
): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row ?? null;
}

/** Revokes a single session by its raw token. A no-op for an unknown token. */
export async function revokeSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Revokes every session belonging to `userId` (e.g. on password change). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

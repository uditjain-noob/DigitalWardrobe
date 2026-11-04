import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db } from "../../db";
import { users } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { createSession } from "../../lib/auth/session";
import { consumeRateLimit } from "../../lib/limits/rate-limit";
import { err, ok, type Result } from "../../shared/result";

const SIGNIN_RATE_LIMIT = 10;
const SIGNIN_RATE_WINDOW_SECONDS = 60 * 60; // 1 hour — NFR-4.8.

export type SignInInput = {
  email: string;
  password: string;
  ip: string;
};

export type SignInError = "invalid_credentials" | "rate_limited";

/**
 * A real argon2id hash of a value nobody will ever type, computed once and
 * cached. When the email doesn't match any account, `signIn` still runs a
 * full `verifyPassword` against this instead of returning immediately, so
 * the response takes roughly the same time whether the account exists or
 * not — a wrong password and an unknown address must be indistinguishable
 * not just in the returned error code, but in how long the caller waited
 * for it.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = hashPassword(randomBytes(32).toString("hex"));
  }
  return dummyHash;
}

/**
 * Sign-in (FR-1.2). Succeeds for an unverified account — verification
 * gates nothing here; it only gates whatever later feature requires it.
 * A wrong password and an unknown email both return `'invalid_credentials'`
 * (never reveal whether an address has an account), and rate limiting runs
 * before the lookup so the limiter itself cannot be used to tell the two
 * apart either.
 */
export async function signIn(
  input: SignInInput,
): Promise<Result<{ token: string; expiresAt: Date }, SignInError>> {
  const { allowed } = await consumeRateLimit(
    `signin:${input.email}`,
    SIGNIN_RATE_LIMIT,
    SIGNIN_RATE_WINDOW_SECONDS,
  );
  if (!allowed) {
    return err("rate_limited");
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, input.email));

  if (!user) {
    await verifyPassword(await getDummyHash(), input.password);
    return err("invalid_credentials");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    return err("invalid_credentials");
  }

  const { token, expiresAt } = await createSession(user.id);
  return ok({ token, expiresAt });
}

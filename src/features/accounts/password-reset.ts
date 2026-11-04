import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db";
import { emailTokens, users } from "../../db/schema";
import { env } from "../../env";
import { hashPassword } from "../../lib/auth/password";
import { revokeAllSessions } from "../../lib/auth/session";
import { getMailer } from "../../lib/email";
import { consumeRateLimit } from "../../lib/limits/rate-limit";
import { err, ok, type Result } from "../../shared/result";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour.
const RESET_RATE_LIMIT = 3;
const RESET_RATE_WINDOW_SECONDS = 60 * 60; // 1 hour — NFR-4.8.
const MIN_PASSWORD_LENGTH = 12;

/** SHA-256 of the raw token, hex-encoded — same scheme as session tokens
 * and email-verification tokens. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resetLink(token: string): string {
  return `${env.APP_URL}/reset?token=${token}`;
}

export type RequestPasswordResetInput = {
  email: string;
  ip: string;
};

/**
 * Requests a password-reset email (FR-1.3). Returns `void` — not a
 * `Result` — by design: a caller must never be able to learn whether a
 * given address has an account, so there is no field anywhere in the
 * return value for "sent" vs. "address unknown" vs. "rate limited" to
 * leak through. All three take the exact same code path from the caller's
 * point of view: this function resolves, and nothing else is observable.
 *
 * Rate limiting runs before the lookup, for the same reason it does in
 * `signIn` and `registerAccount` — it must not itself become a side
 * channel for probing which addresses exist.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<void> {
  const { allowed } = await consumeRateLimit(
    `reset:${input.email}`,
    RESET_RATE_LIMIT,
    RESET_RATE_WINDOW_SECONDS,
  );
  if (!allowed) {
    return;
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email));
  if (!user) {
    return;
  }

  const token = randomBytes(32).toString("base64url");
  await db.insert(emailTokens).values({
    id: hashToken(token),
    userId: user.id,
    purpose: "reset",
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  // Best-effort, same precedent as `registerAccount`: a mailer outage must
  // not throw out of a function whose whole contract is "always resolves,
  // never reveals anything." There is no success value here to signal
  // non-delivery on (the function returns `void`), and no session yet for
  // a UI to react from either — the address-privacy guarantee above is
  // exactly why this has to stay a silent best-effort attempt rather than
  // surfacing a status the caller could use to tell delivery apart from a
  // nonexistent address.
  try {
    await getMailer().send({
      to: input.email,
      subject: "Reset your Digital Wardrobe password",
      text: `Reset your password: ${resetLink(token)}\n\nThis link expires in 1 hour.`,
    });
  } catch {
    // Swallowed intentionally — see comment above.
  }
}

export type ConfirmPasswordResetError = "invalid" | "weak_password";

/**
 * Confirms a password reset: validates the token, sets the new password,
 * and revokes every existing session for the account (a changed password
 * must invalidate whatever access an attacker had under the old one).
 *
 * An unknown token, an expired token, an already-used token, and a
 * `'verify'`-purpose token presented here are all rejected with the exact
 * same `'invalid'` — deliberately indistinguishable, the same discipline
 * `consumeVerificationToken` uses for its own four cases. The "is this
 * token still usable" check and "mark it used" happen in one conditional
 * `UPDATE ... WHERE usedAt IS NULL ...`, not a read followed by a write,
 * so two concurrent attempts to consume the same token cannot both
 * succeed.
 */
export async function confirmPasswordReset(input: {
  token: string;
  newPassword: string;
}): Promise<Result<{ userId: string }, ConfirmPasswordResetError>> {
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return err("weak_password");
  }

  // Hashed before opening the transaction below — argon2 hashing is
  // deliberately slow, and that cost has no business being paid while a
  // Postgres row lock is held.
  const passwordHash = await hashPassword(input.newPassword);
  const id = hashToken(input.token);

  const userId = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailTokens.id, id),
          eq(emailTokens.purpose, "reset"),
          isNull(emailTokens.usedAt),
          gt(emailTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: emailTokens.userId });

    if (!row) {
      return null;
    }

    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, row.userId));

    return row.userId;
  });

  if (!userId) {
    return err("invalid");
  }

  await revokeAllSessions(userId);

  return ok({ userId });
}

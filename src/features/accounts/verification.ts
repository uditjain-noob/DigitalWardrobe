import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db";
import { emailTokens, users } from "../../db/schema";
import { env } from "../../env";
import type { SessionUser } from "../../lib/auth/session";
import { getMailer } from "../../lib/email";
import { consumeRateLimit } from "../../lib/limits/rate-limit";
import { err, ok, type Result } from "../../shared/result";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours.
const RESEND_RATE_LIMIT = 3;
const RESEND_RATE_WINDOW_SECONDS = 60 * 60; // 1 hour — NFR-4.8.

/** SHA-256 of the raw token, hex-encoded — same scheme as session tokens. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a new email-verification token for `userId` and returns the raw
 * token (to be put in the verification link). Only its SHA-256 hash is
 * persisted — a database leak must not hand out a usable token.
 */
export async function issueVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  await db.insert(emailTokens).values({
    id: hashToken(token),
    userId,
    purpose: "verify",
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  return token;
}

/**
 * Consumes a verification token: marks it used and marks the owning user's
 * email verified, atomically — both statements run inside one
 * `db.transaction`, so a crash or dropped connection between them cannot
 * leave the token spent while the user stays unverified (which would
 * permanently strand the account: the token is single-use, and signup
 * would still refuse a retry with `email_taken`). An unknown token, an
 * expired token, an already-used token, and a token issued for a different
 * purpose (e.g. `'reset'`) are all rejected with the exact same `'invalid'`
 * — deliberately indistinguishable, so a caller (and an attacker probing
 * responses) can never learn which case occurred.
 *
 * The "mark used" and "is it still usable" check happen in one conditional
 * `UPDATE ... WHERE usedAt IS NULL ...`, not a read followed by a write, so
 * two concurrent attempts to consume the same token cannot both succeed.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<Result<{ userId: string }, "invalid">> {
  const id = hashToken(token);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailTokens.id, id),
          eq(emailTokens.purpose, "verify"),
          isNull(emailTokens.usedAt),
          gt(emailTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: emailTokens.userId });

    if (!row) {
      return err("invalid");
    }

    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, row.userId));

    return ok({ userId: row.userId });
  });
}

function verificationLink(token: string): string {
  return `${env.APP_URL}/api/auth/verify?token=${token}`;
}

export type ResendVerificationEmailError = "unauthorized" | "rate_limited";

/**
 * Re-sends the signup verification email (the plan-gap this task fills:
 * Task 6 built open signup with a verification email but no way to ask
 * for another, which permanently strands any account whose first email
 * failed to arrive — signing up again just returns `email_taken`).
 *
 * Takes the already-resolved session user (or `null` if signed out)
 * rather than an email address. That removes any enumeration concern by
 * construction — there is no address input to probe — and is also how
 * `userId` ends up coming only from the validated session, never from a
 * client-supplied identifier: the caller (the route) must resolve
 * `getCurrentUser()` itself and hand the result straight in, and `null`
 * (signed out) is a value this function can reject on its own rather than
 * something the route has to special-case before calling in.
 *
 * An already-verified account succeeds as a no-op — it does not error,
 * and does not send anything, so a caller cannot use this to learn
 * whether an account it doesn't otherwise have information about is
 * verified. That check runs before the rate limit is touched, so a no-op
 * resend never spends part of the 3-per-hour budget a genuinely unverified
 * account might still need.
 */
export async function resendVerificationEmail(
  user: SessionUser | null,
): Promise<Result<{ emailDelivered: boolean }, ResendVerificationEmailError>> {
  if (!user) {
    return err("unauthorized");
  }

  if (user.emailVerifiedAt) {
    return ok({ emailDelivered: true });
  }

  const { allowed } = await consumeRateLimit(
    `verify-resend:${user.id}`,
    RESEND_RATE_LIMIT,
    RESEND_RATE_WINDOW_SECONDS,
  );
  if (!allowed) {
    return err("rate_limited");
  }

  const token = await issueVerificationToken(user.id);

  // Best-effort, same precedent as `registerAccount`: the mailer's
  // internal error string (NFR-5.8) must never reach a caller, and a
  // provider outage must not fail this request — `emailDelivered` signals
  // non-delivery out of band, on the success value, rather than through
  // the error union.
  let emailDelivered = true;
  try {
    await getMailer().send({
      to: user.email,
      subject: "Verify your Digital Wardrobe email",
      text: `Confirm your email address: ${verificationLink(token)}\n\nThis link expires in 24 hours.`,
    });
  } catch {
    emailDelivered = false;
  }

  return ok({ emailDelivered });
}

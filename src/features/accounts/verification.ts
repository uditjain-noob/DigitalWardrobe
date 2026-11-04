import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../db";
import { emailTokens, users } from "../../db/schema";
import { err, ok, type Result } from "../../shared/result";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours.

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

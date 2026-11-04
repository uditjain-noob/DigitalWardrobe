import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../src/db";
import { emailTokens, users } from "../../../src/db/schema";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../../../src/features/accounts/password-reset";
import { signIn } from "../../../src/features/accounts/signin";
import { issueVerificationToken } from "../../../src/features/accounts/verification";
import { hashPassword } from "../../../src/lib/auth/password";
import { createSession, validateSessionToken } from "../../../src/lib/auth/session";
import { getMailer, MemoryMailer } from "../../../src/lib/email";
import { resetTestDb } from "../../helpers/db";

// `getMailer()` returns a single shared `MemoryMailer` under
// `NODE_ENV=test` (see src/lib/email/index.ts), so this is the exact
// instance `requestPasswordReset` sends through internally.
const mailer = getMailer() as MemoryMailer;

async function createTestUser(
  email: string,
  password = "a-good-long-password",
): Promise<{ userId: string; email: string; password: string }> {
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash, emailVerifiedAt: new Date() })
    .returning({ id: users.id });
  return { userId: row.id, email, password };
}

/** Pulls the raw reset token out of the link in the mailer's captured text. */
function extractToken(text: string): string {
  const match = text.match(/token=([^\s]+)/);
  if (!match) {
    throw new Error("no token found in email text");
  }
  return match[1];
}

describe("password reset", () => {
  beforeEach(async () => {
    await resetTestDb();
    mailer.clear();
  });

  it("emails a reset link for a known address", async () => {
    const { email } = await createTestUser("known@example.com");

    await requestPasswordReset({ email, ip: "1.1.1.1" });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(email);
  });

  it("sends nothing but still resolves for an unknown address", async () => {
    await expect(
      requestPasswordReset({ email: "nobody@example.com", ip: "2.2.2.2" }),
    ).resolves.toBeUndefined();

    expect(mailer.sent).toHaveLength(0);
  });

  it("sets the new password and lets the user sign in with it", async () => {
    const { email } = await createTestUser("setpass@example.com");
    await requestPasswordReset({ email, ip: "3.3.3.3" });
    const token = extractToken(mailer.sent[0].text);

    const r = await confirmPasswordReset({
      token,
      newPassword: "a-brand-new-password",
    });

    expect(r.ok).toBe(true);
    const signedIn = await signIn({
      email,
      password: "a-brand-new-password",
      ip: "3.3.3.3",
    });
    expect(signedIn.ok).toBe(true);
  });

  it("revokes all existing sessions on reset", async () => {
    const { userId, email } = await createTestUser("revoke@example.com");
    const { token: oldToken } = await createSession(userId);
    await requestPasswordReset({ email, ip: "4.4.4.4" });
    const resetToken = extractToken(mailer.sent[0].text);

    const r = await confirmPasswordReset({
      token: resetToken,
      newPassword: "another-new-password",
    });

    expect(r.ok).toBe(true);
    expect(await validateSessionToken(oldToken)).toBeNull();
  });

  // Review Focus 4 — all four of these must be indistinguishable.
  it("refuses an unknown, expired, used, or 'verify'-purpose token with the same error", async () => {
    const unknown = await confirmPasswordReset({
      token: "not-a-real-token",
      newPassword: "a-good-long-password",
    });
    expect(!unknown.ok && unknown.error).toBe("invalid");

    const { userId: expiredUserId, email: expiredEmail } =
      await createTestUser("expired@example.com");
    await requestPasswordReset({ email: expiredEmail, ip: "5.5.5.5" });
    const expiredToken = extractToken(
      mailer.sent[mailer.sent.length - 1].text,
    );
    await db
      .update(emailTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(emailTokens.userId, expiredUserId));
    const expired = await confirmPasswordReset({
      token: expiredToken,
      newPassword: "a-good-long-password",
    });
    expect(!expired.ok && expired.error).toBe("invalid");

    const { email: usedEmail } = await createTestUser("used@example.com");
    await requestPasswordReset({ email: usedEmail, ip: "6.6.6.6" });
    const usedToken = extractToken(mailer.sent[mailer.sent.length - 1].text);
    const first = await confirmPasswordReset({
      token: usedToken,
      newPassword: "a-good-long-password",
    });
    expect(first.ok).toBe(true);
    const used = await confirmPasswordReset({
      token: usedToken,
      newPassword: "yet-another-password",
    });
    expect(!used.ok && used.error).toBe("invalid");

    const { userId: verifyUserId } = await createTestUser(
      "verifypurpose@example.com",
    );
    const verifyToken = await issueVerificationToken(verifyUserId);
    const wrongPurpose = await confirmPasswordReset({
      token: verifyToken,
      newPassword: "a-good-long-password",
    });
    expect(!wrongPurpose.ok && wrongPurpose.error).toBe("invalid");
  });

  it("refuses a new password under 12 characters", async () => {
    const { email } = await createTestUser("weak@example.com");
    await requestPasswordReset({ email, ip: "7.7.7.7" });
    const token = extractToken(mailer.sent[0].text);

    const r = await confirmPasswordReset({ token, newPassword: "short1" });

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("weak_password");
  });
});

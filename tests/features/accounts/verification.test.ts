import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../src/db";
import { emailTokens, users } from "../../../src/db/schema";
import {
  consumeVerificationToken,
  issueVerificationToken,
} from "../../../src/features/accounts/verification";
import { resetTestDb } from "../../helpers/db";

async function createTestUser(
  email = "verify-user@example.com",
): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash: "hash" })
    .returning();
  return row.id;
}

describe("verification", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("marks the account verified and consumes the token", async () => {
    const userId = await createTestUser();
    const token = await issueVerificationToken(userId);

    const r = await consumeVerificationToken(token);

    expect(r.ok).toBe(true);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  // Review Focus 4 — all four of these must be indistinguishable.
  it("refuses an unknown token", async () => {
    const r = await consumeVerificationToken("not-a-real-token");

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid");
  });

  it("refuses an expired token", async () => {
    const userId = await createTestUser();
    const token = await issueVerificationToken(userId);
    await db
      .update(emailTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(emailTokens.userId, userId));

    const r = await consumeVerificationToken(token);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid");
  });

  it("refuses an already-used token", async () => {
    const userId = await createTestUser();
    const token = await issueVerificationToken(userId);
    const first = await consumeVerificationToken(token);
    expect(first.ok).toBe(true);

    const r = await consumeVerificationToken(token);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid");
  });

  it("refuses a 'reset'-purpose token presented to verification", async () => {
    const userId = await createTestUser();
    // issueVerificationToken only ever creates 'verify'-purpose rows, so to
    // exercise a 'reset' token we issue one normally and flip its purpose
    // in place before presenting it to consumeVerificationToken.
    const resetToken = await issueVerificationToken(userId);
    await db
      .update(emailTokens)
      .set({ purpose: "reset" })
      .where(eq(emailTokens.userId, userId));

    const r = await consumeVerificationToken(resetToken);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid");
  });
});

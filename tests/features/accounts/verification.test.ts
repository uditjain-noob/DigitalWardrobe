import { eq } from "drizzle-orm";
import { PgDatabase, type PgTable } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("rolls back token consumption if marking the user verified fails mid-transaction", async () => {
    const userId = await createTestUser();
    const token = await issueVerificationToken(userId);

    // `update` is defined once, on `PgDatabase.prototype`, and inherited by
    // both the plain `db` and the `tx` that `db.transaction` hands to the
    // callback — so this spy intercepts the second (`users`) update inside
    // `consumeVerificationToken`'s transaction without touching the first
    // (`emailTokens`) one, simulating a crash between the two statements
    // without changing any production code.
    const originalUpdate = PgDatabase.prototype.update;
    const updateSpy = vi
      .spyOn(PgDatabase.prototype, "update")
      .mockImplementation(function (
        this: PgDatabase<never, never, never>,
        table: PgTable,
      ) {
        if ((table as unknown) === users) {
          throw new Error("simulated failure marking user verified");
        }
        return originalUpdate.call(this, table);
      });

    await expect(consumeVerificationToken(token)).rejects.toThrow(
      "simulated failure marking user verified",
    );
    updateSpy.mockRestore();

    // Neither statement took effect: the transaction rolled back the token
    // update too, so the token remains unused and retryable rather than
    // permanently stranding the account.
    const [tokenRow] = await db
      .select()
      .from(emailTokens)
      .where(eq(emailTokens.userId, userId));
    expect(tokenRow.usedAt).toBeNull();

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user.emailVerifiedAt).toBeNull();

    // And now that nothing is stranded, the same token still works.
    const retry = await consumeVerificationToken(token);
    expect(retry.ok).toBe(true);
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

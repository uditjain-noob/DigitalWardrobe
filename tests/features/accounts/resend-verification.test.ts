import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../src/db";
import { users } from "../../../src/db/schema";
import { resendVerificationEmail } from "../../../src/features/accounts/verification";
import { getMailer, MemoryMailer } from "../../../src/lib/email";
import { resetTestDb } from "../../helpers/db";

// `getMailer()` returns a single shared `MemoryMailer` under
// `NODE_ENV=test` (see src/lib/email/index.ts), so this is the exact
// instance `resendVerificationEmail` sends through internally.
const mailer = getMailer() as MemoryMailer;

async function createTestUser(
  email: string,
  verified: boolean,
): Promise<{ id: string; email: string; emailVerifiedAt: Date | null }> {
  const [row] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "hash",
      emailVerifiedAt: verified ? new Date() : null,
    })
    .returning({ id: users.id, emailVerifiedAt: users.emailVerifiedAt });
  return { id: row.id, email, emailVerifiedAt: row.emailVerifiedAt };
}

describe("resendVerificationEmail", () => {
  beforeEach(async () => {
    await resetTestDb();
    mailer.clear();
  });

  it("sends another verification email for a signed-in, unverified user", async () => {
    const user = await createTestUser("pending@example.com", false);

    const r = await resendVerificationEmail(user);

    expect(r.ok).toBe(true);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe("pending@example.com");
  });

  it("rate limits repeated resend requests for one user", async () => {
    const user = await createTestUser("spammed@example.com", false);

    let last;
    for (let i = 0; i < 4; i++) {
      last = await resendVerificationEmail(user);
    }

    expect(last!.ok).toBe(false);
    expect(!last!.ok && last!.error).toBe("rate_limited");
  });

  it("is a no-op for an already-verified user", async () => {
    const user = await createTestUser("already-verified@example.com", true);

    const r = await resendVerificationEmail(user);

    expect(r.ok).toBe(true);
    expect(mailer.sent).toHaveLength(0);
  });

  // Review Important 2 — the route must forward this signal (it was
  // previously discarded, always responding `{ ok: true }` even when the
  // resend itself failed to send). Same shape as the equivalent
  // `registerAccount` test at tests/features/accounts/register.test.ts:165.
  it("signals a failed resend out of band, without leaking why", async () => {
    const user = await createTestUser("resend-mailfail@example.com", false);
    const sendSpy = vi
      .spyOn(mailer, "send")
      .mockRejectedValueOnce(new Error("Failed to send email to b.com (status 500)"));

    const r = await resendVerificationEmail(user);

    sendSpy.mockRestore();

    expect(r.ok).toBe(true);
    expect(r.ok && r.value.emailDelivered).toBe(false);
    expect(JSON.stringify(r)).not.toContain("status 500");
  });

  // The route maps this to an HTTP 401 — see
  // src/app/api/auth/verify/resend/route.ts. `resendVerificationEmail`
  // never sees a client-supplied identifier, only whatever the route
  // resolved from the session (or `null` if there wasn't one), so this is
  // the signed-out case.
  it("refuses when signed out", async () => {
    const r = await resendVerificationEmail(null);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("unauthorized");
    expect(mailer.sent).toHaveLength(0);
  });
});

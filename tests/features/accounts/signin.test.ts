import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../src/db";
import { users } from "../../../src/db/schema";
import { signIn } from "../../../src/features/accounts/signin";
import { hashPassword } from "../../../src/lib/auth/password";
import { resetTestDb } from "../../helpers/db";

async function createTestUser(options: {
  email: string;
  password?: string;
  verified?: boolean;
}): Promise<{ userId: string; email: string; password: string }> {
  const password = options.password ?? "a-good-long-password";
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({
      email: options.email,
      passwordHash,
      emailVerifiedAt: options.verified === false ? null : new Date(),
    })
    .returning({ id: users.id });
  return { userId: row.id, email: options.email, password };
}

describe("signIn", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("signs in with the right password", async () => {
    const { email, password } = await createTestUser({
      email: "right@example.com",
    });

    const r = await signIn({ email, password, ip: "1.1.1.1" });

    expect(r.ok).toBe(true);
  });

  it("refuses the wrong password", async () => {
    const { email } = await createTestUser({ email: "wrong@example.com" });

    const r = await signIn({
      email,
      password: "a-totally-different-password",
      ip: "2.2.2.2",
    });

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid_credentials");
  });

  it("refuses an unknown email with the same error as a wrong password", async () => {
    const r = await signIn({
      email: "nobody@example.com",
      password: "whatever-password",
      ip: "3.3.3.3",
    });

    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toBe("invalid_credentials");
  });

  // FR-1.2: browsing allowed before verifying.
  it("signs in an unverified account", async () => {
    const { email, password } = await createTestUser({
      email: "unverified@example.com",
      verified: false,
    });

    const r = await signIn({ email, password, ip: "4.4.4.4" });

    expect(r.ok).toBe(true);
  });

  it("rate limits repeated failures for one email", async () => {
    const { email } = await createTestUser({ email: "limited@example.com" });

    let last;
    for (let i = 0; i < 11; i++) {
      last = await signIn({
        email,
        password: "wrong-every-time",
        ip: "5.5.5.5",
      });
    }

    expect(last!.ok).toBe(false);
    expect(!last!.ok && last!.error).toBe("rate_limited");
  });
});

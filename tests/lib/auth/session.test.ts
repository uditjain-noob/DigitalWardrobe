import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../src/db";
import { sessions, users } from "../../../src/db/schema";
import {
  createSession,
  revokeAllSessions,
  revokeSession,
  validateSessionToken,
} from "../../../src/lib/auth/session";
import { resetTestDb } from "../../helpers/db";

async function createTestUser(
  email = "session-user@example.com",
): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash: "hash" })
    .returning();
  return row.id;
}

describe("session", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("validates a freshly created session", async () => {
    const userId = await createTestUser();
    const { token } = await createSession(userId);

    const user = await validateSessionToken(token);

    expect(user).not.toBeNull();
    expect(user!.id).toBe(userId);
    expect(user!.email).toBe("session-user@example.com");
  });

  it("stores the token hashed, not raw", async () => {
    const userId = await createTestUser();
    const { token } = await createSession(userId);

    const rows = await db.select().from(sessions);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(token);
  });

  it("rejects an unknown token", async () => {
    expect(await validateSessionToken("nope")).toBeNull();
  });

  it("rejects an expired session", async () => {
    const userId = await createTestUser();
    const { token } = await createSession(userId);

    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.userId, userId));

    expect(await validateSessionToken(token)).toBeNull();
  });

  it("rejects a token after revokeSession", async () => {
    const userId = await createTestUser();
    const { token } = await createSession(userId);

    await revokeSession(token);

    expect(await validateSessionToken(token)).toBeNull();
  });

  it("revokeAllSessions invalidates every token for that user", async () => {
    const userId = await createTestUser();
    const { token: tokenA } = await createSession(userId);
    const { token: tokenB } = await createSession(userId);

    await revokeAllSessions(userId);

    expect(await validateSessionToken(tokenA)).toBeNull();
    expect(await validateSessionToken(tokenB)).toBeNull();
  });
});

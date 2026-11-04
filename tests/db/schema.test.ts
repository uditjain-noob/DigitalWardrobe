import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../src/db";
import { users } from "../../src/db/schema";
import { resetTestDb } from "../helpers/db";

describe("users table", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("inserts a user and fills in id/createdAt defaults", async () => {
    const [row] = await db
      .insert(users)
      .values({ email: "person@example.com", passwordHash: "hash" })
      .returning();

    expect(row.id).toBeTruthy();
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.emailVerifiedAt).toBeNull();
    expect(row.deletedAt).toBeNull();
  });

  it("rejects a second user whose email differs only by case — enforced by the database, not application code", async () => {
    await db
      .insert(users)
      .values({ email: "same@example.com", passwordHash: "hash" });

    await expect(
      db.insert(users).values({ email: "SAME@EXAMPLE.com", passwordHash: "hash" }),
    ).rejects.toThrow();
  });
});

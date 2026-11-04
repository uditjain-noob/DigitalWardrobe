import { sql } from "drizzle-orm";
import { expect, it } from "vitest";

import { db } from "../../src/db";
import { parseEnv } from "../../src/env";

it("connects to the test database and runs migrations", async () => {
  const rows = await db.execute(sql`select 1 as ok`);
  expect(rows.rows[0].ok).toBe(1);
});

it("rejects a missing required env var", () => {
  expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
});

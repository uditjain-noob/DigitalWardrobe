import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

import { db } from "../../src/db";
import * as schema from "../../src/db/schema";

/**
 * Truncates every table defined in `src/db/schema.ts`, for test isolation
 * between specs. Discovers tables generically off the schema module so it
 * needs no changes as later tasks add tables — currently a no-op, since
 * the schema is empty until Task 2.
 */
export async function resetTestDb(): Promise<void> {
  const tableNames = Object.values(schema)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableName(table));

  if (tableNames.length === 0) {
    return;
  }

  const identifiers = tableNames.map((name) => sql.identifier(name));
  await db.execute(
    sql`truncate table ${sql.join(identifiers, sql`, `)} restart identity cascade`,
  );
}

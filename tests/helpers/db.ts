import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

import { db } from "../../src/db";
import * as schema from "../../src/db/schema";

/**
 * Truncates every table defined in `src/db/schema.ts`, for test isolation
 * between specs. Discovers tables generically off the schema module so it
 * needs no changes as later tasks add tables.
 */
export async function resetTestDb(): Promise<void> {
  // Cast to `unknown[]` rather than using a `value is PgTable` type predicate:
  // once the schema module exports a concrete table (e.g. `users`), its
  // inferred element type is that table's specific `PgTableWithColumns<...>`
  // type, which the generic `PgTable` predicate type is not assignable to —
  // a predicate must narrow to a subtype of the parameter type, not a
  // sibling of it.
  const tableNames = (Object.values(schema) as unknown[])
    .filter((value) => is(value, PgTable))
    .map((table) => getTableName(table as PgTable));

  if (tableNames.length === 0) {
    return;
  }

  const identifiers = tableNames.map((name) => sql.identifier(name));
  await db.execute(
    sql`truncate table ${sql.join(identifiers, sql`, `)} restart identity cascade`,
  );
}

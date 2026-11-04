// Drizzle table definitions.
import { customType, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Postgres `citext` — a case-insensitive text type. Used for `email` so a
 * unique constraint on the column rejects case-only collisions ("a@b.com"
 * vs "A@b.com") at the database level, not just in application code.
 * `drizzle-kit generate` cannot emit `CREATE EXTENSION`, so the migration
 * that creates the `users` table enables the extension explicitly before
 * using this type.
 */
const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

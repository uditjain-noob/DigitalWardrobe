// Drizzle table definitions.
import {
  customType,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

/**
 * `id` is the SHA-256 hash (hex) of the session token, not the token itself
 * — so a database leak (backup, replica, SQL injection) does not hand out
 * usable session tokens. The raw token only ever exists in the cookie and
 * in memory between `createSession` and `setSessionCookie`.
 */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Fixed-window rate-limit counters (NFR-4.8). `key` identifies the action
 * plus the thing being limited (e.g. `signin:a@b.com`, `signup:1.2.3.4`);
 * `windowStart` is the start of the fixed window the count applies to. The
 * composite primary key is what makes the increment in
 * `src/lib/limits/rate-limit.ts` atomic: a single
 * `insert ... on conflict (key, window_start) do update set count = count + 1`
 * can only ever race with itself, not read-then-write in application code.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);

/**
 * Single-use tokens emailed to a user to prove control of their address —
 * for signup verification (`purpose: 'verify'`) and, from a later task,
 * password reset (`purpose: 'reset'`). `id` is the SHA-256 hash (hex) of the
 * raw token, for the same reason as `sessions.id`: a database leak must not
 * hand out usable tokens. `usedAt` being non-null (or `expiresAt` being in
 * the past, or `purpose` not matching what the caller expected) all make a
 * token equally unusable — callers must treat every rejection identically.
 */
export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["verify", "reset"] }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

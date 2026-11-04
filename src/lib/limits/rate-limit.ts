import { sql } from "drizzle-orm";

import { db } from "../../db";
import { rateLimits } from "../../db/schema";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * Fixed-window rate limiter (NFR-4.8), required on signup, sign-in,
 * password reset, verification sends, and upload.
 *
 * `key` identifies the action plus the thing being limited (e.g.
 * `signin:a@b.com`, `signup:1.2.3.4`) — independent keys never interfere.
 * The window is `windowSeconds` wide and aligned to epoch time, so every
 * caller sharing a key agrees on the same window boundaries without
 * needing to coordinate a start time.
 *
 * The increment is one atomic statement: an upsert keyed on
 * `(key, windowStart)` that increments `count` on conflict and returns the
 * post-increment value in the same round trip. Postgres serializes
 * concurrent upserts to the same row, so the returned count is always the
 * true count at the instant this call's row lock was granted — there is no
 * read-then-write gap in JavaScript for concurrent callers to race through.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const allowed = row.count <= limit;
  const retryAfterSeconds = allowed
    ? 0
    : Math.ceil((windowStart.getTime() + windowMs - now) / 1000);

  return { allowed, retryAfterSeconds };
}

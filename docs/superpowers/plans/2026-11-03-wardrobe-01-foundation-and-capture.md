# Wardrobe Plan 1 of 4: Foundation, Accounts, and Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed web app where a person signs up, verifies their email, photographs clothes from their phone, and sees them as a fast, scannable grid.

**Architecture:** One Next.js App Router repo in TypeScript, plus a second entry point that runs the same code as a background worker. Routes under `src/app/` are thin HTTP adapters; all behaviour lives in `src/features/*` (domain use cases, tested directly) and `src/lib/*` (infrastructure adapters behind interfaces: object storage, mail, image processing, job queue). Upload is split in two — the request stores the original and creates the item (NFR-2.3), and a pg-boss job renders the display and thumbnail versions afterwards. Photos are served from a stable per-version app URL that checks ownership and redirects to a short-lived signed storage URL (NFR-3.6), which is what keeps a later offline cache possible (NFR-1.4).

**Tech Stack:** TypeScript (strict), Next.js 15 (App Router), React 19, Postgres 16, Drizzle ORM + drizzle-kit, pg-boss (Postgres-backed job queue — no Redis), sharp + heic-convert, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (S3-compatible; MinIO locally), `@node-rs/argon2`, zod, Resend (mail), Vitest, Docker Compose for Postgres + MinIO in dev and test.

**Spec:** [docs/superpowers/specs/2026-11-03-digital-wardrobe-design.md](../specs/2026-11-03-digital-wardrobe-design.md)
**UI design:** [docs/superpowers/specs/2026-11-04-wardrobe-ui-design.md](../specs/2026-11-04-wardrobe-ui-design.md) — the palettes, type roles, geometry and every screen this plan builds. Task 14 lands the token system; every UI task after it draws from there.

**Scope:** Spec sections 6.1, 6.2, 6.12, and the parts of section 7 those need. Deliberately **not** here: tag types and tags (6.5), filtering and search (6.7), item editing/archiving (6.8), provider credentials (6.3), normalisation (6.4), autofill (6.6), outfits (6.9–6.11). Those are plans 2–4.

Three spec requirements are intentionally served at reduced fidelity, each noted at the task that owns it:
- **FR-2.5** derived item names need Category and Colour tags. Plan 1 shows a date-based placeholder; plan 2 replaces the derivation.
- **NFR-8.3** alternative text derived from "name and tags". Plan 1 derives from the name alone.
- **FR-2.4** an item may hold more than one photo. The schema supports it from Task 10 (`photos.itemId`, `items.primaryPhotoId`), but adding a second photo to an existing item is an editing action, and editing lands in plan 2. Plan 1 creates exactly one photo per item.

## Global Constraints

Values copied verbatim from the spec. Every task's requirements implicitly include this section.

- **NFR-1.1** "A mobile-first responsive web app, served over HTTPS, usable on a phone browser with no install step."
- **NFR-1.2** Supported targets: "current and previous major versions of Safari on iOS, Chrome on Android, and Chrome, Safari, Firefox, and Edge on desktop."
- **NFR-1.4** "The client reads wardrobe data through an HTTP API returning data, not only as server-rendered HTML." And: "Item photos are served from **stable, cacheable per-item URLs** (NFR-3.6), not from URLs that change per request." No service worker, cache, or sync is built in this plan.
- **NFR-1.5** Work runs outside the request cycle in a worker. "No GPU, no model weights, and no unusual memory are required."
- **NFR-2.3** "From choosing a photo to the item existing in the wardrobe: under 5 seconds." Only what is needed to show the item happens inline.
- **NFR-3.2** Stored "at a resolution good enough to view full-screen", not full original camera resolution.
- **NFR-3.4** Accepted formats: "JPEG, PNG, HEIC/HEIF, and WebP, up to 15 MB per photo." HEIC is converted to a web-displayable format on upload.
- **NFR-3.5** "Image orientation metadata is honoured, so photos are never shown rotated."
- **NFR-3.6** One stable application URL per photo version; ownership checked on every request; satisfied by redirecting to a short-lived signed storage URL; bytes do not proxy through the application.
- **NFR-4.1** HTTPS only. **NFR-4.2** Passwords stored only as salted hashes using a current password-hashing algorithm — argon2id here — never logged in recoverable form.
- **NFR-4.3** Every read and write authorised against the signed-in user; no cross-account access by manipulating an identifier.
- **NFR-4.7** Logs contain no photos, no personal content, and no secrets.
- **NFR-4.8** Rate limiting on signup, sign-in, password reset, email verification sends, and upload. CSRF protection. Output escaping.
- **NFR-4.9** Uploads validated as actual images "by inspecting content, not by trusting a filename or a declared type".
- **NFR-5.2** "An interrupted upload leaves no half-created item and no orphaned photo."
- **NFR-5.8** Errors surfaced in plain language, saying what failed and what the user can do, never as a raw technical error.
- **NFR-7.3** Per-account caps on item count and total stored bytes. "Caps are configurable without a code change, and the author's own account can be exempted." Existing content is never deleted or degraded on reaching a cap.
- **NFR-7.5** Email verification gates uploading.
- **NFR-8.1** WCAG 2.1 AA contrast. **NFR-8.2** Tap targets at least 44x44 points. **NFR-8.5** Honours the device's light and dark appearance setting.
- **FR-2.3** Bulk capture: up to 100 photos in one session, per-photo progress, automatic retry of failures, resumable after leaving.

## Review Focus

Input classes the spec implies that no obvious happy-path test would exercise. Each has a test assigned to the task that owns the code.

1. **A real HEIC from an iPhone, rotated, near the 15 MB limit.** The commonest upload there is, and the one most likely to arrive sideways or be rejected outright. Expected: stored upright, converted, under the size limit. → Task 9.
2. **A file that is not the image it claims to be,** and an image that is truncated or corrupt partway through. Expected: rejected on content inspection with a plain-language reason, never a stack trace, never a half-written object. → Task 9, Task 10.
3. **An upload that crosses the storage-bytes cap mid-bulk-session.** Expected: the photos before it are kept, that one is refused naming the specific limit, and nothing already stored is degraded. → Task 13.
4. **A verification or reset token that is expired, already used, or belongs to a different account.** Expected: all four refused identically, with no hint about whether the email exists. → Task 6, Task 7.
5. **A session cookie presented after sign-out, and a photo URL requested by a signed-in user who does not own it.** Expected: rejected, and the photo case must not reveal whether that photo id exists. → Task 3, Task 12.

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `drizzle.config.ts`, `docker-compose.yml`, `.env.example`, `src/env.ts`, `src/db/index.ts`, `src/db/schema.ts`
- Create: `scripts/test-db.sh`
- Test: `tests/setup/db.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `db` (Drizzle client) from `src/db/index.ts`; `env` (zod-validated config object) from `src/env.ts` with keys `DATABASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, `APP_URL`, `SESSION_COOKIE_NAME`, `MAX_ITEMS_PER_ACCOUNT`, `MAX_STORAGE_BYTES_PER_ACCOUNT`, `CAP_EXEMPT_EMAILS`; `resetTestDb()` from `tests/helpers/db.ts`.

- [ ] **Step 1: Scaffold the project**

Next.js 15 App Router with TypeScript strict mode, React 19, Tailwind for styling. Add Drizzle, pg-boss, sharp, heic-convert, zod, `@node-rs/argon2`, the two AWS SDK packages, Vitest. `docker-compose.yml` defines Postgres 16 on 5432 and MinIO on 9000 with a `wardrobe` bucket.

- [ ] **Step 2: Write the failing test**

```ts
// tests/setup/db.test.ts
it("connects to the test database and runs migrations", async () => {
  const rows = await db.execute(sql`select 1 as ok`);
  expect(rows.rows[0].ok).toBe(1);
});

it("rejects a missing required env var", () => {
  expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/setup/db.test.ts`
Expected: FAIL — cannot find module `src/db` / `src/env`.

- [ ] **Step 4: Implement `parseEnv(raw: Record<string, string | undefined>): Env` in `src/env.ts` and the Drizzle client in `src/db/index.ts`**

`parseEnv` is a zod object schema; `MAX_ITEMS_PER_ACCOUNT` and `MAX_STORAGE_BYTES_PER_ACCOUNT` coerce to number, `CAP_EXEMPT_EMAILS` is a comma-separated list coerced to `string[]`. These are env-driven so caps are configurable without a code change (NFR-7.3). `src/db/schema.ts` starts empty but exported.

- [ ] **Step 5: Add `scripts/test-db.sh` and wire `npm test`**

The script starts the compose services if down, creates the test database, and runs `drizzle-kit migrate` against it. `npm test` runs it, then `vitest run`.

- [ ] **Step 6: Run and verify it passes**

Run: `npm test`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js app, postgres, and vitest harness"
```

---

### Task 2: Users table and password hashing

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/auth/password.ts`, `src/db/migrations/0001_users.sql`
- Test: `tests/lib/auth/password.test.ts`

**Interfaces:**
- Consumes: `db`, `env`.
- Produces: `hashPassword(plain: string): Promise<string>`; `verifyPassword(hash: string, plain: string): Promise<boolean>`; `users` table with columns `id` (uuid pk), `email` (citext unique), `passwordHash` (text), `emailVerifiedAt` (timestamptz null), `createdAt`, `deletedAt` (timestamptz null).

- [ ] **Step 1: Write the failing test**

```ts
it("produces a hash that is not the password", async () => { ... expect(hash).not.toContain("correct horse"); });
it("verifies the right password", async () => { expect(await verifyPassword(hash, "correct horse")).toBe(true); });
it("rejects the wrong password", async () => { expect(await verifyPassword(hash, "wrong horse")).toBe(false); });
it("salts: two hashes of the same password differ", async () => { expect(a).not.toBe(b); });
it("returns false rather than throwing on a malformed hash", async () => { expect(await verifyPassword("not-a-hash", "x")).toBe(false); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/auth/password.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement both functions in `src/lib/auth/password.ts`**

Use `@node-rs/argon2` with argon2id. `verifyPassword` catches a parse error from a malformed stored hash and returns `false`.

- [ ] **Step 4: Add the `users` table to `src/db/schema.ts` and generate the migration**

Run `npx drizzle-kit generate`. Email is case-insensitive — enable the `citext` extension in the migration.

- [ ] **Step 5: Run tests and migration to verify both pass**

Run: `npm test -- tests/lib/auth/password.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: users table and argon2id password hashing"
```

---

### Task 3: Sessions and the session cookie

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/auth/session.ts`, `src/lib/auth/cookies.ts`
- Test: `tests/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `db`, `users`.
- Produces: `type SessionUser = { id: string; email: string; emailVerifiedAt: Date | null }`; `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>`; `validateSessionToken(token: string): Promise<SessionUser | null>`; `revokeSession(token: string): Promise<void>`; `revokeAllSessions(userId: string): Promise<void>`; and from `cookies.ts`: `setSessionCookie(token: string, expiresAt: Date): Promise<void>`, `clearSessionCookie(): Promise<void>`, `getCurrentUser(): Promise<SessionUser | null>`. `sessions` table: `id` (text pk, the SHA-256 of the token), `userId`, `expiresAt`, `createdAt`.

- [ ] **Step 1: Write the failing test**

```ts
it("validates a freshly created session", async () => { ... expect(user!.id).toBe(userId); });
it("stores the token hashed, not raw", async () => {
  const { token } = await createSession(userId);
  const rows = await db.select().from(sessions);
  expect(rows[0].id).not.toBe(token);
});
it("rejects an unknown token", async () => { expect(await validateSessionToken("nope")).toBeNull(); });
it("rejects an expired session", async () => { /* set expiresAt in the past */ expect(result).toBeNull(); });
// Review Focus 5
it("rejects a token after revokeSession", async () => {
  const { token } = await createSession(userId);
  await revokeSession(token);
  expect(await validateSessionToken(token)).toBeNull();
});
it("revokeAllSessions invalidates every token for that user", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/auth/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/auth/session.ts`**

Token is 32 random bytes, base64url. The DB primary key is its SHA-256, so a database leak does not yield usable session tokens. Sessions last 90 days (FR-12.3 — a phone session persists across visits).

- [ ] **Step 4: Implement `src/lib/auth/cookies.ts`**

Next's `cookies()` API. Cookie is `httpOnly`, `secure`, `sameSite: 'lax'`, path `/`, name from `env.SESSION_COOKIE_NAME`. `sameSite: 'lax'` plus Next Server Actions' built-in origin check is the CSRF protection (NFR-4.8).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/lib/auth/session.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: session creation, validation, revocation, and cookie handling"
```

---

### Task 4: Mailer interface and implementations

**Files:**
- Create: `src/lib/email/types.ts`, `src/lib/email/resend.ts`, `src/lib/email/memory.ts`, `src/lib/email/index.ts`
- Test: `tests/lib/email/memory.test.ts`

**Interfaces:**
- Consumes: `env`.
- Produces: `type OutboundEmail = { to: string; subject: string; text: string }`; `interface Mailer { send(message: OutboundEmail): Promise<void> }`; `MemoryMailer` with `sent: OutboundEmail[]` and `clear()`; `getMailer(): Mailer` from `index.ts`, returning `MemoryMailer` when `NODE_ENV === 'test'` and the Resend implementation otherwise.

- [ ] **Step 1: Write the failing test**

```ts
it("records what was sent", async () => { await mailer.send(msg); expect(mailer.sent).toEqual([msg]); });
it("clear() empties the record", async () => { ... expect(mailer.sent).toHaveLength(0); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/email/memory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement all four files**

The Resend implementation wraps its HTTP API. It must not log message bodies (NFR-4.7) — on failure it throws with the recipient domain only, never the address or body.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/email/memory.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mailer interface with resend and in-memory implementations"
```

---

### Task 5: Rate limiter

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/limits/rate-limit.ts`
- Test: `tests/lib/limits/rate-limit.test.ts`

**Interfaces:**
- Consumes: `db`.
- Produces: `consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfterSeconds: number }>`. `rateLimits` table: `key` (text), `windowStart` (timestamptz), `count` (integer), primary key `(key, windowStart)`.

- [ ] **Step 1: Write the failing test**

```ts
it("allows up to the limit", async () => { for (let i=0;i<3;i++) expect((await consumeRateLimit("k",3,60)).allowed).toBe(true); });
it("refuses past the limit and reports retryAfterSeconds", async () => {
  ... const r = await consumeRateLimit("k",3,60);
  expect(r.allowed).toBe(false);
  expect(r.retryAfterSeconds).toBeGreaterThan(0);
});
it("keys are independent", async () => { ... });
it("allows again in a new window", async () => { /* advance fake timers past the window */ });
it("is atomic under concurrency: 10 parallel calls with limit 3 allow exactly 3", async () => {
  const results = await Promise.all(Array.from({length:10}, () => consumeRateLimit("k",3,60)));
  expect(results.filter(r => r.allowed)).toHaveLength(3);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/limits/rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `consumeRateLimit` in `src/lib/limits/rate-limit.ts`**

Fixed window. A single `insert ... on conflict (key, windowStart) do update set count = rateLimits.count + 1 returning count` keeps the concurrency test honest — do the counting in Postgres, not in JS.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/limits/rate-limit.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: postgres-backed fixed-window rate limiter"
```

---

### Task 6: Signup and email verification

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/shared/result.ts`, `src/features/accounts/register.ts`, `src/features/accounts/verification.ts`, `src/app/api/auth/signup/route.ts`, `src/app/api/auth/verify/route.ts`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/verify/page.tsx`
- Test: `tests/features/accounts/register.test.ts`, `tests/features/accounts/verification.test.ts`

**Interfaces:**
- Consumes: `hashPassword`, `createSession`, `setSessionCookie`, `getMailer`, `consumeRateLimit`, `env`.
- Produces: `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` with helpers `ok(value)` and `err(error)`; `registerAccount(input: { email: string; password: string; ip: string }): Promise<Result<{ userId: string }, 'email_taken' | 'weak_password' | 'invalid_email' | 'rate_limited'>>`; `issueVerificationToken(userId: string): Promise<string>`; `consumeVerificationToken(token: string): Promise<Result<{ userId: string }, 'invalid'>>`. `emailTokens` table: `id` (text pk, SHA-256 of the token), `userId`, `purpose` (`'verify' | 'reset'`), `expiresAt`, `usedAt` (null), `createdAt`.

- [ ] **Step 1: Write the failing tests**

```ts
// register.test.ts
it("creates an unverified user and sends a verification email", async () => {
  const r = await registerAccount({ email: "a@b.com", password: "a-good-long-password", ip: "1.1.1.1" });
  expect(r.ok).toBe(true);
  expect(mailer.sent[0].to).toBe("a@b.com");
  expect(user.emailVerifiedAt).toBeNull();
});
it("refuses a duplicate email, case-insensitively", async () => { /* A@B.com after a@b.com */ expect(r.error).toBe("email_taken"); });
it("refuses a password under 12 characters", async () => { expect(r.error).toBe("weak_password"); });
it("refuses a malformed email", async () => { expect(r.error).toBe("invalid_email"); });
it("rate limits repeated signups from one ip", async () => { /* 6th attempt */ expect(r.error).toBe("rate_limited"); });
it("never stores the password in recoverable form", async () => { expect(user.passwordHash).not.toContain("a-good-long-password"); });

// verification.test.ts
it("marks the account verified and consumes the token", async () => { ... expect(user.emailVerifiedAt).not.toBeNull(); });
// Review Focus 4 — all four of these must be indistinguishable
it("refuses an unknown token", async () => { expect(r.error).toBe("invalid"); });
it("refuses an expired token", async () => { expect(r.error).toBe("invalid"); });
it("refuses an already-used token", async () => { expect(r.error).toBe("invalid"); });
it("refuses a 'reset'-purpose token presented to verification", async () => { expect(r.error).toBe("invalid"); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/features/accounts/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/shared/result.ts`, `register.ts`, and `verification.ts`**

Verification tokens: 32 random bytes, stored as SHA-256 like sessions, 24-hour expiry, single use. Every rejection path in `consumeVerificationToken` returns the same `'invalid'` — the four tests above exist to stop a future refactor from leaking which it was. Rate limit key is `signup:<ip>`, 5 per hour.

- [ ] **Step 4: Implement the two API routes and two pages**

Signup on success creates a session and sets the cookie, so the user lands signed in but unverified. The verify page consumes the token from its query string and shows a plain-language success or failure (NFR-5.8). Both pages are mobile-first with 44pt targets and AA contrast.

- [ ] **Step 5: Implement the privacy statement page at `src/app/(public)/privacy/page.tsx`, linked from the signup page**

FR-1.4 requires a plain-language statement of what the app stores and what leaves the app's infrastructure, reachable from the signup screen. At plan 1 the honest content is short: photos and email address are stored on the app's servers, nothing is sent to any third party, and account deletion removes everything. Plan 3 extends this page when provider calls start sending photos out, per NFR-4.5 — so write it as a page with a section per data flow, not one paragraph.

Add to `tests/features/accounts/register.test.ts`:

```ts
it("the signup page links to the privacy statement", async () => { expect(link).toHaveAttribute("href", "/privacy"); });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/features/accounts/`
Expected: PASS, 11 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: open signup with emailed verification and privacy statement"
```

---

### Task 7: Sign in, sign out, and password reset

**Files:**
- Create: `src/features/accounts/signin.ts`, `src/features/accounts/password-reset.ts`, `src/app/api/auth/signin/route.ts`, `src/app/api/auth/signout/route.ts`, `src/app/api/auth/reset/request/route.ts`, `src/app/api/auth/reset/confirm/route.ts`, `src/app/(auth)/signin/page.tsx`, `src/app/(auth)/reset/page.tsx`
- Test: `tests/features/accounts/signin.test.ts`, `tests/features/accounts/password-reset.test.ts`

**Interfaces:**
- Consumes: `verifyPassword`, `hashPassword`, session functions, `getMailer`, `consumeRateLimit`, `emailTokens`.
- Produces: `signIn(input: { email: string; password: string; ip: string }): Promise<Result<{ token: string; expiresAt: Date }, 'invalid_credentials' | 'rate_limited'>>`; `requestPasswordReset(input: { email: string; ip: string }): Promise<void>`; `confirmPasswordReset(input: { token: string; newPassword: string }): Promise<Result<{ userId: string }, 'invalid' | 'weak_password'>>`.

- [ ] **Step 1: Write the failing tests**

```ts
// signin.test.ts
it("signs in with the right password", async () => { expect(r.ok).toBe(true); });
it("refuses the wrong password", async () => { expect(r.error).toBe("invalid_credentials"); });
it("refuses an unknown email with the same error as a wrong password", async () => { expect(r.error).toBe("invalid_credentials"); });
it("signs in an unverified account", async () => { expect(r.ok).toBe(true); }); // FR-1.2: browsing allowed before verifying
it("rate limits repeated failures for one email", async () => { expect(r.error).toBe("rate_limited"); });

// password-reset.test.ts
it("emails a reset link for a known address", async () => { expect(mailer.sent).toHaveLength(1); });
it("sends nothing but still resolves for an unknown address", async () => { expect(mailer.sent).toHaveLength(0); });
it("sets the new password and lets the user sign in with it", async () => { ... });
it("revokes all existing sessions on reset", async () => { expect(await validateSessionToken(oldToken)).toBeNull(); });
// Review Focus 4
it("refuses an unknown, expired, used, or 'verify'-purpose token with the same error", async () => { ... });
it("refuses a new password under 12 characters", async () => { expect(r.error).toBe("weak_password"); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/features/accounts/signin.test.ts tests/features/accounts/password-reset.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `signin.ts` and `password-reset.ts`**

`requestPasswordReset` returns `void` by design: a caller cannot learn whether the address exists. Reset tokens reuse `emailTokens` with purpose `'reset'` and a 1-hour expiry. A successful reset calls `revokeAllSessions`. Rate limit keys: `signin:<email>` 10 per hour, `reset:<email>` 3 per hour (NFR-4.8).

- [ ] **Step 4: Implement the four routes and two pages**

Sign-out revokes the session and clears the cookie.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/accounts/`
Expected: PASS, all tests from Tasks 6 and 7.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: sign in, sign out, and password reset"
```

---

### Task 8: Object storage adapter

**Files:**
- Create: `src/lib/storage/types.ts`, `src/lib/storage/s3.ts`, `src/lib/storage/index.ts`
- Test: `tests/lib/storage/s3.test.ts`

**Interfaces:**
- Consumes: `env`.
- Produces: `interface ObjectStore { put(key: string, body: Buffer, contentType: string): Promise<void>; signedGetUrl(key: string, ttlSeconds: number): Promise<string>; delete(keys: string[]): Promise<void>; exists(key: string): Promise<boolean>; list(prefix: string): Promise<string[]>; }`; `getObjectStore(): ObjectStore`; `photoKey(userId: string, photoId: string, version: PhotoVersion): string`; `type PhotoVersion = 'original' | 'display' | 'thumb'`.

`exists` and `list` are here because Tasks 10, 11, 13, and 16 assert on what is and is not in storage — the NFR-5.2 and NFR-4.6 guarantees are not checkable without them.

- [ ] **Step 1: Write the failing test**

Integration test against the MinIO service from compose.

```ts
it("puts an object and returns a signed url that fetches it back", async () => {
  await store.put(key, buf, "image/jpeg");
  const url = await store.signedGetUrl(key, 60);
  const res = await fetch(url);
  expect(Buffer.from(await res.arrayBuffer())).toEqual(buf);
});
it("an unsigned url for the same key is refused", async () => { expect((await fetch(plainUrl)).status).toBeGreaterThanOrEqual(400); });
it("delete removes the objects", async () => { expect((await fetch(url)).status).toBeGreaterThanOrEqual(400); });
it("delete of a mix of present and absent keys resolves", async () => { ... });
it("exists reports true for a stored key and false for an absent one", async () => { ... });
it("list returns every key under a prefix and nothing outside it", async () => {
  expect(await store.list("users/u1/")).toEqual([photoKey("u1","p1","original")]);
});
it("photoKey namespaces by user and version", () => {
  expect(photoKey("u1","p1","thumb")).toBe("users/u1/photos/p1/thumb");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/storage/s3.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three files**

`@aws-sdk/client-s3` with `forcePathStyle: true` so the same code serves MinIO and R2. `signedGetUrl` uses `getSignedUrl` from the presigner. The bucket is private; nothing is ever made public.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/storage/s3.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: s3-compatible object store with signed read urls"
```

---

### Task 9: Image decoding and rendition rendering

**Files:**
- Create: `src/lib/images/decode.ts`, `src/lib/images/render.ts`
- Create: `tests/fixtures/` — `upright.jpg`, `rotated-90.jpg` (EXIF orientation 6), `iphone.heic`, `photo.png`, `photo.webp`, `truncated.jpg`, `not-an-image.pdf`, `large-15mb.jpg`
- Test: `tests/lib/images/decode.test.ts`, `tests/lib/images/render.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type DecodedImage = { buffer: Buffer; format: 'jpeg' | 'png' | 'webp'; width: number; height: number }`; `decodeUpload(input: Buffer): Promise<Result<DecodedImage, 'unsupported_format' | 'corrupt_image'>>`; `type Rendition = { buffer: Buffer; width: number; height: number; bytes: number; contentType: string }`; `renderDisplay(input: Buffer): Promise<Rendition>`; `renderThumbnail(input: Buffer): Promise<Rendition>`.

- [ ] **Step 1: Write the failing tests**

```ts
// decode.test.ts
it.each(["upright.jpg","photo.png","photo.webp"])("accepts %s", async (f) => { expect(r.ok).toBe(true); });
// Review Focus 1
it("converts HEIC to jpeg", async () => {
  const r = await decodeUpload(fixture("iphone.heic"));
  expect(r.ok && r.value.format).toBe("jpeg");
});
it("accepts a 15MB jpeg", async () => { expect(r.ok).toBe(true); });
// Review Focus 2 — content inspection, not the filename (NFR-4.9)
it("refuses a pdf renamed as .jpg", async () => { expect(r.error).toBe("unsupported_format"); });
it("refuses a truncated jpeg", async () => { expect(r.error).toBe("corrupt_image"); });
it("refuses an empty buffer", async () => { expect(r.error).toBe("unsupported_format"); });

// render.test.ts
// Review Focus 1 — NFR-3.5
it("applies EXIF orientation so a rotated photo comes out upright", async () => {
  const upright = await renderDisplay(fixture("upright.jpg"));
  const rotated = await renderDisplay(fixture("rotated-90.jpg"));
  expect(rotated.width).toBe(upright.width);
  expect(rotated.height).toBe(upright.height);
});
it("caps the display long edge at 1600px", async () => { expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(1600); });
it("caps the thumbnail long edge at 400px", async () => { expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(400); });
it("does not upscale an image smaller than the cap", async () => { ... });
it("reports bytes matching the buffer length", async () => { expect(r.bytes).toBe(r.buffer.length); });
it("strips EXIF from renditions", async () => { /* no GPS or orientation tags survive */ });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/images/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `decodeUpload` in `src/lib/images/decode.ts`**

Detect the real format from magic bytes, ignoring any declared type (NFR-4.9). HEIC/HEIF goes through `heic-convert` to JPEG, because sharp's prebuilt binaries do not reliably carry libheif. Everything else is validated by asking sharp for metadata; a throw becomes `'corrupt_image'`.

- [ ] **Step 4: Implement the two renderers in `src/lib/images/render.ts`**

sharp with `.rotate()` (no argument — applies EXIF orientation), `.resize({ fit: 'inside', withoutEnlargement: true })`, output JPEG quality 82, and metadata stripped. Display 1600px, thumbnail 400px.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/lib/images/`
Expected: PASS, 12 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: upload decoding with heic support and rendition rendering"
```

---

### Task 10: Items, photos, and item creation

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/features/items/create.ts`
- Test: `tests/features/items/create.test.ts`

**Interfaces:**
- Consumes: `decodeUpload`, `getObjectStore`, `photoKey`, `db`, `enqueueProcessPhoto` (Task 11 — import it; this task's tests stub the queue).
- Produces: `createItemFromPhoto(input: { userId: string; bytes: Buffer }): Promise<Result<{ itemId: string; photoId: string }, CreateItemError>>`; `type CreateItemError = 'not_verified' | 'too_large' | 'unsupported_format' | 'corrupt_image' | 'item_cap_reached' | 'storage_cap_reached' | 'rate_limited'`. `items` table: `id`, `userId`, `name` (text null), `primaryPhotoId` (uuid null), `createdAt`. `photos` table: `id`, `userId`, `itemId`, `originalBytes` (integer), `displayBytes` (integer null), `thumbBytes` (integer null), `width` (null), `height` (null), `status` (`'pending' | 'ready' | 'failed'`), `createdAt`.

- [ ] **Step 1: Write the failing test**

```ts
it("creates an item with a pending photo and enqueues processing", async () => {
  const r = await createItemFromPhoto({ userId, bytes: fixture("upright.jpg") });
  expect(r.ok).toBe(true);
  expect(photo.status).toBe("pending");
  expect(queue.enqueued).toEqual([photo.id]);
});
it("stores the original in object storage under the user's prefix", async () => { ... });
it("sets the new photo as the item's primary photo", async () => { ... });
it("refuses an unverified user", async () => { expect(r.error).toBe("not_verified"); }); // NFR-7.5
it("refuses a file over 15MB", async () => { expect(r.error).toBe("too_large"); }); // NFR-3.4
// Review Focus 2 — NFR-5.2
it("leaves no item, no photo row, and no stored object when decoding fails", async () => {
  const r = await createItemFromPhoto({ userId, bytes: fixture("not-an-image.pdf") });
  expect(r.error).toBe("unsupported_format");
  expect(await db.select().from(items)).toHaveLength(0);
  expect(await db.select().from(photos)).toHaveLength(0);
  expect(await store.list(`users/${userId}/`)).toHaveLength(0);
});
it("leaves no item or photo row when the object store put throws", async () => { ... });
it("two concurrent creates for one user both succeed and produce two items", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/items/create.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createItemFromPhoto`**

Order matters for NFR-5.2: check verified → check size → decode → check caps (Task 13) → `put` the original → **then** insert item and photo in one transaction → enqueue. A failure before the insert leaves nothing in the database; a failure after the `put` but before the insert leaves an unreferenced object, so delete it in a `catch` before returning the error. Only the original is stored inline — renditions are the worker's job, which is what keeps this under NFR-2.3's 5 seconds.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/items/create.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: item and photo tables with transactional item creation"
```

---

### Task 11: Job queue and the photo-processing worker

**Files:**
- Create: `src/lib/jobs/queue.ts`, `src/lib/jobs/handlers/process-photo.ts`, `worker/index.ts`
- Modify: `package.json` (add `npm run worker`)
- Test: `tests/lib/jobs/process-photo.test.ts`

**Interfaces:**
- Consumes: `renderDisplay`, `renderThumbnail`, `getObjectStore`, `photoKey`, `photos`.
- Produces: `enqueueProcessPhoto(photoId: string): Promise<void>`; `processPhoto(photoId: string): Promise<void>`; `startWorker(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Call `processPhoto` directly — the handler is tested without running pg-boss.

```ts
it("renders display and thumb versions and marks the photo ready", async () => {
  await processPhoto(photoId);
  expect(photo.status).toBe("ready");
  expect(photo.width).toBeGreaterThan(0);
  expect(await store.exists(photoKey(userId, photoId, "thumb"))).toBe(true);
});
it("records the rendition byte sizes", async () => { expect(photo.displayBytes).toBeGreaterThan(0); });
it("marks the photo failed, keeping the original, when rendering throws", async () => {
  expect(photo.status).toBe("failed");
  expect(await store.exists(photoKey(userId, photoId, "original"))).toBe(true);
});
it("is idempotent: running twice leaves one ready photo and no duplicate objects", async () => { ... });
it("resolves without error for a photo id that no longer exists", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/jobs/process-photo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `processPhoto`**

Fetch the original from storage, render both versions, put both, then update the row to `'ready'` with dimensions and byte sizes. Any throw sets `'failed'` and leaves the original untouched — a failed rendition must never cost the user their photo. Idempotency comes from the puts being keyed deterministically and the status update being unconditional.

- [ ] **Step 4: Implement `queue.ts` and `worker/index.ts`**

pg-boss against the same `DATABASE_URL`, queue name `process-photo`, 3 retries with exponential backoff, concurrency 4. `worker/index.ts` starts pg-boss and registers the handler. Add `"worker": "tsx worker/index.ts"` to scripts.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/lib/jobs/process-photo.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pg-boss worker rendering photo versions after upload"
```

---

### Task 12: Photo serving route

**Files:**
- Create: `src/app/api/photos/[photoId]/[version]/route.ts`, `src/features/photos/resolve.ts`
- Test: `tests/features/photos/resolve.test.ts`, `tests/app/photo-route.test.ts`

**Interfaces:**
- Consumes: `getCurrentUser`, `getObjectStore`, `photoKey`, `photos`.
- Produces: `resolvePhotoUrl(input: { userId: string; photoId: string; version: PhotoVersion }): Promise<Result<{ url: string }, 'not_found'>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("returns a signed url for the owner", async () => { expect(r.ok).toBe(true); });
// Review Focus 5 — NFR-4.3, and must not confirm the photo exists
it("returns not_found for another user's photo", async () => { expect(r.error).toBe("not_found"); });
it("returns not_found for a photo id that does not exist", async () => { expect(r.error).toBe("not_found"); });
it("returns not_found for a version that has not been rendered yet", async () => { ... });
it("rejects an unknown version string", async () => { ... });

// photo-route.test.ts
it("redirects with 302 to the signed url", async () => { expect(res.status).toBe(302); });
it("returns 404 for a signed-out request", async () => { expect(res.status).toBe(404); });
it("sets Cache-Control private", async () => { expect(res.headers.get("cache-control")).toContain("private"); });
it("the url is stable across two requests even though the signed targets differ", async () => {
  expect(res1.url).toBe(res2.url);
  expect(res1.headers.get("location")).not.toBe(res2.headers.get("location"));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/features/photos/ tests/app/photo-route.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `resolvePhotoUrl`**

One query filtered by both `photoId` and `userId`, so a non-owner and a non-existent photo are literally the same code path — that is how the "must not confirm existence" requirement stays true under refactoring. Signed URL TTL 300 seconds.

- [ ] **Step 4: Implement the route**

302 to the signed URL with `Cache-Control: private, max-age=60`. A signed-out or unauthorised request returns 404, not 403. The route path is the stable URL NFR-1.4 depends on; the redirect target varies per request and that is fine, because a future service worker caches the response against the stable request URL.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/photos/ tests/app/photo-route.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ownership-checked photo urls redirecting to signed storage"
```

---

### Task 13: Account caps and the items list API

**Files:**
- Create: `src/lib/limits/caps.ts`, `src/features/items/list.ts`, `src/app/api/items/route.ts`
- Modify: `src/features/items/create.ts` (wire in the cap check at the point named in Task 10 Step 3)
- Test: `tests/lib/limits/caps.test.ts`, `tests/features/items/list.test.ts`

**Interfaces:**
- Consumes: `env`, `items`, `photos`, `users`.
- Produces: `checkCaps(input: { userId: string; addingBytes: number }): Promise<Result<void, 'item_cap_reached' | 'storage_cap_reached'>>`; `type ItemSummary = { id: string; displayName: string; thumbnailUrl: string; createdAt: string; processing: boolean }`; `listItems(input: { userId: string; limit: number; cursor?: string }): Promise<{ items: ItemSummary[]; nextCursor: string | null; total: number }>`.

- [ ] **Step 1: Write the failing tests**

```ts
// caps.test.ts
it("allows under both caps", async () => { expect(r.ok).toBe(true); });
it("refuses at the item cap", async () => { expect(r.error).toBe("item_cap_reached"); });
it("refuses when the added bytes would cross the storage cap", async () => { expect(r.error).toBe("storage_cap_reached"); });
it("counts stored bytes across all versions of all photos", async () => { ... });
it("exempts an email listed in CAP_EXEMPT_EMAILS", async () => { expect(r.ok).toBe(true); }); // NFR-7.3
it("reads caps from env, so changing them needs no code change", async () => { ... });

// list.test.ts
it("returns newest first", async () => { expect(ids).toEqual([newest, older, oldest]); }); // FR-7.1
it("paginates by cursor without repeating or skipping an item", async () => { ... });
it("reports total independently of the page size", async () => { expect(total).toBe(30); });
it("marks a pending photo as processing", async () => { expect(items[0].processing).toBe(true); }); // FR-4.8
it("falls back to a date-based displayName when name is null", async () => { ... }); // FR-2.5, reduced until plan 2
it("returns only the requesting user's items", async () => { expect(items).toHaveLength(0); }); // NFR-4.3
it("returns an empty page and total 0 for a new account", async () => { ... }); // FR-7.7 empty state
```

Then, in `tests/features/items/create.test.ts`, add:

```ts
// Review Focus 3 — NFR-7.3
it("refuses the upload that would cross the storage cap, naming that limit, and keeps everything already stored", async () => {
  // fill to just under the cap, then upload one more
  expect(r.error).toBe("storage_cap_reached");
  expect(await db.select().from(items)).toHaveLength(priorCount);
  expect(await store.exists(photoKey(userId, priorPhotoId, "original"))).toBe(true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/limits/caps.test.ts tests/features/items/list.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `checkCaps` and `listItems`**

Caps read from `env`, exemption by email membership in `env.CAP_EXEMPT_EMAILS`. Stored bytes are the sum of `originalBytes + displayBytes + thumbBytes` for the user's photos. `listItems` paginates on `(createdAt, id)` as the cursor rather than an offset, so a concurrent insert cannot cause a skip or a repeat. `thumbnailUrl` is the stable route from Task 12, never a signed URL — signed URLs must not enter a cacheable JSON payload.

- [ ] **Step 4: Implement `GET /api/items` and wire the cap check into `createItemFromPhoto`**

The route is the data API NFR-1.4 requires. Query params `limit` (default 40, max 100) and `cursor`.

- [ ] **Step 5: Run the full suite to verify it passes**

Run: `npm test`
Expected: PASS, all tests including the new cap case in `create.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: per-account caps and the paginated items api"
```

---

### Task 14: Design system and theme

Lands the token system from the UI design doc. Every UI task after this one draws from it,
so it comes before the first screen rather than alongside it.

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/app/globals.css`, `src/components/ThemeProvider.tsx`, `src/components/HitArea.tsx`
- Test: `tests/styles/contrast.test.ts`, `tests/components/ThemeProvider.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: four theme palettes as CSS custom property sets on `[data-theme="khadi"|"tissue"|"chalk"|"indigo"]`, each defining `--ground --surface --ink --dim --line --accent --accent-ink --cut`; `THEMES` from `src/styles/themes.ts` as `Record<ThemeName, Record<TokenName, string>>` — the same values the CSS uses, exported so a test can assert on them; `type ThemeName = 'khadi' | 'tissue' | 'chalk' | 'indigo' | 'system'`; `useTheme(): { theme: ThemeName; setTheme(t: ThemeName): void }`; `contrastRatio(a: string, b: string): number`; `HitArea({ children, as }: { children: ReactNode; as?: ElementType }): JSX.Element` — wraps a small control and guarantees at least 44x44 of tappable area without changing its drawn size. Every chip, tab and switch in plans 2, 3 and 4 uses it.

- [ ] **Step 1: Write the failing contrast test**

This is NFR-8.1's standing guarantee, not a one-off check. It must fail if any palette
regresses.

```ts
// tests/styles/contrast.test.ts
const BODY = 4.5, LARGE = 3.0;
const PAIRS: [keyof Tokens, keyof Tokens, number][] = [
  ["ink","ground",BODY], ["ink","surface",BODY],
  ["dim","ground",BODY], ["dim","surface",BODY],
  ["accent","ground",LARGE], ["accent","surface",LARGE],
  ["accentInk","accent",BODY], ["ink","cut",BODY],
];
describe.each(Object.keys(THEMES))("%s", (name) => {
  it.each(PAIRS)("%s on %s meets %s:1", (fg, bg, need) => {
    expect(contrastRatio(THEMES[name][fg], THEMES[name][bg])).toBeGreaterThanOrEqual(need);
  });
});
it("every theme defines every token", () => { ... });
```

Expected values, from the design doc's measured table — the two light themes sit closest to
the line, which is why they were corrected: `dim` on `ground` is 4.57 for Khadi and 4.52 for
Tissue.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/styles/contrast.test.ts`
Expected: FAIL — `THEMES` not found.

- [ ] **Step 3: Implement `contrastRatio` and `THEMES` in `src/styles/themes.ts`**

`contrastRatio` is the WCAG 2.1 relative-luminance formula. The four palettes, verbatim from
the UI design doc §2.1:

| Token | khadi | tissue | chalk | indigo |
|---|---|---|---|---|
| `ground` | `#E4E0D2` | `#EBE6E3` | `#1C1D1A` | `#141C2B` |
| `surface` | `#F2EFE6` | `#F7F4F2` | `#262823` | `#1D2739` |
| `ink` | `#2A2A24` | `#23201F` | `#EDEAE3` | `#E6EAF2` |
| `dim` | `#666355` | `#6F6662` | `#9A9A90` | `#8694AB` |
| `line` | `#CFCABA` | `#D8D1CD` | `#3A3D35` | `#2E3B53` |
| `accent` | `#35603F` | `#2C4A7C` | `#7FB2C7` | `#C9A227` |
| `accentInk` | `#F2EFE6` | `#FFFFFF` | `#13201F` | `#141C2B` |
| `cut` | `#D6D1BF` | `#DED7D3` | `#2E302A` | `#223047` |

- [ ] **Step 4: Generate `src/styles/tokens.css` from `THEMES`**

One `[data-theme="…"]` block per theme, so CSS and the tested values cannot drift. Generate
it in a build step or assert equality in the test — do not hand-maintain two copies.

- [ ] **Step 5: Write the failing theme-selection test**

```ts
// tests/components/ThemeProvider.test.tsx
it("defaults to system", () => { expect(result.current.theme).toBe("system"); });
it("system with a light device preference resolves to tissue", async () => {
  matchMedia("(prefers-color-scheme: dark)", false);
  expect(document.documentElement.dataset.theme).toBe("tissue");
});
it("system with a dark device preference resolves to indigo", async () => { ... });
it("a pinned theme wins over the device preference", async () => {
  act(() => result.current.setTheme("khadi"));
  matchMedia("(prefers-color-scheme: dark)", true);
  expect(document.documentElement.dataset.theme).toBe("khadi");
});
it("remembers a pinned theme across a reload", async () => { ... });
it("follows a device preference that changes while open", async () => { ... });
```

- [ ] **Step 6: Implement `ThemeProvider` and `useTheme`**

NFR-8.5's pairing: `system` maps to **tissue** when the device is light and **indigo** when
it is dark; khadi pairs with chalk for a user who prefers that pair. `system` is the default,
and its user-facing label is **"Match my device"** — the settings screen shows five options,
not four themes plus a toggle. The
resolved name is written to `document.documentElement.dataset.theme`; a pinned choice
persists in `localStorage` and is read before first paint to avoid a flash of the wrong
theme.

- [ ] **Step 7: Implement `base.css` — type, scale, geometry**

From the design doc §2.2 and §2.3. Load **Archivo** (400/500/600), **Bricolage Grotesque**
(600/800) and **Spline Sans Mono** (400) from Google Fonts with real fallback stacks.
Bricolage is for screen titles and band names only; Spline Sans Mono for masked secrets and
measurements only. Radius by role: `2px` swatch chips, `3px` panels and buttons, `999px`
filter chips. Page gutter `14px`, grid gutter `7px`.

- [ ] **Step 8: Implement `HitArea.tsx`**

NFR-8.2 says visual size and hit area are decoupled, and that this is a property of the
shared components. `HitArea` wraps a small control and guarantees at least 44x44 of
tappable area via padding or a `::before` overlay without changing the drawn size. Chips,
tabs and switches use it; nothing re-implements it.

- [ ] **Step 9: Run both test files to verify they pass**

Run: `npm test -- tests/styles/contrast.test.ts tests/components/ThemeProvider.test.tsx`
Expected: PASS — 32 contrast assertions (4 themes x 8 pairs) plus 7 theme tests.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: four-theme token system with asserted contrast and paired system theme"
```

---

### Task 15: Wardrobe grid

**Files:**
- Create: `src/app/(app)/wardrobe/page.tsx`, `src/components/ItemGrid.tsx`, `src/components/ItemTile.tsx`, `src/components/EmptyWardrobe.tsx`, `src/components/LoadFailed.tsx`, `src/hooks/useItems.ts`, `src/lib/alt-text.ts`
- Test: `tests/components/ItemGrid.test.tsx`, `tests/lib/alt-text.test.ts`

**Interfaces:**
- Consumes: `GET /api/items`, `ItemSummary`, the tokens and `HitArea` from Task 14.
- Produces: `useItems(): { items: ItemSummary[]; total: number; loadMore: () => void; hasMore: boolean; state: 'loading' | 'ready' | 'error' }`; `altTextFor(item: ItemSummary): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// ItemGrid.test.tsx
it("renders a tile per item", async () => { expect(screen.getAllByRole("img")).toHaveLength(3); });
it("shows the item count", async () => { expect(screen.getByText(/14 pieces/i)).toBeVisible(); }); // FR-7.7
it("shows a processing indicator on a pending item", async () => { expect(screen.getByLabelText(/still processing/i)).toBeVisible(); });
it("loads the next page when loadMore is called", async () => { ... });
it("renders tiles at a fixed 3:4 ratio so lazy images reserve space", async () => {
  expect(getComputedStyle(tile).aspectRatio).toBe("3 / 4");
}); // NFR-2.6
// Plan 1 shows opaque photos, so this ground is invisible today. It is asserted now so
// plan 3 can drop transparent cutouts onto it without touching the grid (FR-4.1 as amended).
it("gives every tile plate the theme's cutout ground", async () => {
  expect(getComputedStyle(plate).backgroundColor).toBe(rgb(THEMES.tissue.cut));
});
// the empty state is an instruction, not a blank — UI design doc, Accounts group
it("empty wardrobe invites the first photo and says tagging can wait", async () => {
  expect(screen.getByText(/nothing in here yet/i)).toBeVisible();
  expect(screen.getByText(/tag it later, or never/i)).toBeVisible();
});
it("shows a plain-language message and a retry on fetch failure", async () => {
  expect(screen.getByText(/could not reach your wardrobe/i)).toBeVisible();
  expect(screen.getByRole("button", { name: /try again/i })).toBeVisible();
}); // NFR-5.8

// alt-text.test.ts — NFR-8.3's formula
it("uses the name when set", () => { expect(altTextFor({ name: "Linen shirt", ... })).toBe("Linen shirt"); });
it("falls back to the derived name", () => { ... });
it("appends category and colour when present", () => { ... }); // plan 2 supplies tags; assert the shape now
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/ItemGrid.test.tsx tests/lib/alt-text.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `altTextFor` in `src/lib/alt-text.ts`**

Name if set, else derived name, then Category and Colour tags when they exist. Tags arrive
in plan 2; the function takes them as optional now so plan 2 adds data, not a signature
change.

- [ ] **Step 4: Implement `useItems`, the four components, and the page**

Three columns at phone widths, more on wider screens, `3:4` tiles with explicit dimensions
(NFR-2.6). Each tile's plate takes its background from `var(--cut)`. Plan 1's photos are
opaque so it does not show yet — it is there so plan 3's transparent cutouts composite onto
the theme rather than onto a baked grey (FR-4.1). A client component reading the API (NFR-1.4), not a
server-rendered list. `EmptyWardrobe` and `LoadFailed` use the copy from the UI design doc
rather than invented wording; the empty state is the first screen every account ever sees.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/components/ItemGrid.test.tsx tests/lib/alt-text.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wardrobe grid with themed cutout ground, empty and failure states"
```

---

### Task 16: Capture and bulk upload

**Files:**
- Create: `src/app/(app)/add/page.tsx`, `src/components/CaptureButton.tsx`, `src/components/UploadQueue.tsx`, `src/lib/client/upload-queue.ts`, `src/app/api/items/upload/route.ts`
- Test: `tests/lib/client/upload-queue.test.ts`, `tests/app/upload-route.test.ts`

**Interfaces:**
- Consumes: `createItemFromPhoto`, `consumeRateLimit`, `getCurrentUser`.
- Produces: `type QueuedUpload = { id: string; fileName: string; state: 'waiting' | 'uploading' | 'done' | 'failed'; attempts: number; error?: string }`; `createUploadQueue(opts: { concurrency: number; maxAttempts: number; upload: (file: File) => Promise<void> }): { add(files: File[]): void; items(): QueuedUpload[]; subscribe(fn: () => void): () => void; retryFailed(): void }`.

- [ ] **Step 1: Write the failing tests**

```ts
// upload-queue.test.ts — FR-2.3
it("accepts up to 100 files in one session", () => { expect(q.items()).toHaveLength(100); });
it("refuses files beyond 100 and says so", () => { ... });
it("uploads with the given concurrency, not all at once", async () => { expect(maxInFlight).toBe(3); });
it("reports per-file state as each finishes", async () => { ... });
it("retries a failed upload up to maxAttempts", async () => { expect(attempts).toBe(3); });
it("marks a file failed after maxAttempts and keeps the others going", async () => {
  expect(q.items().filter(i => i.state === "done")).toHaveLength(4);
});
it("retryFailed re-queues only the failed ones", async () => { ... });
it("persists queue state so a reload resumes the unfinished files", async () => { ... });

// upload-route.test.ts
it("creates an item from a multipart upload", async () => { expect(res.status).toBe(201); });
it("returns 401 when signed out", async () => { expect(res.status).toBe(401); });
it("returns a plain-language message and a stable error code for each CreateItemError", async () => {
  expect(body).toEqual({ error: "storage_cap_reached", message: expect.stringMatching(/storage/i) });
}); // NFR-5.8
it("rate limits uploads per account", async () => { expect(res.status).toBe(429); }); // NFR-4.8
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/client/ tests/app/upload-route.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `createUploadQueue`**

A plain observable store, no framework. Concurrency 3, `maxAttempts` 3 with backoff. Queue state persists to `localStorage` keyed by session so a reload resumes — the `File` objects themselves cannot be persisted, so a resumed entry shows as failed-needs-reselect rather than silently vanishing. Say that in the UI.

- [ ] **Step 4: Implement the upload route**

Maps each `CreateItemError` to an HTTP status and a plain-language message. Rate limit key `upload:<userId>`, 200 per hour.

- [ ] **Step 5: Implement `CaptureButton`, `UploadQueue`, and the add page**

`<input type="file" accept="image/*" capture="environment" multiple>` — this is FR-12.2's direct camera access, no separate save-then-upload step. The queue component lists each file with its state and a retry affordance.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/lib/client/ tests/app/upload-route.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: camera capture and resumable bulk upload queue"
```

---

### Task 17: Account deletion

**Files:**
- Create: `src/features/accounts/delete.ts`, `src/app/api/account/route.ts`, `src/app/(app)/settings/page.tsx`
- Test: `tests/features/accounts/delete.test.ts`

**Interfaces:**
- Consumes: `getObjectStore`, `photoKey`, `revokeAllSessions`, `db`.
- Produces: `deleteAccount(userId: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
it("removes the user, their items, and their photo rows", async () => { expect(await db.select().from(items)).toHaveLength(0); });
it("deletes every stored object for that user", async () => { expect(await store.list(`users/${userId}/`)).toHaveLength(0); }); // NFR-4.6
it("revokes every session", async () => { expect(await validateSessionToken(token)).toBeNull(); });
it("frees the email address for re-registration immediately", async () => {
  await deleteAccount(userId);
  expect((await registerAccount({ email: "a@b.com", ... })).ok).toBe(true);
}); // NFR-4.6
it("leaves another user's items and objects untouched", async () => { ... });
it("is idempotent for an already-deleted user", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/accounts/delete.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `deleteAccount`**

List every object under the user's prefix and delete them, then delete the rows in one transaction. Objects first: an orphaned row is recoverable, an orphaned object is an invisible bill. NFR-4.6 allows 30 days but immediate deletion is simpler and strictly better, so do it inline.

- [ ] **Step 4: Implement the route and a settings page with a confirmation**

`DELETE /api/account` requires re-entering the password. The page states plainly what will be destroyed.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/accounts/delete.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: account deletion purging photos, rows, and sessions"
```

---

### Task 18: Deploy and verify the launch gates

**Files:**
- Create: `README.md` (setup and deploy), `scripts/seed-perf.ts`, `docs/superpowers/plans/notes/01-launch-gates.md`
- Modify: `package.json` (add `npm run seed:perf`)
- Test: `tests/perf/gates.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `seedPerfWardrobe(userId: string, itemCount: number): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// NFR-2.3 — the one launch gate this plan can assert in CI
it("creates an item from a 15MB jpeg in under 5 seconds", async () => {
  const start = Date.now();
  const r = await createItemFromPhoto({ userId, bytes: fixture("large-15mb.jpg") });
  expect(r.ok).toBe(true);
  expect(Date.now() - start).toBeLessThan(5000);
});
it("GET /api/items returns the first page of a 1000-item wardrobe in under 300ms", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/perf/gates.test.ts`
Expected: FAIL — `seedPerfWardrobe` not found.

- [ ] **Step 3: Implement `seedPerfWardrobe`**

Inserts rows and small objects directly, skipping the HTTP path, so seeding 1,000 items is fast.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/perf/gates.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Deploy the web process and the worker**

Managed Postgres, S3-compatible bucket, HTTPS enforced (NFR-4.1), the worker as a second process (NFR-1.5). Record the URLs and env in `README.md`.

- [ ] **Step 6: Measure NFR-2.1, 2.2, and 2.4 against the deployment by hand**

Seed 1,000 items, then on a throttled phone-profile connection record: cold and warm grid render (NFR-2.1 — 3s and 1s), and a page fetch (NFR-2.2 — 300ms). NFR-2.4 belongs to plan 3's provider work; note the current render-job latency as a baseline. Write the numbers into `docs/superpowers/plans/notes/01-launch-gates.md` with the date and the device. These need a real browser and a real network, which is why they are a measurement step and not a test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: deploy, seed script, and recorded launch-gate measurements"
```

---

## Requirement coverage

Every requirement in this plan's scope, and the task that serves it. A requirement with no
task here is named in Scope above as deferred or reduced.

| Req | Task | Req | Task |
|---|---|---|---|
| FR-1.1 open signup | 6 | FR-2.1 one photo | 16 |
| FR-1.2 verify before upload | 6, 10 | FR-2.2 photo alone is valid | 10 |
| FR-1.3 sign in, out, reset | 7 | FR-2.3 bulk session | 16 |
| FR-1.4 privacy statement | 6 | FR-2.4 several photos | *plan 2* |
| FR-1.5 one wardrobe | 10 (schema) | FR-2.5 derived name | 13 (reduced) |
| FR-1.6 private to owner | 12, 13 | FR-12.1 all on a phone | 15, 16 |
| FR-1.7 delete account | 17 | FR-12.2 camera directly | 16 |
| | | FR-12.3 session persists | 3 |
| | | FR-12.4 any device | 8, 12 |

---

## Hand-off to Plan 2

Plan 2 (tag types, tags, descriptions, filtering, search, item editing and archiving) builds directly on this. Two things it will change rather than extend:

- **FR-2.5** — `ItemSummary.displayName` falls back to a date here. Plan 2 derives it from the item's Category and Colour tags.
- **NFR-8.3** — alt text comes from the name alone here. Plan 2 includes tags.

And one thing to leave alone: `GET /api/items` returns `thumbnailUrl` as the stable route from Task 12. Plan 2 adds filter parameters to that endpoint; it must not start returning signed URLs, or NFR-1.4's cacheability goes with it.

# CLAUDE.md

Instructions for Claude working in this repository. Read this before touching anything.

## What this is

A mobile-first web app: a photographic record of everything you own to wear, so you can
answer questions about your own wardrobe when you are not standing in front of it. Personal
project, one primary user, open signup.

**Status: plan 1 in progress, subagent-driven.** Tasks 1-7 complete and reviewed; Task 8 in
review. The app builds and the suite runs against a real Postgres and Garage.

## Document precedence

When these disagree, the one higher up wins.

1. **The user's own words in the current conversation.**
2. **`docs/superpowers/specs/2026-11-03-digital-wardrobe-design.md`** — the spec. 99 in-scope
   functional requirements (FR-*) and 9 NFR groups. The binding authority.
3. **`docs/superpowers/specs/2026-11-04-wardrobe-ui-design.md`** — every designed screen,
   the token system, the copy rules, and a per-requirement coverage map.
4. **`docs/superpowers/specs/2026-11-04-wardrobe-infrastructure.md`** — database, host,
   object store, email, deploy, backups, real costs with sources.
5. **The four plans in `docs/superpowers/plans/`** — 57 tasks, each with exact signatures,
   test names and assertions. The plans *argue from* the spec; a conflict resolves toward
   the spec.
6. **`docs/runbooks/01-provision-the-host.md`** — provisioning the server, by hand.

FR-10 (seven requirements, outfits from a photograph of yourself) is Phase 2 and is **not**
built by any plan.

## Current execution state

| | |
|---|---|
| Executing | plan 1 of 4, `docs/superpowers/plans/2026-11-03-wardrobe-01-foundation-and-capture.md` |
| Method | **subagent-driven** (`superpowers:subagent-driven-development`) — the user chose this |
| Branch | `feat/plan-1-foundation`, branched from `design/wardrobe-phase-1` |
| Ledger | `.superpowers/sdd/2026-11-03-wardrobe-01-foundation-and-capture/progress.md` |
| Next | see the ledger's last `Task <N>: complete` line — that is the truth, not this table |

**After a compaction, trust the ledger and `git log` over your own recollection.** A task with
a `Task <N>: complete` line is done — do not re-dispatch it. Re-dispatching completed task
sequences is the most expensive failure this process has.

`design/wardrobe-phase-1` has open PR
[#3](https://github.com/uditjain-noob/DigitalWardrobe/pull/3) carrying the documents. It is
not a draft and has an auto-generated title; the user knows.

## Rules that are easy to break and expensive to break

Each is a spec requirement with a test behind it. None is a style preference.

- **Matting, never generative editing** (FR-4.2). A model asked to remove a background can
  redraw the garment, which would make the wardrobe a record of clothes the user does not
  own. A test asserts the generative path is unreachable.
- **Cutouts are stored with an alpha channel; the ground is a theme token** (FR-4.1,
  NFR-3.7). Baking a ground colour in makes it wrong in one theme and would mean
  reprocessing every photo to re-theme.
- **Fallback fires only on provider-side failures, never on an unusable photo** (FR-3.6).
  Otherwise the user pays a second provider for a call already known to be futile. Test
  NFR-9.7 exists because this is invisible when it breaks.
- **Autofill never silently overwrites a user-set value** (FR-6.6). In the review, existing
  tags default to ticked; new or replacing ones default to unticked. That is the whole safety
  model.
- **Every AI call runs on the user's own credential** (FR-3.1, NFR-7.1). The operator carries
  no per-use AI cost. Never introduce an operator-funded provider call.
- **The app must be fully usable with no credential configured** (FR-3.14). Adding, tagging,
  filtering, searching and outfits all work without one.
- **Per-account caps are the only thing between open signup and an unbounded bill**
  (NFR-7.3). They get real values before the app is reachable.
- **Secrets never reach a log, an error message, or the job history** (NFR-4.4). Losing
  `SECRET_ENCRYPTION_KEY` makes every stored credential permanently undecryptable.
- **Photos of people — outfit covers — are never sent to any provider** (FR-9.7, NFR-4.5).
  Separate storage prefix, so a normalisation sweep cannot pick them up.

## Architecture, in one screen

Three processes, one runtime, one database. No Redis, no second language, no separate image
service.

- **Node 26 LTS**, Node runtime never Edge (sharp and heic-convert are native).
- **Next.js 15** App Router. `src/app/` holds thin HTTP adapters; behaviour lives in
  `src/features/*` (domain use cases, tested directly) and `src/lib/*` (infrastructure
  behind interfaces: `ObjectStore`, `Mailer`, images, jobs, providers).
- **Postgres 16** via Drizzle, holding data *and* the job queue (**pg-boss** — it polls and
  holds a connection, which is why serverless Postgres is the wrong fit).
- **Objects** in an S3-compatible bucket (Cloudflare R2 in production, Garage locally).
- **The worker** is the same image with a different entrypoint (NFR-1.5).
- **Photos are served from a stable per-version app URL** that checks ownership and 302s to a
  short-lived signed storage URL. Bytes never proxy through the app (NFR-3.6). This is also
  what keeps a later offline cache possible (NFR-1.4), so do not replace it with a proxy or
  put a signed URL in a JSON payload.

## Conventions the plans assume

- `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` for expected failures.
  Throw only for programmer error and for a failed secret decrypt.
- Every query is scoped by `userId` at one boundary. A non-owner and a non-existent row take
  the same code path, so "not found" never confirms existence.
- Vitest against a **real** Postgres and Garage from `docker-compose.yml`. No mocking the
  database.
- **One commit per task**, message in the plan's final step.
- The dev `docker-compose.yml` is the file production runs. Do not add a dev-only service
  that production would need a different topology to replace.

## Commands

```bash
npm test              # test-db.sh (compose up, migrate) then vitest
npm run dev           # next dev
npm run worker        # the pg-boss worker
docker compose up -d  # postgres + garage locally
npx drizzle-kit generate && npx drizzle-kit migrate
```

These exist as of Task 8. `npm test` brings up Postgres and Garage, migrates, then runs Vitest.

## Do not

- **Do not install Postgres, Node or Caddy on the production host directly.** They arrive as
  containers from the compose file. A hand-installed Postgres is a second divergent copy.
- **Do not change `queryItems`' signature** once plan 2 defines it — plan 4 reuses it for
  "outfits containing a piece that is X".
- **Do not add a second way to read the tag vocabulary.** Plan 3's autofill builds a bounded
  slice on top of plan 2's `listTags` / `listTagTypes`.
- **Do not build Phase 2** (FR-10, outfit from a photograph of yourself) or anything in the
  spec's non-goals: calendars, outfit recommendation, weather, wear tracking, social
  features, retail integration, native apps, offline.
- **Do not sanitise tag names and descriptions.** They are user text that later enters a
  provider request; the *adapter* is responsible for placing them where they cannot act as
  instructions (NFR-4.10). Sanitising here corrupts legitimate descriptions.

## Verify, don't assert

Two habits this project has already been bitten by, both caught by checking rather than
reasoning:

- **Measure contrast, don't eyeball it.** Three WCAG AA failures shipped into the theme
  palettes and were found by computing the ratios. NFR-8.1 now requires a standing automated
  assertion over the token set.
- **Check version and pricing claims against a source, with a date.** The Node pin said 22
  from habit; Node 26 has been Active LTS since 2026-10-28. The infrastructure doc's prices
  carry a verification date for the same reason.

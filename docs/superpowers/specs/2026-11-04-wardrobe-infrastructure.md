# Digital Wardrobe — Infrastructure

**Date:** 2026-11-04
**Status:** Decided
**Implements:** [2026-11-03-digital-wardrobe-design.md](2026-11-03-digital-wardrobe-design.md) — the "Left to the builder" items concerning database, hosting, image storage, job runner, and transactional email.
**Affects:** [plan 1](../plans/2026-11-03-wardrobe-01-foundation-and-capture.md) Tasks 1 and 18.

---

## 1. What this decides, and what was already decided

Plan 1 already chose the **libraries**: TypeScript, Next.js 15 App Router, Postgres via Drizzle,
pg-boss for the queue, sharp and heic-convert for images, the AWS SDK for S3-compatible
storage, Vitest. None of that changes.

This document chooses the **things you pay for and operate**: which Postgres, which machine,
which object store, which email sender, and how it is deployed, backed up and watched.

**Framing.** This is a personal project. The spec sizes for "low thousands of accounts"
(NFR-6.1) as a *ceiling that needs no redesign* — not as a target. The real population is one
person and possibly a few friends. So the shape below is chosen to be cheap and boring at
n=1, while not foreclosing n=1000. Section 5 is the escape hatch and names exactly what
changes.

---

## 2. The constraints that actually narrow the choice

Four requirements eliminate most of the obvious options, and it is worth being explicit about
which, because they are the whole reason this is not "put it on Vercel".

| Constraint | What it rules out |
|---|---|
| **NFR-1.5** — work must run outside the request cycle, in a process that continues after the response | Request-only hosting. A platform that only runs functions per request cannot host pg-boss, which polls and holds a connection |
| **NFR-1.3** — reachable from anywhere on the public internet, "not from the user's own machine" | A home server behind a tunnel. The three driving moments are *all* away from home, so a machine that sleeps breaks the primary use case |
| **sharp + heic-convert** — native binaries | Edge runtimes. Every image path runs on the Node runtime |
| **NFR-5.1** — backups with a restore procedure "exercised end-to-end" | Any arrangement where losing the database is unrecoverable. This is the one failure with no undo |

A fifth, softer one: **NFR-3.6** redirects the browser straight to a signed storage URL, so
image bytes never pass through the app. That makes **object-store egress the dominant
bandwidth cost**, which is a real input to choosing the store.

---

## 3. The decision

**Three processes, one runtime, one database.** Node 22 LTS runs the web process and the
worker; Postgres 16 holds everything including the job queue; objects live in an S3-compatible
bucket. There is no Redis, no separate image service, no second language.

| Component | Choice | Why this one |
|---|---|---|
| **Runtime** | Node 22 LTS, Node runtime (not Edge) | sharp and heic-convert are native; Node 22 has prebuilt sharp binaries and native `fetch`. Pinned in `.nvmrc` and the Dockerfile |
| **Web** | Next.js 15, one container | Already chosen in plan 1 |
| **Worker** | A second container running the same image with a different entrypoint | NFR-1.5. Same image means one build, and the worker can import `src/features/*` directly |
| **Database** | **Postgres 16 in a container on the same host**, on a named volume | Always-on and local: pg-boss polls constantly and holds a connection, which is exactly what serverless Postgres with autosuspend is worst at. Zero latency to the app, zero cost, and the same `docker-compose` service as local dev |
| **Queue** | pg-boss on that Postgres | No second datastore to run or pay for. Plan 1 Task 11 already builds this |
| **Object store** | **Cloudflare R2** | S3-compatible with presigned URLs, so plan 1 Task 8 works unchanged — and **no egress charges**, which matters precisely because NFR-3.6 sends every image byte straight from the store to the browser. A free allowance covers a personal wardrobe several times over |
| **Host** | **One small VPS** (Hetzner CX22 class, 2 vCPU / 4 GB), Docker Compose | Dwarfs the load at personal scale. Runs a long-lived worker without ceremony. One box to reason about |
| **TLS / reverse proxy** | **Caddy**, in the same compose file | Automatic certificates and renewal with three lines of config. Satisfies NFR-4.1 without a cron job you have to remember |
| **Email** | **Resend**, on your own domain | Volume is tiny — verification and password reset only. Needs DKIM on a domain you own, which you need anyway |
| **Domain** | One, registered anywhere | Required for email deliverability and for the app itself |
| **Secrets** | A `.env` on the host, mode 600, never in git | NFR-4.4 requires `SECRET_ENCRYPTION_KEY` to live outside the database *and* outside the source tree. A file on the box satisfies both |
| **Deploys** | GitHub Actions → build and push image → SSH to the host → `docker compose up -d` | No platform coupling. The same compose file runs locally |
| **Backups** | Nightly `pg_dump` plus an R2 object sync, to a **separate** bucket, with a rehearsed restore | NFR-5.1. See section 6 |

### Why a VPS rather than a platform

The honest trade. A platform (Railway, Render, Fly) removes sysadmin work and costs roughly
two to four times as much at this size; a VPS costs the price of a coffee per month and hands
you the upgrades, the backups and the monitoring.

For a personal project the VPS wins on one specific argument beyond price: **the production
topology is the `docker-compose.yml` you already run locally.** Plan 1 Task 1 builds that
compose file for the test harness. Deploying it is then a change of environment variables, not
a change of architecture — no "works locally, behaves differently in production" class of bug,
which for a solo builder is worth more than the managed conveniences.

The cost is real and should be stated: **you are the database administrator.** That is why
section 6 is not optional.

### Why Postgres on the box rather than managed

This is the decision most likely to be questioned, so: pg-boss works by holding a connection
and polling. Serverless Postgres that suspends when idle is the worst possible fit — the
worker wakes it continuously, which either defeats the scale-to-zero you are paying for or
introduces wake latency into every job. Always-on managed Postgres solves that and costs more
per month than the entire rest of this stack.

Containerised Postgres on the same host is always-on, free, and has no network hop. **The
whole of its downside is that backups are yours**, and section 6 answers that.

### What the app never knows

Every choice above is reachable only through an interface the plans already defined. The app
talks to `ObjectStore` (plan 1 Task 8), `Mailer` (Task 4), `DATABASE_URL`, and the provider
adapter boundary (plan 3 Task 2). **Swapping R2 for S3, or containerised Postgres for managed,
is an environment change and at most one adapter — never a feature change.** That is what
makes section 5 cheap.

---

## 4. Rejected, with the reason

| Option | Why not |
|---|---|
| **Vercel** for the app | Best-in-class Next.js hosting and the wrong shape here: it cannot run a long-lived worker, which NFR-1.5 requires and pg-boss assumes. The workaround — cron-triggered functions draining the queue — means replacing pg-boss and rewriting plan 3's job handling. Vercel plus a separate worker elsewhere is two platforms for one small app |
| **Serverless Postgres** (Neon, Supabase free tier) | Generous and genuinely good, but autosuspend fights a polling worker, and the free tiers pause after inactivity — which for an app you open twice a week is the normal state, not the exception |
| **A home machine behind a tunnel** | Free, and breaks the primary use case. "Standing in a shop checking what I own" fails when the machine at home is asleep |
| **Redis for the queue** | A second datastore to run, back up and pay for, to replace something Postgres already does well enough at this scale. pg-boss exists for exactly this reason |
| **Kubernetes, or anything with a control plane** | The load is one person. Three containers on one host is the correct amount of machinery |
| **A managed image/CDN service for cutouts** | Tempting, but NFR-3.6's stable-URL-plus-signed-redirect already gives browser caching, and a CDN in front of private per-user images adds an authorisation problem rather than solving a performance one. Revisit only if measurement says to |

---

## 5. If it grows — what changes, and what does not

The ceiling of this shape is roughly **a few hundred active accounts** on one 4 GB box, and
the first thing to hurt will be Postgres competing with sharp for memory during a bulk upload.

Three moves, in the order they become worth making. Each is an environment change, not a
rewrite.

1. **Split Postgres out to managed, always-on.** Change `DATABASE_URL`. Nothing in the code
   knows. Do this first because it also hands the backup problem to someone whose job it is.
2. **Move the worker to its own machine.** It already runs as a separate process against the
   same database and bucket; it needs no inbound networking. Change nothing but where the
   container runs. This is also the fix if image processing starves the web process.
3. **Run two web containers behind Caddy.** The app is stateless — sessions are database rows
   (plan 1 Task 3), not in-process memory — so this works without a sticky-session story. Only
   then is there any reason to think about a platform with autoscaling.

**What never has to change:** the data model, the API shape, the queue, the storage interface,
the provider boundary, or any of the 57 tasks in the four plans. That is the point of having
written them against interfaces rather than against a host.

**The one thing to watch that is not capacity:** NFR-7.3's per-account caps exist because
signup is open and storage is yours. At personal scale they are a formality. The moment a
stranger signs up, they are the only thing between you and an unbounded bill — so they get
real values before the app is reachable, not after.

---

## 6. Operations — the parts that are not optional

Containerised Postgres means these are yours. They are also small.

**Backups (NFR-5.1).** A nightly container runs `pg_dump --format=custom` and uploads to a
**separate R2 bucket** from the one holding photographs — one bucket is one blast radius.
Object storage gets a periodic sync to that same backup bucket, since a dropped photograph is
as unrecoverable as a dropped row. Keep seven daily and four weekly.

**The restore drill.** Plan 1 Task 18 requires this before launch and plan 4 Task 11 repeats it
on the finished product. Restore the dump to a throwaway database and bucket, point a local app
at it, and confirm pieces, photographs, tags, outfits and credentials all come back. **Record
how long it took.** An untested backup is a belief, not a backup — and NFR-5.1 says "exercised",
which is the word doing the work.

**Secrets.** `.env` on the host at mode 600. `SECRET_ENCRYPTION_KEY` is 32 random bytes,
base64. **Losing it makes every stored provider credential permanently undecryptable** — plan 3
Task 1 makes that fail loudly rather than silently, which is correct and no comfort. Keep a
copy somewhere that is not the server and not this repository. Rotating it means re-entering
every credential.

**Monitoring (NFR-7.6).** Proportionate, not a dashboard project: a `/api/health` endpoint
checking database and bucket reachability, one external uptime check hitting it, and an
author-only page showing total storage, queue depth, per-provider error rate and signup count —
the four figures NFR-7.6 names. Disk space on the box is the fifth, because Postgres and the
image cache share it.

**Upgrades.** Unattended security updates on the host. Postgres minor versions with the image
tag; majors deliberately, with a dump taken first.

---

## 7. Approximate cost

Verify current prices before committing — these move, and the point of the table is the shape,
not the arithmetic.

| | Monthly |
|---|---|
| VPS, 2 vCPU / 4 GB | ~€4–6 |
| Cloudflare R2 | ~€0 within the free allowance at personal scale; no egress charge at any size |
| Resend | ~€0 on the free tier at this volume |
| Domain | ~€1 amortised |
| **Total** | **~€5–7 per month** |

Plus the one cost that is **not yours**: every AI call runs on the user's own provider
credential (FR-3.1, NFR-7.1), so matting and autofill never appear on this bill — including
your own, which lands on whichever key you add to your own account.

---

## 8. Changes to the other documents

| Document | Change |
|---|---|
| Spec §9 "Left to the builder" | the first bullet — database, hosting, image storage, job runner, transactional email — is now decided here and points at this document |
| Plan 1 Task 1 | the `docker-compose.yml` it builds for dev is the same file production runs, with MinIO standing in for R2 locally |
| Plan 1 Task 18 Step 5 | replaced: the concrete deploy, not "managed Postgres, S3-compatible bucket" |
| Plan 1 Task 18 | gains the backup and restore-drill step NFR-5.1 requires |

## 9. Still open

- **Which vision provider** populates plan 3's enumeration. Unchanged by this document and
  deliberately still open: the spec's hard constraint is one credential covering both matting
  and attribute reading, and plan 3 Task 14 Step 6 verifies the matting against twenty awkward
  photographs **before** the upload path depends on it. That verification, not a comparison
  table, is what should decide it.
- **Which region** the VPS and bucket sit in. Put both in the same region, and near you rather
  than near a notional user base — at this scale your own latency is the only latency.

# Digital Wardrobe

A photographic record of everything you own to wear, so you can answer questions about your
own wardrobe when you are not standing in front of it.

Three moments drove the design:

- **Away from home** — deciding what to wear, or packing, without the wardrobe in front of you.
- **Shopping** — standing in a shop, needing to know what you already own before buying
  something near-identical.
- **Searching by style** — seeing every piece you own of a particular kind, colour or style at
  once, which a physical wardrobe cannot show you.

Plus one thing that follows: combinations that worked are worth keeping, so you can recall
them instead of re-deriving them.

> **Status: design complete, implementation not started.** Everything in this repository today
> is a document — the spec, the UI design, the infrastructure decision, four implementation
> plans and a provisioning runbook. There is no application code yet.

---

## How it works

Add a piece by photographing it. **That is the only required step** — a piece with nothing but
a photograph is fully usable. Tap once and the app reads the photograph and suggests tags; it
proposes in *your* vocabulary, not a fixed one, because you can invent your own dimensions
("Fabric", "Fit", "Work-ok") and write down what each of your terms means. Those written
meanings are what make the suggestions worth anything.

Every photograph is cut out of its background automatically, which is what turns a grid of
pictures taken on beds, hangers and shop floors into something you can actually scan.

Then find anything by any combination of what you wrote, save outfits, and browse them.

Two decisions shape the whole thing:

- **You supply the AI credential.** Cutting out backgrounds and reading tags both run on a
  provider key you add, so the running cost of intelligence is yours and bounded by your own
  quota — never the operator's.
- **Nothing is invented.** Background removal is constrained to *matting* — removing pixels,
  never redrawing. A model that can repaint a collar would make this a record of clothes you
  do not own, and you would have no way to tell.

## The documents

| | |
|---|---|
| [Spec](docs/superpowers/specs/2026-11-03-digital-wardrobe-design.md) | What it must do. 99 in-scope functional requirements, 9 non-functional groups, with the goals, non-goals and anti-goals that produced them |
| [UI design](docs/superpowers/specs/2026-11-04-wardrobe-ui-design.md) | The chosen direction, the token system, 54 designed states each mapped to the requirement it serves, and measured accessibility |
| [Infrastructure](docs/superpowers/specs/2026-11-04-wardrobe-infrastructure.md) | Database, host, object store, email, deploys, backups — and what it actually costs, with sources and a verification date |
| [Plan 1 — foundation and capture](docs/superpowers/plans/2026-11-03-wardrobe-01-foundation-and-capture.md) | 18 tasks: accounts, photo capture, the grid, the design system |
| [Plan 2 — vocabulary and filtering](docs/superpowers/plans/2026-11-04-wardrobe-02-vocabulary-and-filtering.md) | 14 tasks: tag types and tags, filtering, search, editing, archive |
| [Plan 3 — providers and autofill](docs/superpowers/plans/2026-11-04-wardrobe-03-providers-and-autofill.md) | 14 tasks: credentials, background removal, autofill |
| [Plan 4 — outfits](docs/superpowers/plans/2026-11-04-wardrobe-04-outfits.md) | 11 tasks: building, the library, filtering by contents |
| [Runbook — provision the host](docs/runbooks/01-provision-the-host.md) | Standing up the server, start to finish |

Every one of the 99 in-scope requirements maps to a named task; each plan carries its own
coverage map. Seven have no screen because they are not visual, and each is named rather than
quietly ticked.

### Design mockups

Interactive, four themes, real phone widths:

- [Swatch Deck](https://claude.ai/code/artifact/5236e02f-4ecd-4ba9-a205-6631a15e6e2d) — the chosen direction: wardrobe, filtering, vocabulary, a piece, outfits, keys
- [Accounts and Autofill](https://claude.ai/code/artifact/8b1767d8-2e17-456e-97b0-650bc54b977e) — eleven account screens, seven autofill states
- [Editing and the Rest](https://claude.ai/code/artifact/4ee41660-44de-4ba9-84d9-a56c70026a55) — finding, editing, vocabulary upkeep, outfit building, spending
- [Four Wardrobes](https://claude.ai/code/artifact/de649631-4fa1-4af3-967e-41ec904f19b0) — the three rejected directions, kept for the record

Garments in the mockups are drawn outlines standing in for photographs. The UI design doc
flags where that flatters the result.

## Stack

Three processes, one runtime, one database. No Redis, no second language, no separate image
service.

**Node 26 LTS** · **Next.js 15** App Router · **Postgres 16** via Drizzle, holding data and the
job queue · **pg-boss** · **sharp** and heic-convert · S3-compatible object storage
(**Cloudflare R2**, Garage locally) · **Caddy** for TLS · **Resend** for mail · **Vitest**
against a real database

Deployed as four containers on one small box, from the same `docker-compose.yml` that runs
locally — so there is no "works on my machine" gap to debug.

**Running cost: roughly $1–11 a month** depending on the host, because object storage and email
both fit inside free tiers at this scale and AI runs on the user's own key. The
[infrastructure doc](docs/superpowers/specs/2026-11-04-wardrobe-infrastructure.md#7-hosting-options-and-what-they-actually-cost)
has the options priced with sources.

## Building it

Implementation follows the four plans in order, each task test-first with a review before the
next begins. Plan 1 Task 1 creates the project; nothing exists before that.

If you are an AI agent working here, read [CLAUDE.md](CLAUDE.md) first — it carries the
document precedence, the current execution state, and the handful of rules that are expensive
to break.

## Licence

See [LICENSE](LICENSE).

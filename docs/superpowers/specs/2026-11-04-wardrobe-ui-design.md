# Digital Wardrobe — UI Design

**Date:** 2026-11-04
**Status:** Complete. Every requirement in the spec has a designed screen.
**Implements:** [2026-11-03-digital-wardrobe-design.md](2026-11-03-digital-wardrobe-design.md)

**Mockups** — three pages, one design system, four themes throughout:

| Page | Covers | Link |
|---|---|---|
| Swatch Deck | wardrobe, filtering, vocabulary creation, a piece, outfits, adding, keys | https://claude.ai/code/artifact/5236e02f-4ecd-4ba9-a205-6631a15e6e2d |
| Accounts and Autofill | 11 account screens, 7 autofill states | https://claude.ai/code/artifact/8b1767d8-2e17-456e-97b0-650bc54b977e |
| Editing and the Rest | finding, editing a piece, vocabulary upkeep, outfit building, keys and spending | https://claude.ai/code/artifact/4ee41660-44de-4ba9-84d9-a56c70026a55 |
| *Rejected directions* | Care Label, Pattern Paper, The Rail — kept for the record | https://claude.ai/code/artifact/de649631-4fa1-4af3-967e-41ec904f19b0 |

---

## 1. The direction

**Swatch Deck**, chosen from four pitched directions.

The device: **every piece is a swatch chip — a field of that garment's own colour, with the
garment cut out of it.** Pieces group into bands by category. Colour is never decoration in
this interface; a coloured field always means the garment is that colour.

It was re-cut once. The first version banded by *colour*, which made colour the index,
demoted every other dimension to a filter, and gave a colour you own two of a whole band.
Banding by category and moving colour onto the chip keeps the deck's look, puts the dimension
you reach for first on the outside, and still answers "do I own a black shirt" inside the
Shirts band.

### Decisions taken without an explicit answer

Put to the user twice and left open. Recorded as the design's calls, not theirs.

- **Outfit library: Flat lay**, with Colour story as a density switch past roughly thirty
  outfits. Flat lay is the only one of the three treatments where the arrangement itself
  carries information — whether the outfit works — which is the question that screen is
  opened to answer. Moodboard is the best-looking and the one real photographs will damage
  most: silhouettes at angles read as composed, photographs at angles read as dropped.
- **Default theme: Khadi**, reached through "Match my device". All four ship.

---

## 2. Design system

### 2.1 Colour

Four themes, each a complete palette. Two light-first, two dark-first.

| Token | Khadi | Tissue | Chalk | Indigo |
|---|---|---|---|---|
| `ground` | `#E4E0D2` | `#EBE6E3` | `#1C1D1A` | `#141C2B` |
| `surface` | `#F2EFE6` | `#F7F4F2` | `#262823` | `#1D2739` |
| `ink` | `#2A2A24` | `#23201F` | `#EDEAE3` | `#E6EAF2` |
| `dim` | `#666355` | `#6F6662` | `#9A9A90` | `#8694AB` |
| `line` | `#CFCABA` | `#D8D1CD` | `#3A3D35` | `#2E3B53` |
| `accent` | `#35603F` | `#2C4A7C` | `#7FB2C7` | `#C9A227` |
| `accentInk` | `#F2EFE6` | `#FFFFFF` | `#13201F` | `#141C2B` |
| `cut` | `#D6D1BF` | `#DED7D3` | `#2E302A` | `#223047` |

`cut` is the ground an alpha cutout composites onto, and the reason it is a token is §5.1.

**Pairing (NFR-8.5).** The setting offers five options and **"Match my device" is the
default**: Khadi when the device is light, Chalk when it is dark. Tissue pairs with Indigo.
Pinning a named theme holds it in both appearances.

Grounded in the subject: undyed handloom, pattern tissue, tailor's chalk on wool, an indigo
vat with brass. Deliberately avoided: warm cream with a terracotta accent, and near-black
with a single acid pop.

### 2.2 Type

| Role | Face | Weights | Used for |
|---|---|---|---|
| Titles, band names | Bricolage Grotesque | 600, 800 | screen titles, category band names; tracking `-.03em` |
| Everything else | Archivo | 400, 500, 600 | body, labels, controls, forms |
| Notation only | Spline Sans Mono | 400 | masked secrets, measurements |

One display face used with restraint, one workhorse, one for notation. Sentence case
throughout — no all-caps labels. No face loaded that is not used.

### 2.3 Geometry

- **Radius by role, not uniform:** `2px` swatch chips, `3px` panels and buttons, `999px`
  filter chips, `22px` the viewport. A chip and a sheet are different kinds of object.
- Page gutter `14px`, grid gutter `7px`, band spacing `17px`.
- Chips: `3:4` in grids, `74x96` in horizontal fans, `34x44` in list rows, `48x62` in a
  review header.
- Shadow is spent in exactly one place — pieces lifted off an outfit composition.

### 2.4 Components

| Component | Behaviour |
|---|---|
| Swatch chip | colour field plus knocked-out cutout; knockout is dark above 0.45 relative luminance and light below, computed per chip |
| Category band | name, **matching** count, "See all *n*" |
| Segmented switch | Categories ↔ Everything; does not reset active filters |
| Filter button | in the bar in every wardrobe state; shows a live count when filters are on |
| Active-filter row | removable chips plus one Clear |
| Filter sheet | full-height overlay; whole vocabulary grouped by type, counts per tag, "not tagged" per group, creation affordances, counted primary action |
| Tag chip (editing) | value plus a remove affordance; dashed means machine-derived, solid means user-set |
| Checkbox row | autofill review; ticked by default for existing tags, unticked for new or replacing ones |
| `HitArea` | guarantees 44x44 of tap area around a small control without changing its drawn size |
| Bottom tabs | Wardrobe, Outfits, Add, Keys |
| Counted action | every destructive or spending action names its size: "Save 5 tags", "Cut out 100", "Show 9 pieces" |

### 2.5 Copy rules

Words were treated as design material, and these rules hold across all 54 states.

- **Say the consequence on the screen that causes it.** "This signs you out everywhere else."
  "Deleting an outfit keeps every piece in it." "Removing a tag here never deletes it from
  your vocabulary."
- **Errors name the cause and offer the fix.** "Your studio key is out of quota", not
  "something went wrong". No apologies.
- **Count what is at stake.** Real numbers from the account — "79 pieces, 12 outfits, 410 MB,
  2 stored keys" — not "all your data".
- **Explain a deliberate vagueness.** The password-reset screen says why it will not confirm
  whether an address exists.
- **Admit a real limitation rather than imply a nicer one.** The resume screen says phones
  will not let the app keep the files, and keeps the filenames instead.
- **An empty screen is an invitation to act**, never a blank.

---

## 3. The screens

54 states. Grouped by surface; the mockup page each lives on is in the last column.

### Wardrobe and filtering

| Screen | Serves | Page |
|---|---|---|
| Categories — eight bands, the landing state | FR-7.1, FR-7.2 | Swatch Deck |
| Filter sheet — whole vocabulary, grouped, counted | FR-7.3, FR-7.4, FR-7.5 | Swatch Deck |
| Filters applied — bands re-count, empty categories drop | FR-7.4, FR-7.6 | Swatch Deck |
| New tag type, created from the sheet | FR-5.3, FR-5.6–5.9 | Swatch Deck |
| Inside a category | FR-7.2 | Swatch Deck |
| Everything — one flat grid | FR-7.1 | Swatch Deck |
| Search — names, tag names, tag descriptions | FR-7.8, FR-11.2 | Editing |
| Nothing matches — prices each way out | FR-7.7 | Editing |
| Sorting — pieces and categories | FR-7.9, FR-11.4 | Editing |
| Empty wardrobe | FR-7.7, FR-2.1, FR-2.2 | Accounts |
| Could not load | NFR-5.8 | Editing |
| Cap reached | NFR-7.3 | Accounts |

### A piece

| Screen | Serves | Page |
|---|---|---|
| One piece — tags by type, descriptions, autofill | FR-7.10, FR-5.14, FR-6.1 | Swatch Deck |
| Editing — tags by type with rules, derived-name placeholder | FR-5.13, FR-8.1, FR-2.5 | Editing |
| Adding a tag — autocomplete with descriptions and counts | FR-5.10, FR-5.11 | Editing |
| Several photographs — which one is shown | FR-2.4 | Editing |
| Cut-out or original — side by side, re-run | FR-4.6, FR-4.4 | Editing |
| Cut-out failed | FR-4.7 | Editing |
| Archive or delete — names the affected outfits | FR-8.2, FR-8.4 | Editing |
| Archived pieces — with the "in no outfits" column | FR-8.3 | Editing |

### Vocabulary

| Screen | Serves | Page |
|---|---|---|
| Your tags — six types, rules, counts, hidden group | FR-5.15, FR-5.4 | Editing |
| One tag — rename, describe, move, suggested merge | FR-5.12, FR-5.6 | Editing |
| Merging two — which survives | FR-5.12 | Editing |
| One tag type — four rules as switches, hide or delete | FR-5.3, FR-5.4, FR-5.7, FR-5.8, FR-5.9 | Editing |

### Outfits

| Screen | Serves | Page |
|---|---|---|
| Library, Flat lay (chosen) | FR-11.1, FR-11.2 | Swatch Deck |
| Library, Moodboard (alternative) | FR-11.1 | Swatch Deck |
| Library, Colour story (density switch) | FR-11.1 | Swatch Deck |
| One outfit — composition, tags, piece rows | FR-9.9 | Swatch Deck |
| Building — the wardrobe's own filters, a tray | FR-9.2 | Editing |
| Editing — name, tags, cover, delete | FR-9.4, FR-9.6, FR-9.7, FR-9.8 | Editing |
| Filtering — by outfit tags, by contents, by absence | FR-11.3, FR-11.2 | Editing |

### Adding photographs

| Screen | Serves | Page |
|---|---|---|
| Bulk queue — per-photo state and retry | FR-2.3, FR-4.5, FR-4.8 | Swatch Deck |
| Before cutting out 100 — count, key, price | FR-4.11, NFR-7.4 | Editing |
| Resuming a session | FR-2.3, NFR-5.8 | Editing |

### Accounts

| Screen | Serves | Page |
|---|---|---|
| Create an account | FR-1.1, FR-1.4 | Accounts |
| Signup refused — both errors at once | FR-1.1, NFR-5.8 | Accounts |
| Check your email | FR-1.2, NFR-7.5 | Accounts |
| Sign in, in its error state | FR-1.3 | Accounts |
| Reset password | FR-1.3, NFR-4.3 | Accounts |
| Set a new password | FR-1.3 | Accounts |
| What we store | FR-1.4, NFR-4.5 | Accounts |
| Settings — cutout switch, usage meters, theme | FR-1.7, FR-4.10, NFR-7.3, NFR-8.5 | Accounts |
| Delete my account | FR-1.7, NFR-4.6 | Accounts |

### Keys and autofill

| Screen | Serves | Page |
|---|---|---|
| Provider keys — ordered, per-capability test results | FR-3.3, FR-3.5, FR-3.8–3.13 | Swatch Deck |
| Adding a key | FR-3.1, FR-3.2, FR-3.15 | Editing |
| Order and turning off — two lists, stale results | FR-3.3, FR-3.4, FR-3.10 | Editing |
| What a piece cost — every attempt | FR-3.7, FR-6.10 | Editing |
| No provider key — the app is still whole | FR-3.14, FR-6.2, FR-4.3 | Accounts |
| Reading the photograph | FR-6.11 | Accounts |
| Review suggestions | FR-6.5, FR-6.6, FR-6.7, FR-6.12 | Accounts |
| When it disagrees with you | FR-6.6, FR-5.7 | Accounts |
| Before a batch runs | FR-6.8, NFR-7.4 | Accounts |
| Batch review — grouped by tag | FR-6.8, FR-6.6 | Accounts |
| It did not run | FR-6.9, FR-6.10 | Accounts |

---

## 4. Coverage

All 99 in-scope functional requirements have a designed screen. The seven FR-10 requirements
(outfit from a photo of yourself) are Phase 2 and correctly absent.

| Group | Reqs | Status |
|---|---|---|
| FR-1 Accounts | 7 | all covered — 2 have no visual surface (FR-1.5, and FR-1.6 is covered by the absence of any sharing affordance) |
| FR-2 Adding | 5 | all covered |
| FR-3 Credentials | 15 | 14 covered; FR-3.6 (fallback is narrow and bounded) is behaviour with no screen, surfaced through "What a piece cost" |
| FR-4 Normalisation | 11 | 10 covered; FR-4.2 (matting not generative) has no screen — it is a build constraint with a test |
| FR-5 Tags | 16 | all covered |
| FR-6 Autofill | 12 | 11 covered; FR-6.4 (reads the normalised image) has no screen |
| FR-7 Browsing | 12 | 11 covered; FR-7.12 (URL-addressable filters) is not visual |
| FR-8 Editing | 4 | all covered |
| FR-9 Outfits | 9 | all covered |
| FR-11 Outfit library | 4 | all covered |
| FR-12 Phone | 4 | 2 covered; FR-12.3 and FR-12.4 have no visual surface |

Seven requirements have no screen because they are not visual: FR-1.5, FR-3.6, FR-4.2,
FR-6.4, FR-7.12, FR-12.3, FR-12.4. Each is a build constraint carried by the spec and, where
testable, by a plan task.

---

## 5. Non-functional verification

### 5.1 The cutout must carry alpha — spec change applied

FR-4.1 said the garment is "placed on a uniform neutral ground." Baking that ground into the
stored image makes it wrong in one theme or the other — a grey chosen for Tissue is a grey
hole in Chalk — and re-theming later would mean reprocessing every photograph.

**Applied 2026-11-04:** FR-4.1 and NFR-3.7 now require the normalised image to be stored with
an **alpha channel**, with the ground supplied by the `cut` theme token and composited at
render. The normalised file is therefore not a JPEG, and thumbnails of it keep their
transparency.

### 5.2 WCAG 2.1 AA contrast — measured, and three failures fixed

Computed with the WCAG relative-luminance formula, not asserted. Body text needs 4.5:1,
large text and UI boundaries 3:1.

| Pair | Khadi | Tissue | Chalk | Indigo | Need |
|---|---|---|---|---|---|
| ink on ground | 10.92 | 13.07 | 14.10 | 14.15 | 4.5 |
| ink on surface | 12.55 | 14.78 | 12.39 | 12.43 | 4.5 |
| dim on ground | **4.57** | **4.52** | 5.97 | 5.56 | 4.5 |
| dim on surface | 5.25 | **5.11** | 5.25 | 4.88 | 4.5 |
| accent on ground | 5.49 | 7.13 | 7.33 | 7.05 | 3.0 |
| accent on surface | 6.31 | 8.07 | 6.45 | 6.19 | 3.0 |
| accentInk on accent | 6.31 | 8.83 | 7.25 | 7.05 | 4.5 |
| ink on cut | 9.44 | 11.38 | 11.12 | 11.01 | 4.5 |

**Three failures were found and fixed.** Muted text failed on both light themes — Khadi 3.99,
Tissue 3.85 on ground and 4.35 on surface. `dim` darkened: Khadi `#6F6C5E` → `#666355`,
Tissue `#7A716D` → `#6F6662`. Bold cells are the repaired values. All four themes now pass
every pair.

NFR-8.1 now requires this as a standing automated assertion over the token set — plan 1
Task 14 Step 1. Measuring once is how it broke in the first place.

### 5.3 44x44 tap targets — hit area decoupled from drawn size

Filter chips, segmented switches and tabs are drawn 24–30px tall by design, and should stay
that way; a 44px chip strip would eat the screen.

**Resolved:** visual size and hit area are separate concerns. A shared `HitArea` component
guarantees 44x44 via padding or an overlay without changing the drawn size, and chips, tabs
and switches use it rather than each re-implementing it. Written into NFR-8.2 and built in
plan 1 Task 14 Step 8.

### 5.4 Light and dark — four themes reconciled with the device setting

Four themes is more than the spec asked for, so pairing is how it satisfies "honours the
device's light and dark appearance setting": **Match my device** is the default and resolves
to Khadi or Chalk; Tissue pairs with Indigo; a pinned theme holds in both. Written into
NFR-8.5 and tested in plan 1 Task 14 Step 5.

### 5.5 Alternative text — a formula, not an improvisation

Name if set, else derived name, then Category and Colour tags: *"Linen shirt, a beige
shirt."* Written into NFR-8.3; `altTextFor` is built in plan 1 Task 15 with tags optional, so
plan 2 adds data rather than changing a signature.

### 5.6 Progressive loading — satisfied by the geometry

Every chip has a fixed aspect ratio (`3:4`) or fixed pixel size, so lazy-loaded images
reserve their space and the grid never reflows as photographs arrive. Asserted in plan 1
Task 15.

### 5.7 Plain-language errors — now complete

Previously partial. Designed states now exist for: a cap reached, a provider refusing a key
mid-session with the cause named, a failed cut-out, a load failure, signup refused, a wrong
password, an unfinished bulk session, and each distinct provider error.

**One shortcut recorded:** of the four provider-failure causes — quota, invalid key, rate
limit, unreachable — only quota is drawn. The other three follow the same shape and differ in
the named cause and the offered fix.

---

## 6. Where the design goes beyond the spec

Twelve additions, each because the requirement alone left a hole. None contradicts the spec.

| Addition | Why | Screen |
|---|---|---|
| The sheet states its own filter logic — "pick several within a group to widen; across groups to narrow" | FR-7.4's any-of/all-of rule is invisible and guessed wrong | Filter sheet |
| A dropped category is named | with filters on, a vanished band reads as a bug | Filters applied |
| Creating a tag hands you into tagging | a new tag matches zero pieces, so filtering by it looks broken | New tag type |
| Autocomplete shows each tag's description and count | a plain list is how you get *linen*, *Linen* and *linen-ish* | Adding a tag |
| One tag suggests its own merge | nobody goes hunting for duplicates, so merge would never get used | One tag |
| Search says why each row matched | a description match otherwise looks like a bug | Search |
| Nothing-matches prices each way out | an empty result is a dead end without it | Nothing matches |
| Archived pieces show how many outfits each is in | the only place that can tell you which are safe to delete | Archived |
| Category band ordering | eight bands in a fixed order is a layout call the user is better placed to make | Sorting |
| Usage meters in settings | a cap you cannot see coming is one you hit mid-session | Settings |
| Per-photo price stated before a bulk cut-out and a batch autofill | the spec requires a count; the price is what governs the decision | Before cutting out, Before a batch |
| Outfits filterable by what they do **not** contain | nearly free, and the only way to answer "which outfits am I missing shoes for" | Filtering outfits |

### Two decisions worth challenging

- **Autofill review ticks existing tags by default and leaves new or replacing ones
  unticked.** Untick everything and a correct six-tag result costs six taps; tick everything
  and autofill writes your vocabulary unasked. This line — ticked for what exists, unticked
  for what is new or destructive — is the whole safety model of the feature.
- **Batch review groups by suggested tag, not by piece.** Thirty-four pieces one at a time is
  thirty-four decisions and nobody finishes. Grouping makes it about eight. The cost is
  precision: fixing one wrong tag on one garment becomes a second pass. The per-piece screen
  still exists for a single garment.

---

## 7. Changes applied to other documents

All applied on 2026-11-04.

| Document | Change |
|---|---|
| Spec FR-4.1 | normalised image stored as an alpha cutout; ground supplied by the theme, never baked |
| Spec NFR-3.7 | pipeline stores a format carrying alpha; thumbnails keep transparency |
| Spec NFR-8.1 | contrast ratios named (4.5 / 3.0) and required as an automated assertion over every theme |
| Spec NFR-8.2 | visual size and hit area decoupled; a property of the shared components |
| Spec NFR-8.3 | the alt-text formula stated |
| Spec NFR-8.5 | four themes, their pairing, and "Match my device" as the default |
| Plan 1 header | links this document; Task 14 named as where the token system lands |
| Plan 1 Task 14 | was one step saying "define the theme tokens". Now its own task: the four palettes, the contrast assertion, the paired theme provider, type and geometry, and `HitArea`. Ten steps |
| Plan 1 Task 15 | the wardrobe grid, split out of the old Task 14; adds the alt-text formula, the fixed-ratio assertion, the themed cutout plate, and the designed empty and failure states |
| Plan 1 Tasks 16–18 | renumbered from 15–17 |

### Still to carry into plans 2, 3 and 4

The screens exist; the tasks do not, because those plans are not written yet.

- **Plan 2** — editing a piece, adding a tag with autocomplete, several photographs, archive
  and restore and delete, the four vocabulary screens, search, sorting, nothing-matches.
- **Plan 3** — the seven autofill states, adding and ordering keys, stale test results, what a
  piece cost, cut-out or original, cut-out failed, before cutting out a batch.
- **Plan 4** — building an outfit, editing an outfit, filtering outfits by contents.

Plan 1 also gains eight designed screens its existing tasks already build blind: signup and
its refused state, check-your-email, sign in, reset, new password, the privacy statement
(Task 6 Step 5), settings and account deletion (Task 17), empty wardrobe and cap reached
(Tasks 15 and 13), could-not-load, and resuming a bulk session (Task 16).

---

## 8. Open questions

Both have a working answer, so nothing is blocked.

1. **Outfit treatment** — Flat lay is the design's call. Moodboard or Colour story instead
   would change the outfit library and the hero of the single-outfit screen.
2. **Default theme** — Khadi, via "Match my device". All four ship either way.

---

## 9. Honest notes on the mockups

- **Garments are drawn outlines, not photographs.** Real photographs read denser and noisier.
  The densest state — Everything, three to a row — is most likely to need revisiting once
  real cutouts exist.
- **The swatch chip depends on a tag that may be missing or plural.** FR-5.1 allows any tag
  to be empty and FR-5.3 allows several colours. Two states are not drawn: **no Colour tag**,
  which falls back to the `cut` ground, and **several Colour tags**, where the field takes the
  first and a narrow second band carries the next. Both are the design's calls; both need
  drawing in plan 2.
- **Only one of four provider-failure screens is drawn** (§5.7).
- **Two lists on "Order and turning off"** duplicates each key on screen. It looks redundant
  until a key is first for cutting out and switched off for reading tags — and the tidier
  single list with per-capability badges hides exactly what the screen is opened to check.

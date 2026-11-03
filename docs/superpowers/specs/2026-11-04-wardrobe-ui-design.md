# Digital Wardrobe — UI Design

**Date:** 2026-11-04
**Status:** Direction settled; coverage audited against the requirements, with gaps listed
**Implements:** [2026-11-03-digital-wardrobe-design.md](2026-11-03-digital-wardrobe-design.md)
**Mockups:** Swatch Deck — https://claude.ai/code/artifact/5236e02f-4ecd-4ba9-a205-6631a15e6e2d
**Rejected alternatives:** Four Wardrobes — https://claude.ai/code/artifact/de649631-4fa1-4af3-967e-41ec904f19b0

---

## 1. The direction

**Swatch Deck.** Chosen from four pitched directions (Care Label, Swatch Deck, Pattern Paper,
The Rail), all preserved in the second link above.

The device: **every piece is a swatch chip — a field of that garment's own colour, with the
garment cut out of it.** Pieces are grouped into bands by category. Colour is not decoration
anywhere in this interface; a coloured field always means the garment is that colour.

This was re-cut once. The first version banded by *colour*, which made colour the index and
demoted every other dimension to a filter — and gave a colour you own two of a whole band to
itself. Banding by category and moving colour onto the chip keeps the deck's look while putting
the dimension you reach for first on the outside, and still answers "do I own a black shirt"
inside the Shirts band.

### Decisions taken without an explicit answer

Both were put to the user twice and left open; recorded here as the design's calls, not theirs.

- **Outfit library treatment: Flat lay**, with Colour story as a density switch past roughly
  thirty outfits. Flat lay is the only one of the three where the arrangement itself carries
  information — whether the outfit works — which is the question that screen is opened to
  answer. Moodboard is the best-looking of the three and the one real photographs will damage
  most: silhouettes at angles read as composed, photographs at angles read as dropped.
- **Default theme: Khadi.** All four ship.

---

## 2. Design system

### 2.1 Colour

Four themes. Each is a complete palette, not a tint of one. Two are light-first, two
dark-first.

| Token | Khadi (default) | Tissue | Chalk | Indigo |
|---|---|---|---|---|
| `--ground` | `#E4E0D2` | `#EBE6E3` | `#1C1D1A` | `#141C2B` |
| `--surface` | `#F2EFE6` | `#F7F4F2` | `#262823` | `#1D2739` |
| `--ink` | `#2A2A24` | `#23201F` | `#EDEAE3` | `#E6EAF2` |
| `--dim` | `#666355` | `#6F6662` | `#9A9A90` | `#8694AB` |
| `--line` | `#CFCABA` | `#D8D1CD` | `#3A3D35` | `#2E3B53` |
| `--accent` | `#35603F` | `#2C4A7C` | `#7FB2C7` | `#C9A227` |
| `--accent-ink` | `#F2EFE6` | `#FFFFFF` | `#13201F` | `#141C2B` |
| `--cut` | `#D6D1BF` | `#DED7D3` | `#2E302A` | `#223047` |

`--cut` is the ground a transparent garment cutout sits on, and the reason it is a token at
all is section 5.1 below.

Themes are grounded in the subject: undyed handloom, pattern tissue, tailor's chalk on wool,
an indigo vat with brass. Deliberately avoided: warm cream with a terracotta accent, and
near-black with a single acid pop.

### 2.2 Type

| Role | Face | Usage |
|---|---|---|
| Screen titles, band names | Bricolage Grotesque 600/800 | tight tracking (`-.03em`), sentence case |
| Everything else | Archivo 400/500/600 | body, labels, controls |
| Keys and measurements only | Spline Sans Mono 400 | masked secrets; nothing decorative |

One display face used with restraint, one workhorse, one for notation. No all-caps labels
anywhere. No face loaded that is not used.

### 2.3 Geometry and spacing

- Corner radius by role, not uniform: `2px` on swatch chips, `3px` on panels and buttons,
  `999px` on filter chips, `22px` on the viewport. A chip and a sheet are different kinds of
  object and should not share a radius.
- Page gutter `14px`; grid gutter `7px`; band spacing `17px`.
- Swatch chips: `3:4` in grids, `74×96` in horizontal fans, `34×44` in list rows.
- Shadow is spent in exactly one place — pieces lifted off an outfit composition. Nowhere else.

### 2.4 Components

| Component | Behaviour |
|---|---|
| Swatch chip | colour field + knocked-out cutout; knockout is dark on fields above 0.45 relative luminance and light below, computed, not hand-picked |
| Category band | name, matching count, "See all *n*" — the count is always the *matching* count, not the total |
| Segmented switch | Categories ↔ Everything; does not reset active filters |
| Filter button | lives in the bar in every wardrobe state; shows a live count when filters are on |
| Active-filter row | removable chips plus one Clear, visible whenever anything is filtered |
| Filter sheet | full-height overlay; the whole vocabulary grouped by type, counts per tag, "not tagged" per group, creation affordances, counted primary action |
| Bottom tabs | Wardrobe, Outfits, Add, Keys |

---

## 3. Screens designed

Eleven states, all in the mockup.

| Screen | State | Serves |
|---|---|---|
| Wardrobe | Categories (landing) | FR-7.1, FR-7.2 |
| Wardrobe | Filter sheet | FR-7.3, FR-7.4, FR-7.5 |
| Wardrobe | Filters applied — bands re-count, empty categories drop out | FR-7.4, FR-7.6 |
| Wardrobe | New tag type (created from the sheet) | FR-5.3, FR-5.6–5.9 |
| Wardrobe | Inside a category | FR-7.2 |
| Wardrobe | Everything (one flat grid) | FR-7.1 |
| One piece | tags grouped by type, description shown, autofill button | FR-7.10, FR-5.14, FR-6.1 |
| Outfits | three treatments compared | FR-11.1, FR-11.2 |
| One outfit | composition, tags, piece rows | FR-9.9 |
| Adding photos | bulk queue with per-photo state and retry | FR-2.3, FR-4.5, FR-4.8 |
| Provider keys | ordered list, per-capability test results | FR-3.3, FR-3.5, FR-3.8–3.13 |

### Three interaction decisions worth recording

- **A vanishing category gets a sentence.** With filters on, categories holding no match are
  removed rather than shown empty — but a disappeared category reads as a bug, so the screen
  names which ones went and why.
- **The filter sheet states its own logic**: "Pick several within a group to widen; pick across
  groups to narrow." FR-7.4's any-of/all-of rule is otherwise invisible and guessed wrong.
- **Creating a tag hands you into tagging.** A new tag matches zero pieces, so filtering by it
  immediately empties the wardrobe. The primary action is "Create and start tagging", not
  "Create".

---

## 4. Verification against the requirements

Every functional requirement, checked against the design. **Covered** means a designed state
shows it. **Partial** means the surface exists but a required behaviour within it is not drawn.
**Not designed** means no screen exists yet — a gap in the design, not in the spec.

### 4.1 Accounts and access (FR-1)

| Req | Status | Note |
|---|---|---|
| FR-1.1 open signup | Not designed | no screen |
| FR-1.2 verify before upload | Not designed | needs a pending-verification state and a blocked-upload message |
| FR-1.3 sign in, out, reset | Not designed | no screens |
| FR-1.4 privacy statement from signup | Not designed | no screen |
| FR-1.5 one wardrobe per account | Covered | implicit; nothing in the UI implies otherwise |
| FR-1.6 private to owner | Covered | no sharing affordance exists anywhere, which is correct |
| FR-1.7 delete account | Not designed | needs a settings screen |

**Six of seven undesigned.** The whole account surface was skipped — the mockups start from a
signed-in wardrobe. This is the largest gap and it belongs to plan 1.

### 4.2 Adding an item (FR-2)

| Req | Status | Note |
|---|---|---|
| FR-2.1 one photo, camera or library | Covered | Adding photos |
| FR-2.2 photo alone is a valid piece | Covered | pieces appear with only auto tags |
| FR-2.3 up to 100, progress, retry, resume | Partial | progress and retry drawn; **resume after leaving is not** |
| FR-2.4 several photos per piece | Not designed | no UI; schema supports it from plan 1 |
| FR-2.5 derived name when unnamed | Partial | names shown, but no state shows the derived placeholder |

### 4.3 Provider credentials (FR-3)

| Req | Status | Note |
|---|---|---|
| FR-3.1 add, replace, remove, validated | Partial | "Add a key" exists; no add/edit form drawn |
| FR-3.2 masked after saving | Covered | `sk-…4f9c` |
| FR-3.3 ordered per capability | Covered | stated in words: "First for both", "Fallback for cutting out" |
| FR-3.4 reorder, relabel, disable, delete | Not designed | no reorder or disable affordance |
| FR-3.5 see what is first per capability | Covered | |
| FR-3.6 fallback narrow and bounded | n/a | not a UI requirement |
| FR-3.7 per-item attempt history | Not designed | "why did this cost three calls" has no screen |
| FR-3.8 test connection per capability | Covered | |
| FR-3.9 says it is billable first | Covered | |
| FR-3.10 timestamped, goes stale | Partial | timestamp drawn; no stale state drawn |
| FR-3.11 test one or all | Covered | "Test every key" |
| FR-3.12 never shown in full | Covered | |
| FR-3.13 states the cost | Covered | per capability |
| FR-3.14 app works with no credential | Not designed | **no no-key state anywhere** |
| FR-3.15 capability scoping honoured | Covered | "Reading tags not enabled" |

### 4.4 Image normalisation (FR-4)

| Req | Status | Note |
|---|---|---|
| FR-4.1 every garment photo normalised | Covered | the chip device depends on it |
| FR-4.2 matting never generative | n/a | not a UI requirement |
| FR-4.3 no credential, originals shown | Not designed | |
| FR-4.4 original always retained | Covered | "Show original photo" |
| FR-4.5 asynchronous, never blocks | Covered | "Cut out after upload" |
| FR-4.6 see both, choose, re-run | Partial | can view the original; **cannot choose or re-run** |
| FR-4.7 failure keeps the original | Not designed | no failed-cutout state |
| FR-4.8 see what is processing | Covered | queue states |
| FR-4.9 normalised used in grids | Covered | |
| FR-4.10 switch off per account | Not designed | needs settings |
| FR-4.11 bulk states the count first | Partial | count shown while running, not before starting |

### 4.5 Tag types and tags (FR-5)

| Req | Status | Note |
|---|---|---|
| FR-5.1 one mechanism | Covered | built-ins and custom types are indistinguishable in the sheet |
| FR-5.2 built-ins shipped pre-populated | Covered | |
| FR-5.3 create, rename, reorder, delete types | Covered | New tag type; Manage all tags |
| FR-5.4 hide a built-in type | Partial | named in Manage all tags, not drawn |
| FR-5.5 create tags inside any type | Covered | "+ new fabric" chips, shipped types included |
| FR-5.6 name, type, description | Covered | the form asks in plain words and says why |
| FR-5.7 one value or several | Covered | |
| FR-5.8 items, outfits, or both | Covered | |
| FR-5.9 autofill may suggest / may invent | Covered | two separate switches |
| FR-5.10 create a tag inline while tagging | Not designed | the piece screen is read-only in the mockup |
| FR-5.11 autocomplete from existing tags | Not designed | |
| FR-5.12 rename, delete, move, merge | Partial | named in Manage all tags, not drawn |
| FR-5.13 editable at any point | Not designed | no edit mode on a piece |
| FR-5.14 shows machine-derived vs set | Covered | dashed outline for auto-filled |
| FR-5.15 browse the whole vocabulary | Partial | entry point drawn, screen not |
| FR-5.16 private to the account | Covered | |

### 4.6 Autofill (FR-6)

| Req | Status | Note |
|---|---|---|
| FR-6.1 user-triggered | Covered | button on the piece |
| FR-6.2 requires a credential | Partial | no inactive state drawn |
| FR-6.3 uses the user's vocabulary and descriptions | Covered | the piece screen says the description is what autofill reads |
| FR-6.4 reads the normalised image | n/a | not a UI requirement |
| FR-6.5 may propose a new tag, marked as new | Not designed | |
| FR-6.6 review before saving | Not designed | |
| FR-6.7 re-runnable | Covered | |
| FR-6.8 batch, with the count first | Not designed | |
| FR-6.9 failure leaves the piece alone | Not designed | |
| FR-6.10 distinct provider errors | Not designed | |
| FR-6.11 progress visible | Not designed | |
| FR-6.12 says which types were considered | Not designed | |

**Eight of twelve undesigned.** Autofill has a button and nothing behind it. The
accept/change/discard review in FR-6.6 is the single most important missing screen in the
document: it is where the user's vocabulary either gets applied correctly or silently wrong.

### 4.7 Browsing, filtering, search (FR-7)

| Req | Status | Note |
|---|---|---|
| FR-7.1 grid, newest first | Covered | |
| FR-7.2 filter by structured tags | Covered | |
| FR-7.3 one surface, grouped by type | Covered | filter sheet |
| FR-7.4 any-of within, all-of across | Covered | and stated on screen |
| FR-7.5 filter for untagged | Covered | "not tagged" per group |
| FR-7.6 removable chips, clear | Covered | |
| FR-7.7 match count and empty state | Partial | count drawn; **no-matches state not** |
| FR-7.8 text search over names, tags, descriptions | Not designed | **no search affordance anywhere** |
| FR-7.9 sort by date and name | Not designed | |
| FR-7.10 piece detail | Covered | |
| FR-7.11 outfits containing this piece | Covered | "In outfits" |
| FR-7.12 filters addressable by URL | n/a | not a visual requirement |

### 4.8 Editing and removing (FR-8)

| Req | Status | Note |
|---|---|---|
| FR-8.1 edit name, photos, tags | Not designed | |
| FR-8.2 archive | Not designed | |
| FR-8.3 view and restore archived | Not designed | |
| FR-8.4 delete, naming affected outfits | Not designed | |

**All four undesigned.** Every piece in the mockup is read-only.

### 4.9 Outfits (FR-9, FR-11)

| Req | Status | Note |
|---|---|---|
| FR-9.1 a named set of pieces | Covered | |
| FR-9.2 build by selecting, with filters | Not designed | no builder screen |
| FR-9.3 two or more, reusable across outfits | Covered | |
| FR-9.4 name, with a placeholder | Partial | names shown, no placeholder state |
| FR-9.5 outfit tags from the shared vocabulary | Covered | |
| FR-9.6 add, remove, rename at any time | Partial | buttons exist, flows not drawn |
| FR-9.7 cover photo | Not designed | |
| FR-9.8 delete without deleting pieces | Not designed | |
| FR-9.9 detail lists pieces, each openable | Covered | |
| FR-11.1 library with name, tags, summary | Covered | three treatments |
| FR-11.2 filter by tag, search by name | Partial | tag chips drawn; search not |
| FR-11.3 filter by the tags of pieces inside | Not designed | |
| FR-11.4 sort | Not designed | |

FR-10 (outfit from a photo of yourself) is Phase 2 and correctly absent.

### 4.10 Phone access (FR-12)

| Req | Status | Note |
|---|---|---|
| FR-12.1 every capability on a phone | Covered | designed at 320px first; no desktop-only surface |
| FR-12.2 camera directly | Covered | |
| FR-12.3 session persists | n/a | no UI |
| FR-12.4 same wardrobe on any device | n/a | no UI |

---

## 5. Verification against the non-functional requirements

Only the ones the UI can satisfy or break.

### 5.1 NFR-3.7, NFR-8.5 — the cutout ground must be a token, not a baked pixel

**This design changes a spec requirement.** FR-4.1 says the garment is "placed on a uniform
neutral ground." Baking that ground into the stored image makes it wrong in one theme or the
other — a grey chosen for Tissue is a grey hole in Chalk — and re-theming later would mean
reprocessing every photograph.

**Required change:** normalisation stores an **alpha cutout**; the ground is the `--cut` theme
token, composited in CSS. FR-4.1 and NFR-3.7 should be amended before any code renders a
cutout. Demonstrated at the foot of the Four Wardrobes mockup.

### 5.2 NFR-8.1 — WCAG 2.1 AA contrast, measured

Computed, not asserted. Body text needs 4.5:1, large text and UI boundaries 3:1.

| Pair | Khadi | Tissue | Chalk | Indigo | Need |
|---|---|---|---|---|---|
| ink on ground | 10.92 | 13.07 | 14.10 | 14.15 | 4.5 |
| ink on surface | 12.55 | 14.78 | 12.39 | 12.43 | 4.5 |
| dim on ground | **4.57** | **4.52** | 5.97 | 5.56 | 4.5 |
| dim on surface | 5.25 | 5.11 | 5.25 | 4.88 | 4.5 |
| accent on ground | 5.49 | 7.13 | 7.33 | 7.05 | 3.0 |
| accent-ink on accent | 6.31 | 8.83 | 7.25 | 7.05 | 4.5 |
| ink on cutout ground | 9.44 | 11.38 | 11.12 | 11.01 | 4.5 |

**Three failures were found and fixed.** Muted text failed on both light themes — Khadi 3.99,
Tissue 3.85 on ground and 4.35 on surface. `--dim` darkened: Khadi `#6F6C5E` → `#666355`,
Tissue `#7A716D` → `#6F6662`. The bolded cells are the repaired values. All four themes now
pass every pair.

The build must keep this honest: a contrast assertion over the token set, run in CI, so a
future palette tweak cannot quietly reintroduce this.

### 5.3 NFR-8.2 — 44×44pt tap targets

**At risk.** Filter chips, segmented switches and tab items are visually 24–30px tall by
design, and should stay that way — a 44px-tall chip strip would eat the screen.

**Build rule:** visual height and hit area are decoupled. Every interactive element gets at
least 44×44 of hit area via padding or a `::before` overlay, regardless of its drawn size.
This cannot be left to each component's author; it belongs in the shared chip, tab and switch
components.

### 5.4 NFR-8.5 — honouring the device's light and dark setting

Four themes is a choice the spec did not ask for, and it has to reconcile with "honours the
device's light and dark appearance setting."

**Resolution:** themes pair. The theme setting offers five options — Khadi, Tissue, Chalk,
Indigo, and **Match my device**, which is the default. Matching pairs Khadi (light) with Chalk
(dark) and Tissue (light) with Indigo (dark), following `prefers-color-scheme`. Choosing a
named theme pins it in both.

### 5.5 NFR-8.3 — alternative text

**Formula, so it is not improvised per component:** the piece's name if set, otherwise its
derived name, then its Category and Colour tags. "Linen shirt, a beige shirt." Plan 1 derives
from the name alone, since tags do not exist until plan 2.

### 5.6 NFR-2.6 — progressive image loading

**Satisfied by the geometry.** Every chip has a fixed aspect ratio (`3:4`) or fixed pixel size
(`74×96`, `34×44`), so lazy-loaded images reserve their space and the grid never reflows as
photographs arrive.

### 5.7 NFR-5.8 — errors in plain language

**Partial.** The queue's "Retrying 2 of 3" is right in spirit, and the keys screen distinguishes
failure reasons. But no error state is designed for: a cap reached, a provider rejecting a key
mid-session, a failed cutout, or a page that could not load. Listed in section 6.

### 5.8 NFR-7.3 — cap reached

**Not designed.** "Existing content is never deleted or degraded" and the user must be told
which limit they hit. There is no screen for this.

---

## 6. Gaps, and where they belong

Roughly eighteen screens and states remain undesigned. Grouped by the plan that needs them.

### Plan 1 — foundation, accounts, capture

1. **Signup, sign in, password reset, pending verification** — FR-1.1, 1.2, 1.3.
2. **Privacy statement page** — FR-1.4. Plan 1 Task 6 Step 5 already creates it; it needs a design.
3. **Settings, including account deletion** — FR-1.7.
4. **Empty wardrobe** — FR-7.7. The first thing every new user sees, and currently undesigned.
5. **Cap reached** — NFR-7.3.
6. **Could not load, with a retry** — NFR-5.8.
7. **Derived-name placeholder** — FR-2.5.
8. **Resume after leaving a bulk session** — FR-2.3. Note the real constraint: `File` objects
   cannot be persisted, so a resumed entry must show as needing reselection rather than
   silently vanishing.

### Plan 2 — vocabulary, filtering, editing

9. **Edit mode on a piece** — add, change, remove tags; FR-5.13, FR-8.1.
10. **Inline tag creation while tagging, with autocomplete** — FR-5.10, FR-5.11.
11. **Manage all tags** — rename, move, merge, delete, hide a built-in, edit descriptions;
    FR-5.4, FR-5.12, FR-5.15. The entry point is drawn; the screen is not.
12. **No matches** — FR-7.7.
13. **Search and sort** — FR-7.8, FR-7.9, FR-11.2, FR-11.4. No search affordance exists
    anywhere, and it is a stated requirement over names, tag names *and* tag descriptions.
14. **Archive, restore, and delete with the affected outfits named** — FR-8.2, 8.3, 8.4.
15. **Several photos on one piece** — FR-2.4.

### Plan 3 — credentials, normalisation, autofill

16. **Autofill review** — single and batch, with proposed tags accepted, changed or discarded,
    new tags marked as new, in-progress and failure states, and the note saying which types
    were considered. FR-6.5, 6.6, 6.8, 6.9, 6.10, 6.11, 6.12. **Highest priority of all the
    gaps:** this is where the user's vocabulary is either applied correctly or quietly wrong.
17. **No-credential states** — FR-3.14, FR-4.3, FR-6.2. The app must be visibly whole without
    a key, and nothing designed so far shows that.
18. **Credential add and edit form, reorder, disable, stale test result** — FR-3.1, 3.4, 3.10.
19. **Per-piece provider attempt history** — FR-3.7.
20. **Normalisation controls on a piece** — choose normalised or original, re-run, failed state
    — FR-4.6, 4.7; and the account switch — FR-4.10.
21. **Bulk pre-flight count before spending** — FR-4.11.

### Plan 4 — outfits

22. **Outfit builder** — select pieces with the wardrobe's own filters and search; FR-9.2.
23. **Outfit cover photo, delete, rename flows** — FR-9.4, 9.6, 9.7, 9.8.
24. **Filter outfits by the tags of the pieces inside them** — FR-11.3.

---

## 7. What changes in the existing documents

- **Spec FR-4.1 and NFR-3.7** — amend to require an alpha cutout with the ground supplied as a
  theme token (section 5.1). Do this before plan 3.
- **Spec NFR-8.5** — add the theme-pairing rule and "Match my device" as the default
  (section 5.4).
- **Plan 1, Task 14** — replace "define the theme tokens" with the four palettes in section
  2.1, the type roles in 2.2, the geometry in 2.3, the hit-area rule in 5.3, the alt-text
  formula in 5.5, and a CI contrast assertion over the token set.
- **Plan 1** — add the eight screens in section 6 to its scope. Six of them are account
  screens that Tasks 6, 7 and 16 already build without a design.
- **Plan 2 and plan 3 scopes** — carry items 9–21 when those plans are written.

## 8. Open questions for the user

1. **Outfit treatment** — Flat lay is the design's call (section 1). Say so if it should be
   Moodboard or Colour story instead; it changes the outfit library and the hero of the
   single-outfit screen.
2. **Default theme** — Khadi. All four ship either way.

## 9. Two honest notes on the mockup

- **Garments are drawn outlines, not photographs.** Real photographs will read denser and
  noisier than silhouettes. The densest state — Everything, three to a row — is the one most
  likely to need revisiting once real cutouts exist.
- **The swatch chip depends on a tag that may be missing or plural.** FR-5.1 says any tag may
  be empty, and FR-5.3 says a piece may carry more than one colour. So the chip needs two
  states the mockup does not show: no Colour tag, which falls back to the `--cut` ground; and
  several Colour tags, where the field takes the first and a narrow second band carries the
  next. Both are the design's calls and both need drawing in plan 2.

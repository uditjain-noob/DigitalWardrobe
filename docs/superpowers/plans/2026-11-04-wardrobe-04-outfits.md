# Wardrobe Plan 4 of 4: Outfits — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combinations that worked are kept, browsable, and recallable — the last of the three moments the spec was written for.

**Architecture:** An outfit is a named set of items, not a template: no slots, no required positions. It reuses everything already built — plan 2's tag vocabulary for outfit tags, plan 2's `queryItems` for the builder's filters and for "outfits containing a piece that is X", plan 3's `displayVersionFor` for every piece image. The one genuinely new piece of machinery is the **flat-lay composition**: a pure function mapping a set of pieces to positions on a square, which both the library card and the single-outfit hero render from, so an outfit always looks the same wherever it appears.

**Tech Stack:** As plans 1–3. No new dependencies — the composition is CSS positioning over transparent cutouts, not image generation.

**Spec:** [docs/superpowers/specs/2026-11-03-digital-wardrobe-design.md](../specs/2026-11-03-digital-wardrobe-design.md)
**UI design:** [docs/superpowers/specs/2026-11-04-wardrobe-ui-design.md](../specs/2026-11-04-wardrobe-ui-design.md) — Flat lay is the chosen treatment; Moodboard and Colour story are recorded alternatives.
**Follows:** [plan 1](2026-11-03-wardrobe-01-foundation-and-capture.md), [plan 2](2026-11-04-wardrobe-02-vocabulary-and-filtering.md), [plan 3](2026-11-04-wardrobe-03-providers-and-autofill.md).

**Scope:** Spec sections 6.9 and 6.11, plus the two requirements plan 2 left reduced. **Not** here: section 6.10, outfits from a photograph of yourself — that is Phase 2 and is not built. Task 2 leaves the seam it will use.

This plan completes plan 2's two deferrals:
- **FR-8.2** an archived piece stays attached to its outfits — enforced and tested here.
- **FR-8.4** permanent deletion names the affected outfits — `previewDeleteItem`'s
  `affectedOutfits` array is populated here. The confirmation component already reads it.

## Global Constraints

Plans 1–3's constraints still apply. Additional values from the spec:

- **FR-9.1** "A named set of items… It is a set, not a template: there are no fixed slots, and nothing requires one top and one bottom."
- **FR-9.3** "An outfit can contain **two or more** items. The same item can belong to any number of outfits."
- **FR-9.5** Outfit tags come from the types marked as applying to outfits (FR-5.8), from the same vocabulary as items.
- **FR-9.7** A cover photo may be attached. "Outfit cover photos are not normalised; FR-4.1 applies to garment photos, not photos of people."
- **FR-9.8** "Deleting an outfit does not delete the items in it."
- **FR-11.1** The library shows name, tags, and a visual summary "built from normalised item images so the summary reads as one piece".
- **FR-11.3** Outfits can be filtered "by the tags of the pieces they contain".
- **NFR-4.5** Photographs of people attached to outfits "are not sent anywhere".
- **NFR-6.1** Several hundred outfits per account.
- **NFR-6.2** The outfit library stays within NFR-2's targets at that scale.

## Review Focus

1. **An outfit whose every piece has been archived.** Expected: still in the library, still renders, and says its pieces are archived — the outfit is a record of something that happened and must not silently empty. → Task 5, Task 8.
2. **A piece in four outfits, deleted permanently.** Expected: all four updated, the confirmation names all four with their resulting counts, and an outfit reduced below two pieces is handled by an explicit rule rather than becoming invalid data. → Task 6.
3. **A flat lay containing two pieces of the same category, or a category with no anatomical position** — two shirts, or an accessory. Expected: deterministic, non-overlapping placement; never two pieces stacked exactly on top of each other. → Task 7.
4. **Filtering outfits by "does not contain X" where an outfit has no tags at all.** Expected: it matches — an outfit with nothing in it certainly does not contain X. The naive `NOT EXISTS` join gets this right and a `NOT IN` subquery over tag ids does not. → Task 5.
5. **An outfit cover photograph.** Expected: never enqueued for normalisation, never sent to a provider, and still deleted with the outfit. → Task 4.

---

### Task 1: Outfit tables and lifecycle

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/features/outfits/manage.ts`
- Test: `tests/features/outfits/manage.test.ts`

**Interfaces:**
- Consumes: `db`, `items`, `Result`.
- Produces: `type Outfit = { id: string; userId: string; name: string | null; displayName: string; coverPhotoId: string | null; createdAt: string }`; `createOutfit(input: { userId: string; name?: string; itemIds: string[] }): Promise<Result<{ outfitId: string }, 'too_few_items' | 'item_not_found' | 'outfit_cap_reached'>>`; `renameOutfit(input: { userId: string; outfitId: string; name: string | null }): Promise<Result<Outfit, 'not_found'>>`; `deleteOutfit(input: { userId: string; outfitId: string }): Promise<Result<void, 'not_found'>>`; `getOutfit(input: { userId: string; outfitId: string }): Promise<Result<Outfit & { items: ItemSummary[]; tags: TagOnItem[] }, 'not_found'>>`. `outfits` table: the fields above. `outfitItems`: `outfitId`, `itemId`, `position`, PK `(outfitId, itemId)`. `outfitTags`: `outfitId`, `tagId`, PK `(outfitId, tagId)`.

- [ ] **Step 1: Write the failing test**

```ts
it("creates an outfit from three pieces", async () => { expect(r.ok).toBe(true); });
it("refuses fewer than two pieces", async () => { expect(r.error).toBe("too_few_items"); }); // FR-9.3
it("refuses a piece belonging to another user", async () => { expect(r.error).toBe("item_not_found"); });
it("allows the same piece in several outfits", async () => { expect(r.ok).toBe(true); }); // FR-9.3
it("allows two outfits with the same name", async () => { expect(r.ok).toBe(true); });
it("falls back to a date-based display name when unnamed", async () => {
  expect(o.displayName).toMatch(/^Outfit, /);
}); // FR-9.4
it("renaming to null restores the placeholder", async () => { expect(o.displayName).toMatch(/^Outfit, /); });
it("refuses creation at the outfit cap", async () => { expect(r.error).toBe("outfit_cap_reached"); });
// FR-9.8
it("deleting an outfit keeps every piece", async () => {
  await deleteOutfit({ userId, outfitId });
  expect(await db.select().from(items)).toHaveLength(3);
});
it("deleting an outfit removes its membership and tag rows", async () => { ... });
it("getOutfit returns pieces in their stored order", async () => { expect(ids).toEqual([a, b, c]); });
it("refuses another user's outfit", async () => { expect(r.error).toBe("not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/outfits/manage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add the three tables, extend `env` with `MAX_OUTFITS_PER_ACCOUNT`, generate the migration**

- [ ] **Step 4: Implement the four functions**

`displayName` mirrors plan 2's `derivedName` pattern: the set name, else a date placeholder.
The two-piece minimum is enforced on creation here and on removal in Task 2 — the only two
places it can be violated.

- [ ] **Step 5: Extend `deleteAccount` to purge outfits**

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/features/outfits/manage.test.ts tests/features/accounts/delete.test.ts`
Expected: PASS, 12 new tests plus plan 1's deletion tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: outfit tables, creation, renaming and deletion"
```

---

### Task 2: Membership

**Files:**
- Create: `src/features/outfits/membership.ts`
- Test: `tests/features/outfits/membership.test.ts`

**Interfaces:**
- Consumes: `outfitItems`, `items`.
- Produces: `addPieces(input: { userId: string; outfitId: string; itemIds: string[] }): Promise<Result<void, 'not_found' | 'item_not_found'>>`; `removePieces(input: { userId: string; outfitId: string; itemIds: string[] }): Promise<Result<void, 'not_found' | 'would_leave_too_few'>>`; `reorderPieces(input: { userId: string; outfitId: string; orderedItemIds: string[] }): Promise<Result<void, 'not_found' | 'incomplete_order'>>`; `outfitsContaining(input: { userId: string; itemId: string }): Promise<Array<{ id: string; displayName: string; pieceCount: number }>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("adds a piece to an existing outfit", async () => { expect(pieces).toHaveLength(4); }); // FR-9.6
it("adding a piece already in the outfit is idempotent", async () => { expect(pieces).toHaveLength(3); });
it("removes a piece", async () => { expect(pieces).toHaveLength(2); });
it("refuses a removal that would leave fewer than two", async () => {
  expect(r.error).toBe("would_leave_too_few");
}); // FR-9.3
it("reorders pieces", async () => { expect(ids).toEqual([c, a, b]); });
it("refuses a reorder that omits a piece", async () => { expect(r.error).toBe("incomplete_order"); });
it("outfitsContaining lists every outfit a piece is in, with counts", async () => {
  expect(r).toHaveLength(4);
  expect(r[0].pieceCount).toBe(3);
}); // FR-7.11
it("outfitsContaining includes outfits where the piece is archived", async () => { expect(r).toHaveLength(1); }); // FR-8.2
it("refuses another user's outfit", async () => { expect(r.error).toBe("not_found"); });
it("refuses adding another user's piece", async () => { expect(r.error).toBe("item_not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/outfits/membership.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the four functions**

`position` is dense and reassigned on every write, so the flat lay's ordering is stable.

**The Phase 2 seam:** `addPieces` takes an array, which is what a future outfit-from-a-photo
flow needs — it proposes several pieces at once and creates the outfit in one call. Nothing
else is built for it, and nothing here assumes outfits are only ever assembled by hand.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/outfits/membership.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: outfit membership with a two-piece floor"
```

---

### Task 3: Outfit tags

**Files:**
- Create: `src/features/outfits/tagging.ts`
- Test: `tests/features/outfits/tagging.test.ts`

**Interfaces:**
- Consumes: `outfitTags`, `tagTypes`, `tags`, plan 2's tag functions.
- Produces: `addOutfitTag(input: { userId: string; outfitId: string; tagId: string }): Promise<Result<void, 'not_found' | 'tag_not_found' | 'type_not_for_outfits' | 'needs_replace'>>`; `replaceOutfitTag(input: { userId: string; outfitId: string; tagTypeId: string; tagId: string | null }): Promise<Result<void, 'not_found' | 'tag_not_found' | 'type_not_for_outfits'>>`; `removeOutfitTag(input: { userId: string; outfitId: string; tagId: string }): Promise<Result<void, 'not_found'>>`; `listOutfitTags(input: { userId: string; outfitId: string }): Promise<Result<Record<string, TagOnItem[]>, 'not_found'>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("tags an outfit from a type marked for outfits", async () => { expect(r.ok).toBe(true); }); // FR-9.5
it("refuses a tag from an items-only type", async () => {
  expect((await addOutfitTag({ userId, outfitId, tagId: shirtCategoryTag })).error)
    .toBe("type_not_for_outfits");
}); // FR-5.8
it("accepts a tag from a both type", async () => { expect(r.ok).toBe(true); });
it("honours one-or-several on an outfit type", async () => { expect(r.error).toBe("needs_replace"); });
it("replaceOutfitTag swaps a one-value type", async () => { ... });
it("shares the vocabulary with items — renaming a tag renames it here", async () => {
  await updateTag({ userId, tagId, patch: { name: "voyage" } });
  expect(outfitTagNames).toContain("voyage");
});
it("deleting a tag removes it from outfits too", async () => { expect(outfitTagNames).toHaveLength(0); }); // FR-5.12
it("merging two tags merges them on outfits, counting a shared outfit once", async () => { ... });
it("listOutfitTags omits types not marked for outfits", async () => { expect(keys).not.toContain(categoryId); });
it("listOutfitTags includes outfit types the outfit has nothing in", async () => { expect(keys).toContain(occasionId); });
it("refuses another user's outfit or tag", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/outfits/tagging.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the four functions**

Deliberately parallel to plan 2's `src/features/items/tagging.ts`, including the
`'needs_replace'` contract — one shared vocabulary means two call sites with the same rules,
and the rules must not drift. Plan 2's `deleteTag` and `mergeTags` already cascade here
because `outfitTags` references `tags`; the tests above prove it rather than assume it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/outfits/tagging.test.ts tests/features/vocabulary/tags.test.ts`
Expected: PASS, 11 new tests plus plan 2's tag tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: outfit tags from the shared vocabulary, honouring per-type rules"
```

---

### Task 4: Cover photographs

**Files:**
- Create: `src/features/outfits/cover.ts`, `src/app/api/outfits/[outfitId]/cover/route.ts`
- Test: `tests/features/outfits/cover.test.ts`

**Interfaces:**
- Consumes: `decodeUpload`, `renderDisplay`, `renderThumbnail`, `getObjectStore`, `checkCaps`.
- Produces: `setCoverPhoto(input: { userId: string; outfitId: string; bytes: Buffer }): Promise<Result<{ photoId: string }, 'not_found' | 'too_large' | 'unsupported_format' | 'corrupt_image' | 'storage_cap_reached'>>`; `removeCoverPhoto(input: { userId: string; outfitId: string }): Promise<Result<void, 'not_found'>>`; `coverKey(userId: string, outfitId: string, version: 'display' | 'thumb'): string`.

- [ ] **Step 1: Write the failing test**

```ts
it("stores a cover photograph and points the outfit at it", async () => { expect(o.coverPhotoId).toBeTruthy(); });
it("reuses the upload validation and size limit", async () => { expect(r.error).toBe("unsupported_format"); });
it("counts against the storage cap", async () => { expect(r.error).toBe("storage_cap_reached"); });
// Review Focus 5 — FR-9.7, NFR-4.5
it("never enqueues normalisation for a cover photograph", async () => {
  await setCoverPhoto({ userId, outfitId, bytes: fixture("person.jpg") });
  expect(queue.enqueued).toHaveLength(0);
});
it("never sends a cover photograph to a provider", async () => { expect(fake.totalCalls).toBe(0); });
it("stores no cutout version for a cover", async () => {
  expect(await store.exists(coverKey(userId, outfitId, "display"))).toBe(true);
  expect(await store.list(`users/${userId}/outfits/${outfitId}/`).then(k => k.filter(x => x.includes("cutout"))))
    .toHaveLength(0);
});
it("replacing the cover deletes the previous objects", async () => { ... });
it("removing the cover clears the pointer and deletes the objects", async () => { expect(o.coverPhotoId).toBeNull(); });
it("deleting the outfit deletes its cover objects", async () => { expect(keys).toHaveLength(0); });
it("account deletion removes cover photographs", async () => { ... }); // NFR-4.6
it("serves a cover only to its owner", async () => { expect(res.status).toBe(404); });
it("refuses another user's outfit", async () => { expect(r.error).toBe("not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/outfits/cover.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three functions and the route**

Covers live under `users/{userId}/outfits/{outfitId}/` — a separate prefix from garment
photographs, which is the structural reason a cover can never be picked up by a normalisation
sweep. They reuse plan 1's decode, resize, thumbnail and the stable-URL-plus-signed-redirect
pattern, and nothing else.

Review Focus 5 is the whole point of the separate prefix and the three assertions above it:
NFR-4.5 promises photographs of people are sent nowhere, and that promise is in the privacy
statement a user reads at signup.

- [ ] **Step 4: Extend `deleteOutfit` and `deleteAccount` to purge covers**

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/outfits/cover.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: outfit cover photographs, never normalised and never sent out"
```

---

### Task 5: The outfit library query

**Files:**
- Create: `src/features/outfits/query.ts`, `src/app/api/outfits/route.ts`
- Modify: `src/db/schema.ts` (indexes)
- Test: `tests/features/outfits/query.test.ts`

**Interfaces:**
- Consumes: `outfits`, `outfitItems`, `outfitTags`, `itemTags`, plan 2's `TagFilter`.
- Produces:
  ```ts
  type OutfitQuery = {
    userId: string;
    outfitTagFilters: TagFilter[];      // the outfit's own tags
    containsFilters: TagFilter[];       // tags of the pieces inside
    excludesFilters: TagFilter[];       // pieces it must NOT contain
    search?: string;
    sort: 'newest' | 'oldest' | 'name_asc' | 'name_desc';
    limit: number; cursor?: string;
  };
  type OutfitSummary = { id: string; displayName: string; tags: string[];
                         pieceCount: number; archivedPieceCount: number;
                         coverUrl: string | null; pieces: CompositionPiece[] };
  queryOutfits(q: OutfitQuery): Promise<{ outfits: OutfitSummary[]; nextCursor: string | null; total: number }>;
  outfitFacetCounts(q: Omit<OutfitQuery,'limit'|'cursor'|'sort'>): Promise<Record<string, number>>;
  ```

- [ ] **Step 1: Write the failing test**

```ts
it("lists outfits newest first with their tags and piece counts", async () => { ... }); // FR-11.1
it("filters by the outfit's own tags, any-of within a type", async () => { expect(ids).toHaveLength(4); }); // FR-11.2
it("searches outfit names", async () => { expect(ids).toEqual([goa]); });
it("escapes wildcards in the search string", async () => { expect(ids).toHaveLength(0); });
// FR-11.3
it("filters by the tags of the pieces inside", async () => {
  // outfits containing something formal
  expect(ids).toHaveLength(6);
});
it("combines contains-filters as all-of across types", async () => { ... });
it("combines an outfit-tag filter with a contains filter", async () => { expect(ids).toEqual([wedding]); });
// the design's addition
it("excludes outfits containing a given tag", async () => {
  // outfits with no shoes
  expect(ids).toEqual([gymKit]);
});
// Review Focus 4
it("an outfit with no tags at all matches an excludes filter", async () => {
  expect(ids).toContain(untaggedOutfit);
});
// Review Focus 1
it("includes an outfit whose every piece is archived", async () => {
  expect(ids).toContain(allArchived);
});
it("reports how many of an outfit's pieces are archived", async () => { expect(o.archivedPieceCount).toBe(3); });
it("paginates without repeating or skipping", async () => { ... });
it("sorts by name both ways", async () => { ... });
it("returns only the requesting user's outfits", async () => { expect(outfits).toHaveLength(0); });
it("facet counts reflect the other active filters", async () => { ... });
// NFR-6.2
it("queries 400 outfits over 1,000 pieces in under 300ms", async () => {
  expect(Date.now() - start).toBeLessThan(300);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/outfits/query.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `queryOutfits`**

Each filter class is one subquery against `outfitItems` joined to `itemTags`: `containsFilters`
as `EXISTS`, `excludesFilters` as `NOT EXISTS`. Review Focus 4 is why `NOT EXISTS` rather than
`outfitId NOT IN (select … )` — the `NOT IN` form silently drops outfits with no tag rows at
all, which are precisely the ones that most obviously do not contain the tag.

Archived pieces stay in `outfitItems` (FR-8.2), so an outfit is never filtered out by its
pieces being archived; `archivedPieceCount` is reported so the UI can say so.

- [ ] **Step 4: Add the indexes NFR-6.2 needs**

`outfitItems(itemId, outfitId)` for the contains and excludes probes, and
`outfits(userId, createdAt desc, id)` for the default page.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/outfits/query.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: outfit library query filtering by own tags, contents, and absence"
```

---

### Task 6: Completing the item lifecycle

Fills the two holes plan 2 left open.

**Files:**
- Modify: `src/features/items/lifecycle.ts`
- Test: `tests/features/items/lifecycle.test.ts` (extend)

**Interfaces:**
- Consumes: `outfitsContaining`, `outfitItems`.
- Produces: `previewDeleteItem` now returns populated `affectedOutfits`; `listArchived` now returns a real `outfitCount`.

- [ ] **Step 1: Write the failing test**

```ts
// FR-8.2, now enforceable
it("an archived piece stays in its outfits", async () => {
  await archiveItem({ userId, itemId });
  expect((await getOutfit({ userId, outfitId })).value.items.map(i => i.id)).toContain(itemId);
});
it("an archived piece is marked archived inside an outfit", async () => { expect(piece.archived).toBe(true); });
it("listArchived reports how many outfits each piece is in", async () => { expect(a[0].outfitCount).toBe(3); });
// Review Focus 2 — FR-8.4
it("previewDeleteItem names every affected outfit with its resulting count", async () => {
  expect(preview.value.affectedOutfits).toEqual([
    { id: goa, name: "Goa dinner", remaining: 2 },
    { id: monday, name: "Monday standard", remaining: 2 },
  ]);
});
it("deleting a piece removes it from all four outfits it was in", async () => {
  await deleteItem({ userId, itemId });
  expect(await db.select().from(outfitItems).where(eq(itemId))).toHaveLength(0);
});
it("an outfit reduced below two pieces by a deletion survives, flagged as incomplete", async () => {
  // explicit rule rather than invalid data or a silent cascade delete
  expect(o.pieceCount).toBe(1);
  expect(o.incomplete).toBe(true);
});
it("the preview warns which outfits would be left incomplete", async () => {
  expect(preview.value.affectedOutfits[0]).toMatchObject({ remaining: 1, wouldBeIncomplete: true });
});
it("an incomplete outfit can be repaired by adding a piece", async () => { expect(o.incomplete).toBe(false); });
it("the bulk delete of archived pieces in no outfits still finds them", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/items/lifecycle.test.ts`
Expected: FAIL — `affectedOutfits` empty, `incomplete` not defined.

- [ ] **Step 3: Populate `affectedOutfits` and `outfitCount`**

- [ ] **Step 4: Decide and implement the below-two rule**

FR-9.3 says an outfit has two or more pieces, and a deletion can violate that. Three options
were available: cascade-delete the outfit, block the deletion, or let the outfit survive
flagged. **Flagged survival** is the choice. Cascading would destroy a record the user never
asked to lose, and blocking would make a piece undeletable because of an outfit they may not
remember. `outfits.incomplete` is derived from the membership count, not stored, and the
preview warns before the fact.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/items/lifecycle.test.ts`
Expected: PASS, plan 2's 11 tests plus 8 new.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: deletion names affected outfits; archived pieces stay attached"
```

---

### Task 7: Flat-lay composition

**Files:**
- Create: `src/features/outfits/composition.ts`
- Test: `tests/features/outfits/composition.test.ts`

**Interfaces:**
- Consumes: nothing — a pure function.
- Produces:
  ```ts
  type CompositionPiece = { itemId: string; photoVersion: PhotoVersion; url: string;
                            categoryName: string | null; colourHex: string | null };
  type Placement = { itemId: string; left: number; top: number; width: number; height: number; z: number };
  layFlat(pieces: CompositionPiece[]): Placement[];
  type Treatment = 'flatlay' | 'colourstory';
  ```
  Percentages, not pixels, so one function serves the 150px library card and the full-width hero.

- [ ] **Step 1: Write the failing test**

```ts
it("places a top above a bottom above shoes", async () => {
  expect(top.top).toBeLessThan(bottom.top);
  expect(bottom.top).toBeLessThan(shoes.top);
});
it("centres tops and bottoms horizontally", async () => { expect(top.left + top.width / 2).toBeCloseTo(50, 0); });
it("puts outerwear beside, not on top of, the top", async () => { expect(overlap(outer, top)).toBeLessThan(0.3); });
it("is deterministic — the same pieces give the same placements", async () => { expect(a).toEqual(b); });
it("is order-independent — shuffling the input gives the same placements", async () => { expect(a).toEqual(b); });
it("keeps every placement inside the square", async () => {
  for (const p of placements) {
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.left + p.width).toBeLessThanOrEqual(100);
  }
});
// Review Focus 3
it("offsets two pieces of the same category instead of stacking them", async () => {
  const [a, b] = layFlat([shirt1, shirt2]);
  expect(Math.abs(a.left - b.left) + Math.abs(a.top - b.top)).toBeGreaterThan(8);
});
it("places a category with no anatomical position without overlapping anything heavily", async () => {
  // an accessory
  expect(maxOverlap(accessory, others)).toBeLessThan(0.3);
});
it("places an untagged piece — no category at all", async () => { expect(placements).toHaveLength(2); });
it("handles two pieces", async () => { expect(placements).toHaveLength(2); });
it("handles eight pieces without any placement leaving the square", async () => { ... });
it("gives shoes a smaller footprint than a garment", async () => { expect(shoes.width).toBeLessThan(top.width); });
it("orders z so smaller pieces sit above larger ones", async () => { expect(shoes.z).toBeGreaterThan(top.z); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/outfits/composition.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `layFlat`**

A fixed slot table keyed by a **category family** — top, bottom, outer, feet, accessory,
unknown — derived from the Category tag name, with every family having a defined slot so
Review Focus 3's accessory and untagged cases are not special paths. A second piece in an
occupied family takes a deterministic offset from the first, derived from its index, which is
why the function must be sorted internally rather than trusting input order.

Percentages throughout. No randomness anywhere: FR-11.1's "reads as one piece" requires the
same outfit to look identical in the library and on its own screen, and across reloads.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/outfits/composition.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: deterministic flat-lay composition from a set of pieces"
```

---

### Task 8: The outfit library

**Files:**
- Create: `src/app/(app)/outfits/page.tsx`, `src/components/OutfitCard.tsx`, `src/components/FlatLay.tsx`, `src/components/ColourStory.tsx`, `src/components/EmptyOutfits.tsx`
- Test: `tests/components/FlatLay.test.tsx`, `tests/components/OutfitCard.test.tsx`

**Interfaces:**
- Consumes: `GET /api/outfits`, `layFlat`, `displayVersionFor` (plan 3).
- Produces: the library in both treatments, and its empty state.

- [ ] **Step 1: Write the failing test**

```ts
// FlatLay
it("renders one image per piece at its placement", async () => { expect(imgs).toHaveLength(3); });
it("uses the version displayVersionFor chooses, not always the cutout", async () => {
  expect(img.src).toContain("/display"); // the user switched this piece back
});
it("falls back to the display rendition for a piece with no cutout", async () => { ... });
it("renders inside its container at any size", async () => { ... });

// OutfitCard — FR-11.1
it("shows the name, tags and piece count", async () => { expect(screen.getByText(/travel, warm/i)).toBeVisible(); });
it("uses the cover photograph when one exists", async () => { expect(img.src).toContain("/cover"); });
it("uses the flat lay when there is no cover", async () => { expect(screen.getByTestId("flatlay")).toBeVisible(); }); // FR-9.7 fallback
// Review Focus 1
it("renders an outfit whose pieces are all archived, and says so", async () => {
  expect(screen.getByText(/3 pieces archived/i)).toBeVisible();
});
it("flags an incomplete outfit", async () => { expect(screen.getByText(/1 piece/i)).toBeVisible(); });
it("the treatment switch moves to colour story", async () => { expect(screen.getByTestId("colourstory")).toBeVisible(); });
it("remembers the chosen treatment", async () => { ... });
it("empty state invites building one", async () => { expect(screen.getByText(/build/i)).toBeVisible(); });
it("alt text names the outfit and its pieces", async () => { ... }); // NFR-8.3
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/FlatLay.test.tsx tests/components/OutfitCard.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the five components and the page**

Flat lay is the default (UI design §1); Colour story is a switch, persisted per account, and is
the sensible default past a few hundred outfits. Moodboard is **not** built — recorded as a
rejected alternative, and the one real photographs would damage most.

Review Focus 1's rule in the UI: an all-archived outfit renders normally with a quiet line
saying its pieces are archived. The outfit is a record of something that happened; emptying it
because the clothes went to a charity shop would lose the record.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/FlatLay.test.tsx tests/components/OutfitCard.test.tsx`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: outfit library in flat lay, with colour story as a density switch"
```

---

### Task 9: One outfit, and editing it

**Files:**
- Create: `src/app/(app)/outfits/[outfitId]/page.tsx`, `src/app/(app)/outfits/[outfitId]/edit/page.tsx`, `src/components/OutfitPieces.tsx`, `src/components/CoverPicker.tsx`
- Test: `tests/components/OutfitPieces.test.tsx`, `tests/app/outfit-edit.test.tsx`

**Interfaces:**
- Consumes: `getOutfit`, `renameOutfit`, `addPieces`, `removePieces`, outfit tagging, cover functions.
- Produces: the One-outfit and Editing-an-outfit screens.

- [ ] **Step 1: Write the failing test**

```ts
// OutfitPieces — FR-9.9
it("lists each piece with its chip and category", async () => { expect(screen.getByText(/Shirts/)).toBeVisible(); });
it("a piece row opens that piece", async () => { expect(url.pathname).toContain("/items/"); });
it("marks an archived piece as archived", async () => { expect(screen.getByText(/archived/i)).toBeVisible(); });
it("the hero uses the chosen treatment at full width", async () => { ... });

// edit — FR-9.4, FR-9.6, FR-9.7, FR-9.8
it("shows the date placeholder as placeholder text", async () => {
  expect(screen.getByPlaceholderText(/^Outfit, /)).toBeVisible();
});
it("offers only tag types marked for outfits", async () => { expect(screen.queryByText("Category")).toBeNull(); });
it("adding a cover uploads it and shows it as the cover", async () => { ... });
it("says a photograph of you is never sent anywhere", async () => {
  expect(screen.getByText(/never sent anywhere/i)).toBeVisible();
}); // NFR-4.5
it("without a cover, says the flat lay is used", async () => { expect(screen.getByText(/flat lay/i)).toBeVisible(); });
it("removing a piece below two is refused with a reason", async () => {
  expect(screen.getByText(/needs at least two/i)).toBeVisible();
});
it("delete reassures that pieces are kept", async () => {
  expect(screen.getByText(/keeps every piece in it/i)).toBeVisible();
}); // FR-9.8
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/OutfitPieces.test.tsx tests/app/outfit-edit.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both pages and both components**

The piece rows are the only place the app shows which category a piece belongs to while
looking at an outfit, and "which of my trousers is that" is a real question — so the category
stays on the row.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/OutfitPieces.test.tsx tests/app/outfit-edit.test.tsx`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: one outfit, and editing its name, tags, cover and pieces"
```

---

### Task 10: The builder

**Files:**
- Create: `src/app/(app)/outfits/new/page.tsx`, `src/components/PiecePicker.tsx`, `src/components/SelectionTray.tsx`
- Test: `tests/components/PiecePicker.test.tsx`

**Interfaces:**
- Consumes: `GET /api/items` with plan 2's filters and search, `createOutfit`, `useFilters`.
- Produces: the Building-an-outfit screen.

- [ ] **Step 1: Write the failing test**

```ts
// FR-9.2
it("renders the wardrobe grid with the real filter chips", async () => { expect(screen.getByText(/shirts/i)).toBeVisible(); });
it("filtering here uses the same query as the wardrobe", async () => { expect(fetchedUrl).toContain("/api/items?tag="); });
it("search works in the picker", async () => { ... });
it("tapping a piece selects it and shows a tick", async () => { expect(cell).toHaveClass(/on/); });
it("the tray shows what is chosen and survives a filter change", async () => {
  await changeFilter();
  expect(within(tray).getAllByRole("img")).toHaveLength(3);
});
it("tapping a chosen piece deselects it", async () => { ... });
it("the primary action is disabled below two pieces", async () => { expect(btn).toBeDisabled(); });
it("the primary action counts the selection", async () => { expect(screen.getByText(/3 chosen/i)).toBeVisible(); });
it("excludes archived pieces", async () => { expect(ids).not.toContain(archivedId); });
it("naming comes after picking", async () => { expect(screen.getByRole("button", { name: /name this outfit/i })).toBeVisible(); });
it("creating navigates to the new outfit", async () => { expect(url.pathname).toMatch(/outfits\/[^/]+$/); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/PiecePicker.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both components and the page**

The picker is plan 2's grid with a selection layer, not a new list — choosing four pieces out
of three hundred by scrolling is not something anyone does twice, so the real filters and
search have to be here.

The tray costs vertical space on a phone and earns it: without it you lose track of what you
picked three filters ago. Picking comes first and naming second — admin after the interesting
part.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/PiecePicker.test.tsx`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: outfit builder over the wardrobe's own filters, with a selection tray"
```

---

### Task 11: Outfit filtering, and the whole-product pass

**Files:**
- Create: `src/components/OutfitFilterSheet.tsx`
- Modify: `src/app/(app)/items/[itemId]/page.tsx` (the "in outfits" section)
- Create: `docs/superpowers/plans/notes/04-launch-gates.md`
- Test: `tests/components/OutfitFilterSheet.test.tsx`, `tests/app/in-outfits.test.tsx`

**Interfaces:**
- Consumes: `outfitFacetCounts`, `queryOutfits`, `outfitsContaining`.
- Produces: the Filtering-outfits screen; the piece screen's outfit links.

- [ ] **Step 1: Write the failing test**

```ts
// OutfitFilterSheet — FR-11.2, FR-11.3
it("offers three filter groups", async () => {
  expect(screen.getByText(/outfit tags/i)).toBeVisible();
  expect(screen.getByText(/contains a piece that is/i)).toBeVisible();
  expect(screen.getByText(/does not contain/i)).toBeVisible();
});
it("counts each option", async () => { expect(screen.getByText(/formal 6/i)).toBeVisible(); });
it("counts the result before applying", async () => { expect(screen.getByRole("button", { name: /show 3 outfits/i })).toBeVisible(); });
it("the contains group draws from item tag types", async () => { ... });
it("the outfit tags group draws from outfit tag types only", async () => { ... });
it("filter state goes in the URL", async () => { expect(url.searchParams.getAll("contains")).toContain(formalId); });

// in-outfits — FR-7.11
it("the piece screen lists the outfits it is in", async () => { expect(screen.getByText(/Goa dinner/)).toBeVisible(); });
it("each links to that outfit", async () => { ... });
it("says so plainly when a piece is in none", async () => { expect(screen.getByText(/not in any outfit/i)).toBeVisible(); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/OutfitFilterSheet.test.tsx tests/app/in-outfits.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the sheet and the piece screen's section**

The "does not contain" group is the design's addition. It is nearly free given the positive
query exists, and it answers the question nothing else can: which outfits am I missing shoes
for.

- [ ] **Step 4: Run the whole suite across all four plans**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Verify every requirement has a test or a recorded reason**

Walk the spec's 99 in-scope requirements and confirm each is covered by a test in some plan,
or listed in `04-launch-gates.md` as verified by measurement or by a non-visual build
constraint. FR-10's seven Phase-2 requirements are out of scope. Write the result as a table;
a requirement with neither a test nor a reason is a gap to close before release.

- [ ] **Step 6: Re-measure every launch gate on the finished product**

NFR-2.1, 2.2 and 2.3 are the hard gates. Seed 1,000 pieces, 400 outfits, 50 tag types and
1,000 tags, then on a throttled phone profile record: cold and warm grid render, a filter
apply, an outfit library load, and photo-to-piece-exists. Record NFR-2.4 and 2.5 as targets.
Append to `docs/superpowers/plans/notes/04-launch-gates.md` with the date and device.

- [ ] **Step 7: Rehearse the restore — NFR-5.1**

Plan 1 required this before launch and there is now real data to lose. Take a backup, restore
it to a fresh database and bucket, and confirm pieces, photographs, tags, outfits and
credentials all come back. Record the procedure and the time it took.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: outfit filtering, in-outfits links, and the whole-product verification pass"
```

---

## Requirement coverage

| Req | Task | Req | Task |
|---|---|---|---|
| FR-9.1 a named set | 1 | FR-9.7 cover photograph | 4, 8, 9 |
| FR-9.2 build by selecting | 10 | FR-9.8 delete keeps pieces | 1, 9 |
| FR-9.3 two or more, reusable | 1, 2 | FR-9.9 detail lists pieces | 1, 9 |
| FR-9.4 name with a placeholder | 1, 9 | FR-11.1 library with a summary | 5, 7, 8 |
| FR-9.5 outfit tags | 3, 9 | FR-11.2 filter by tag, search | 5, 11 |
| FR-9.6 add, remove, rename | 2, 9 | FR-11.3 filter by contents | 5, 11 |
| FR-7.11 outfits containing a piece | 2, 11 | FR-11.4 sort | 5, 8 |
| FR-8.2 archived stays attached | 6 | FR-8.4 deletion names outfits | 6 |

---

## What is deliberately not built

- **Section 6.10, outfits from a photograph of yourself.** Phase 2. The seams it will use are
  in place: `addPieces` takes an array, `createOutfit` accepts a name and pieces in one call,
  and cover photographs already exist (FR-9.7 is what FR-10.5 attaches to). When it is built
  it needs an attribute-reading call per garment detected, which is plan 3's
  `runWithFallback` — not a new provider path.
- **Moodboard** as an outfit treatment. Designed, compared, rejected in the UI design doc.
- **Offline browsing**, **sharing**, and anything in the spec's non-goals.

## After this plan

All four plans complete Phase 1 of the spec. The three later-unscheduled items in the spec's
§8 — offline browsing, sharing, and the Phase 2 outfit route — each start from a seam
something here already left:

| Later feature | The seam it starts from |
|---|---|
| Offline browsing | NFR-1.4's two constraints: a data API, and stable cacheable photo URLs |
| Sharing | every query is already scoped by `userId` at one boundary; sharing widens that predicate rather than rewriting authorisation |
| Outfit from a photograph | `addPieces`, `createOutfit`, cover photos, and `runWithFallback` |

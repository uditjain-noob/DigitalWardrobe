# Wardrobe Plan 2 of 4: Vocabulary, Filtering, and Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The point at which the wardrobe becomes genuinely useful — describe pieces in your own words and dimensions, then find anything by any combination of them, all without a provider key.

**Architecture:** One tagging mechanism for everything descriptive. A **tag type** is a dimension (Category, Fabric, Season); a **tag** is a value in it. The four built-ins ship as seed rows, not schema, so a user-created type is the same kind of record. Filtering is one SQL builder in `src/features/query/` that every surface uses — the grid, the bands, the filter sheet's facet counts, and the relax counts on an empty result — so the any-of/all-of rule exists once. All of it extends the API and components plan 1 built; nothing is rewritten.

**Tech Stack:** As plan 1 — TypeScript strict, Next.js 15 App Router, Postgres 16 via Drizzle, Vitest against a real database. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-11-03-digital-wardrobe-design.md](../specs/2026-11-03-digital-wardrobe-design.md)
**UI design:** [docs/superpowers/specs/2026-11-04-wardrobe-ui-design.md](../specs/2026-11-04-wardrobe-ui-design.md) — §3 lists every screen here, with its copy.
**Follows:** [plan 1](2026-11-03-wardrobe-01-foundation-and-capture.md). Its conventions carry over: `Result<T,E>`, the `src/features/*` and `src/lib/*` split, tokens and `HitArea` from Task 14, one commit per task.

**Scope:** Spec sections 6.5, 6.7, 6.8, plus FR-2.4 and the two requirements plan 1 served at reduced fidelity. **Not** here: provider credentials (6.3), normalisation (6.4), autofill (6.6) — plan 3; outfits (6.9, 6.11) — plan 4.

Two requirements are again served at reduced fidelity, because outfits do not exist until plan 4:
- **FR-8.2** an archived piece "stays attached to any outfit that already includes it" — nothing to stay attached to yet. The archive flag is built correctly; plan 4 adds the guarantee.
- **FR-8.4** permanent deletion "says which outfits will be affected". `previewDeleteItem` returns an empty `affectedOutfits` array here; plan 4 fills it. The confirmation UI reads the array, so plan 4 adds data, not a component.

Two plan-1 placeholders are completed here: **FR-2.5** derived names now come from Category and Colour tags, and **NFR-8.3** alt text now includes tags.

## Global Constraints

Plan 1's Global Constraints still apply in full. Additional values from the spec:

- **FR-5.1** One mechanism. No separate class of app-defined fields above the user's tags.
- **FR-5.2** Built-ins shipped pre-populated: **Category** (shirt, t-shirt, trousers, jeans, shorts, skirt, dress, jacket, knitwear, shoes, accessory, other), **Colour**, **Pattern**, **Style** (casual, formal, business, athletic, loungewear, occasion), plus a **General** type for quick inline tags.
- **FR-5.7/5.8/5.9** Each type declares: one value or several; applies to items, outfits, or both; whether autofill may propose into it and may invent new tags in it.
- **FR-7.4** "Values within one attribute combine as *any of*; different attributes combine as *all of*."
- **FR-7.8** Search matches "item names, tag names, and tag descriptions".
- **NFR-2.2** Filtering returns within 300 ms and "does not degrade as the user's vocabulary grows — the cost is in the number of matching items, not the number of tag types defined." **Launch gate.**
- **NFR-6.1** Up to ~1,000 items, **50 tag types and 1,000 tags** per account.
- **NFR-7.3** Caps now include "maximum counts of tag types and tags", configurable without a code change.
- **NFR-9.3** "The built-in tag types and their shipped tags are seed data, not schema."
- **NFR-4.10** Tag names and descriptions are user text that later enters a provider request: treated as data, never instructions. Plan 3 composes the request; this plan must not sanitise away legitimate characters that plan 3 then needs to escape.

## Review Focus

1. **A one-value type that already holds two tags on a piece.** Reachable by switching a type from several-values to one. Expected: the switch is allowed, existing pieces keep both, and the next edit forces a choice — never silent data loss. → Task 2.
2. **A tag renamed onto an existing name in the same type**, differing only in case or trailing space. Expected: refused with a merge offered, not silently duplicated. → Task 3.
3. **A bookmarked filter URL naming a deleted or hidden tag.** FR-7.12 makes filters addressable, so this will happen. Expected: the unknown part is dropped, the rest applies, and the user is told what was dropped. → Task 7.
4. **Merging two tags that both sit on the same piece.** Expected: one tag afterwards, the piece counted once — not a doubled count or a duplicate-key crash. → Task 3.
5. **A search string containing `%`, `_` or a backslash.** Expected: treated as literal characters, not wildcards, and no error. → Task 7.

---

### Task 1: Tag type and tag tables, with built-in seeding

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/features/vocabulary/seed.ts`, `src/features/vocabulary/types.ts`
- Modify: `src/features/accounts/register.ts` (seed on account creation)
- Test: `tests/features/vocabulary/seed.test.ts`

**Interfaces:**
- Consumes: `db`, `users`, `registerAccount`.
- Produces: `type TagTypeRules = { multiValue: boolean; appliesToItems: boolean; appliesToOutfits: boolean; autofillSuggest: boolean; autofillInvent: boolean }`; `type TagType = { id: string; userId: string; name: string; description: string | null; builtin: boolean; hidden: boolean; position: number } & TagTypeRules`; `type Tag = { id: string; userId: string; tagTypeId: string; name: string; description: string | null }`; `seedVocabulary(userId: string): Promise<void>`; `BUILT_IN_TYPES` (the seed data). `tagTypes` table: the fields above plus `createdAt`, unique `(userId, lower(name))`. `tags` table: plus `createdAt`, unique `(userId, tagTypeId, lower(name))`. `itemTags` table: `itemId`, `tagId`, `source` (`'user' | 'auto'`), `createdAt`, primary key `(itemId, tagId)`.

- [ ] **Step 1: Write the failing test**

```ts
it("seeds five types for a new account", async () => {
  expect(types.map(t => t.name)).toEqual(["Category","Colour","Pattern","Style","General"]);
});
it("marks all seeded types builtin", async () => { expect(types.every(t => t.builtin)).toBe(true); });
it("gives Category one value and Colour several", async () => {
  expect(byName("Category").multiValue).toBe(false);
  expect(byName("Colour").multiValue).toBe(true);
});
it("seeds Category with the twelve shipped garment types", async () => {
  expect(tagsIn("Category").map(t => t.name)).toEqual([
    "shirt","t-shirt","trousers","jeans","shorts","skirt",
    "dress","jacket","knitwear","shoes","accessory","other",
  ]);
});
it("seeds Style with six values", async () => { expect(tagsIn("Style")).toHaveLength(6); });
it("leaves General empty", async () => { expect(tagsIn("General")).toHaveLength(0); });
it("seeds automatically when an account is registered", async () => {
  await registerAccount({ email: "a@b.com", password: "a-good-long-password", ip: "1.1.1.1" });
  expect(await db.select().from(tagTypes)).not.toHaveLength(0);
});
it("seeds per account, so two users get independent vocabularies", async () => { ... });
it("refuses two types with the same name differing only in case", async () => { /* unique index */ });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/vocabulary/seed.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Add the three tables to `src/db/schema.ts` and generate the migration**

`position` orders types for display. The unique indexes are on `lower(name)` — case-insensitive collisions are Review Focus 2's concern and the database is where it is cheapest to enforce.

- [ ] **Step 4: Implement `BUILT_IN_TYPES` and `seedVocabulary`**

Seed data only (NFR-9.3): a built-in row is identical in shape to a user-created one, and
`builtin` governs nothing but a label and the refusal to hard-delete in Task 2. Rules per
the Global Constraints: Category one-value, Pattern one-value, Colour and Style several;
Season-style types come later from the user. `autofillInvent` is **false** on every seeded
type.

- [ ] **Step 5: Call `seedVocabulary` from `registerAccount`, inside its transaction**

An account without a vocabulary is unusable, so this is not a follow-up job.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/features/vocabulary/seed.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: tag type and tag tables with built-in vocabulary seeded per account"
```

---

### Task 2: Tag type use cases

**Files:**
- Create: `src/features/vocabulary/tag-types.ts`, `src/lib/limits/vocab-caps.ts`
- Modify: `src/env.ts` (add `MAX_TAG_TYPES_PER_ACCOUNT`, `MAX_TAGS_PER_ACCOUNT`)
- Test: `tests/features/vocabulary/tag-types.test.ts`

**Interfaces:**
- Consumes: `tagTypes`, `tags`, `itemTags`, `env`, `Result`.
- Produces: `createTagType(input: { userId: string; name: string; description?: string; rules: TagTypeRules }): Promise<Result<TagType, 'name_taken' | 'invalid_name' | 'type_cap_reached'>>`; `updateTagType(input: { userId: string; tagTypeId: string; patch: Partial<Pick<TagType,'name'|'description'> & TagTypeRules> }): Promise<Result<TagType, 'not_found' | 'name_taken' | 'invalid_name'>>`; `reorderTagTypes(input: { userId: string; orderedIds: string[] }): Promise<Result<void, 'incomplete_order'>>`; `setTagTypeHidden(input: { userId: string; tagTypeId: string; hidden: boolean }): Promise<Result<void, 'not_found'>>`; `previewDeleteTagType(input: { userId: string; tagTypeId: string }): Promise<Result<{ tagsRemoved: number; itemsAffected: number }, 'not_found'>>`; `deleteTagType(input: { userId: string; tagTypeId: string }): Promise<Result<void, 'not_found' | 'builtin'>>`; `listTagTypes(input: { userId: string; includeHidden?: boolean }): Promise<Array<TagType & { tagCount: number }>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("creates a type with its rules", async () => { expect(r.ok && r.value.multiValue).toBe(true); });
it("refuses a duplicate name, case-insensitively", async () => { expect(r.error).toBe("name_taken"); });
it("refuses an empty or whitespace-only name", async () => { expect(r.error).toBe("invalid_name"); });
it("trims surrounding whitespace from a name", async () => { expect(r.value.name).toBe("Fit"); });
it("refuses creation at the type cap", async () => { expect(r.error).toBe("type_cap_reached"); }); // NFR-7.3
it("updates rules independently of name", async () => { ... });
// Review Focus 1
it("allows switching several-values to one and keeps existing pairs", async () => {
  // item has two Colour tags, then Colour becomes one-value
  const r = await updateTagType({ userId, tagTypeId: colourId, patch: { multiValue: false } });
  expect(r.ok).toBe(true);
  expect(await tagsOnItem(itemId, colourId)).toHaveLength(2);
});
it("hides a type without deleting its tags", async () => {
  await setTagTypeHidden({ userId, tagTypeId, hidden: true });
  expect(await tagsIn(tagTypeId)).toHaveLength(9);
});
it("lists hidden types only when asked", async () => { ... });
it("reports what deleting a type would cost", async () => {
  expect(preview.value).toEqual({ tagsRemoved: 9, itemsAffected: 54 });
});
it("deletes a type, its tags, and their item links", async () => { ... });
it("refuses to delete a builtin type, offering hide instead", async () => { expect(r.error).toBe("builtin"); });
it("refuses a reorder that omits a type", async () => { expect(r.error).toBe("incomplete_order"); });
it("never touches another user's types", async () => { expect(r.error).toBe("not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/vocabulary/tag-types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `vocab-caps.ts` and the eight functions in `tag-types.ts`**

`previewDeleteTagType` and `deleteTagType` are separate because FR-5.3 requires the
confirmation to state the cost, and computing it is a different query from doing it. Deleting
cascades to `tags` and `itemTags` in one transaction. Built-ins return `'builtin'` rather
than deleting — the UI offers hide (FR-5.4), which is almost always what is meant.

Review Focus 1's rule: narrowing a type to one value is a **declaration about future edits**,
not a migration. Existing pieces keep what they have; Task 4's `setItemTags` enforces the
rule on the next write. Silently dropping a tag to satisfy a setting change would be data
loss the user never asked for.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/vocabulary/tag-types.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: create, update, reorder, hide and delete tag types"
```

---

### Task 3: Tag use cases, including merge

**Files:**
- Create: `src/features/vocabulary/tags.ts`
- Test: `tests/features/vocabulary/tags.test.ts`

**Interfaces:**
- Consumes: `tags`, `tagTypes`, `itemTags`, vocab caps.
- Produces: `createTag(input: { userId: string; tagTypeId: string; name: string; description?: string }): Promise<Result<Tag, 'name_taken' | 'invalid_name' | 'type_not_found' | 'tag_cap_reached'>>`; `updateTag(input: { userId: string; tagId: string; patch: { name?: string; description?: string | null; tagTypeId?: string } }): Promise<Result<Tag, 'not_found' | 'name_taken' | 'invalid_name' | 'type_not_found'>>`; `previewDeleteTag(input: { userId: string; tagId: string }): Promise<Result<{ itemsAffected: number }, 'not_found'>>`; `deleteTag(input: { userId: string; tagId: string }): Promise<Result<void, 'not_found'>>`; `mergeTags(input: { userId: string; keepTagId: string; absorbTagId: string }): Promise<Result<{ itemsAfter: number }, 'not_found' | 'same_tag' | 'different_types'>>`; `suggestMerges(input: { userId: string; tagId: string }): Promise<Array<Tag & { itemCount: number }>>`; `listTags(input: { userId: string; tagTypeId?: string; prefix?: string; limit?: number }): Promise<Array<Tag & { itemCount: number }>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("creates a tag in a type", async () => { expect(r.ok).toBe(true); });
it("allows the same tag name in two different types", async () => { expect(r.ok).toBe(true); });
// Review Focus 2
it("refuses a rename onto an existing name in the same type, case-insensitively", async () => {
  expect((await updateTag({ userId, tagId: linenBlendId, patch: { name: "LINEN" } })).error)
    .toBe("name_taken");
});
it("refuses a rename onto an existing name differing only by trailing space", async () => {
  expect(r.error).toBe("name_taken");
});
it("renames across every piece at once", async () => {
  await updateTag({ userId, tagId, patch: { name: "flax" } });
  expect(await itemsWithTag(tagId)).toHaveLength(11); // same pieces, new name
});
it("moves a tag to another type and it moves on every piece", async () => { ... });
it("refuses a move to a type that does not exist or belongs to someone else", async () => { ... });
it("refuses creation at the tag cap", async () => { expect(r.error).toBe("tag_cap_reached"); });
it("reports what deleting a tag would cost", async () => { expect(preview.value.itemsAffected).toBe(11); });
it("deletes a tag from every piece but keeps the pieces", async () => {
  await deleteTag({ userId, tagId });
  expect(await db.select().from(items)).toHaveLength(itemCount);
});
// Review Focus 4
it("merges two tags and leaves one, counting a shared piece once", async () => {
  // itemA has both linen and linen-blend; itemB has only linen-blend
  const r = await mergeTags({ userId, keepTagId: linen, absorbTagId: blend });
  expect(r.ok && r.value.itemsAfter).toBe(2);
  expect(await db.select().from(tags).where(eq(tags.id, blend))).toHaveLength(0);
});
it("merging discards the absorbed tag's description", async () => { ... });
it("refuses merging a tag into itself", async () => { expect(r.error).toBe("same_tag"); });
it("refuses merging across types", async () => { expect(r.error).toBe("different_types"); });
it("suggests near-duplicates in the same type, by edit distance and prefix", async () => {
  expect((await suggestMerges({ userId, tagId: linen })).map(t => t.name)).toContain("linen blend");
});
it("suggests nothing for a tag with no near neighbours", async () => { expect(s).toHaveLength(0); });
it("listTags with a prefix returns matches ordered by item count", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/vocabulary/tags.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the seven functions**

`mergeTags` is one transaction: re-point `itemTags` from absorbed to kept with
`on conflict do nothing` — that clause is Review Focus 4, since a piece carrying both tags
would otherwise violate the primary key — then delete the absorbed tag. The absorbed
description is discarded, which is why Task 13's UI shows both before committing.

`suggestMerges` ranks candidates in the same type by a cheap similarity: shared prefix of
four or more characters, or Levenshtein distance ≤ 2 on names under twelve characters.
Returns at most three. It only has to be good enough to surface the obvious case — nobody
goes hunting for duplicates, so a decent suggestion beats a perfect search nobody runs.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/vocabulary/tags.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: tag create, rename, move, delete and merge across the wardrobe"
```

---

### Task 4: Tagging a piece

**Files:**
- Create: `src/features/items/tagging.ts`
- Test: `tests/features/items/tagging.test.ts`

**Interfaces:**
- Consumes: `itemTags`, `tags`, `tagTypes`, `items`.
- Produces: `type TagOnItem = Tag & { tagTypeId: string; typeName: string; source: 'user' | 'auto' }`; `addItemTag(input: { userId: string; itemId: string; tagId: string; source?: 'user' | 'auto' }): Promise<Result<void, 'item_not_found' | 'tag_not_found' | 'needs_replace'>>`; `replaceItemTag(input: { userId: string; itemId: string; tagTypeId: string; tagId: string | null }): Promise<Result<void, 'item_not_found' | 'tag_not_found'>>`; `removeItemTag(input: { userId: string; itemId: string; tagId: string }): Promise<Result<void, 'not_found'>>`; `listItemTags(input: { userId: string; itemId: string }): Promise<Result<Record<string, TagOnItem[]>, 'item_not_found'>>` keyed by tag type id.

- [ ] **Step 1: Write the failing test**

```ts
it("adds a tag to a piece", async () => { expect(r.ok).toBe(true); });
it("records who set it — user or autofill", async () => { expect(row.source).toBe("auto"); });
it("adding a tag twice is idempotent", async () => { expect(await tagsOnItem(itemId)).toHaveLength(1); });
it("adds several tags from a several-values type", async () => { expect(colourTags).toHaveLength(2); });
// FR-5.7 on a one-value type
it("refuses a second tag in a one-value type, asking for replace", async () => {
  expect((await addItemTag({ userId, itemId, tagId: tshirtId })).error).toBe("needs_replace");
});
it("replaceItemTag swaps the value in a one-value type", async () => {
  await replaceItemTag({ userId, itemId, tagTypeId: categoryId, tagId: tshirtId });
  expect(await tagsOnItem(itemId, categoryId)).toEqual([tshirtId]);
});
it("replaceItemTag with null clears the type", async () => { expect(t).toHaveLength(0); });
// Review Focus 1, the second half
it("a piece holding two tags in a now-one-value type must choose on the next write", async () => {
  // Colour narrowed to one value while the piece holds beige and cream
  const r = await addItemTag({ userId, itemId, tagId: blackId });
  expect(r.error).toBe("needs_replace");
  const ok = await replaceItemTag({ userId, itemId, tagTypeId: colourId, tagId: blackId });
  expect(ok.ok).toBe(true);
  expect(await tagsOnItem(itemId, colourId)).toEqual([blackId]);
});
it("groups listItemTags by type, with the type name and source", async () => { ... });
it("includes types the piece has no tags in, as empty arrays", async () => {
  expect(Object.keys(grouped)).toContain(seasonId); // FR-5.13's UI shows empty groups
});
it("omits hidden types", async () => { ... });
it("refuses a tag belonging to another user", async () => { expect(r.error).toBe("tag_not_found"); });
it("refuses a piece belonging to another user", async () => { expect(r.error).toBe("item_not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/items/tagging.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the four functions**

`addItemTag` returns `'needs_replace'` rather than silently replacing, because an API that
quietly removes a value the user set is the failure FR-6.6 and NFR-5.8 both guard against.
`listItemTags` returns every visible type the type applies to items for, including empty
ones — the editing screen shows an empty Season group so the user knows the dimension
exists.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/items/tagging.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: tagging a piece, honouring one-or-several per type"
```

---

### Task 5: Derived names and alt text

**Files:**
- Modify: `src/lib/alt-text.ts`, `src/features/items/list.ts`
- Create: `src/features/items/derived-name.ts`
- Test: `tests/features/items/derived-name.test.ts`, `tests/lib/alt-text.test.ts` (extend)

**Interfaces:**
- Consumes: `listItemTags`.
- Produces: `derivedName(input: { category?: string; colours?: string[] }): string`; `altTextFor` gains the tags plan 1 left optional.

- [ ] **Step 1: Write the failing test**

```ts
// FR-2.5, completing plan 1's placeholder
it("builds a name from colour and category", () => {
  expect(derivedName({ category: "overshirt", colours: ["beige"] })).toBe("Beige overshirt");
});
it("uses category alone when there is no colour", () => { expect(d).toBe("Overshirt"); });
it("uses the first colour when there are several", () => { expect(d).toBe("Beige overshirt"); });
it("falls back to a date-based name with neither", () => { expect(d).toMatch(/^Piece added/); });
// NFR-8.3
it("alt text prefers the set name, then appends category and colour", () => {
  expect(altTextFor({ name: "Goa shirt", category: "shirt", colours: ["beige"] }))
    .toBe("Goa shirt, a beige shirt");
});
it("alt text with no tags is just the name", () => { expect(a).toBe("Goa shirt"); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/features/items/derived-name.test.ts tests/lib/alt-text.test.ts`
Expected: FAIL — `derivedName` not found; alt-text assertions fail.

- [ ] **Step 3: Implement `derivedName` and extend `altTextFor`**

Capitalise the first word only. `listItems` populates `displayName` from `derivedName` when
`name` is null, replacing plan 1's date-only fallback — which stays as the last resort for an
untagged piece.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/items/ tests/lib/alt-text.test.ts`
Expected: PASS, including plan 1's existing item tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: derive item names and alt text from category and colour tags"
```

---

### Task 6: The filter query

The single place the any-of/all-of rule exists. Every surface in this plan reads from here.

**Files:**
- Create: `src/features/query/filters.ts`, `src/features/query/sql.ts`
- Modify: `src/db/schema.ts` (indexes)
- Test: `tests/features/query/filters.test.ts`

**Interfaces:**
- Consumes: `items`, `itemTags`, `tags`, `tagTypes`.
- Produces:
  ```ts
  type TagFilter =
    | { tagTypeId: string; tagIds: string[] }   // any of these
    | { tagTypeId: string; untagged: true };    // has nothing in this type
  type Sort = 'newest' | 'oldest' | 'name_asc' | 'name_desc';
  type ItemQuery = { userId: string; filters: TagFilter[]; search?: string;
                     sort: Sort; includeArchived?: boolean;
                     limit: number; cursor?: string };
  queryItems(q: ItemQuery): Promise<{ items: ItemSummary[]; nextCursor: string | null; total: number }>;
  facetCounts(q: Omit<ItemQuery,'limit'|'cursor'|'sort'>): Promise<Record<string, number>>;
  relaxCounts(q: Omit<ItemQuery,'limit'|'cursor'|'sort'>): Promise<Array<{ dropped: TagFilter; count: number }>>;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// FR-7.4 — the rule, stated as tests
it("one tag returns pieces carrying it", async () => { expect(ids).toEqual([a, b]); });
it("two tags in one type are any-of", async () => {
  // shirt or t-shirt
  expect(ids).toHaveLength(5);
});
it("two types are all-of", async () => {
  // Category=shirt AND Colour=black
  expect(ids).toEqual([blackShirt]);
});
it("three types narrow further", async () => { ... });
it("untagged finds pieces with nothing in that type", async () => { expect(ids).toEqual([bare]); }); // FR-7.5
it("untagged combines with other filters as all-of", async () => { ... });
it("no filters returns everything", async () => { expect(total).toBe(79); });
it("excludes archived pieces unless asked", async () => { expect(ids).not.toContain(archivedId); });
it("reports a total independent of the page size", async () => { expect(total).toBe(14); });
it("paginates under filters without repeating or skipping", async () => { ... });
it("sorts by name ascending and descending", async () => { ... });
it("returns only the requesting user's pieces", async () => { expect(items).toHaveLength(0); });
// facets drive the filter sheet's counts
it("facetCounts counts each tag under the other active filters", async () => {
  // with Fabric=linen active, Colour counts reflect only linen pieces
  expect(counts[blackId]).toBe(2);
});
it("facetCounts counts a tag in the active type against the other types only", async () => {
  // otherwise selecting 'shirt' would make every other Category count zero
  expect(counts[tshirtId]).toBeGreaterThan(0);
});
// relax counts drive the nothing-matches screen
it("relaxCounts reports what dropping each filter would give", async () => {
  expect(relax).toEqual([
    { dropped: winterFilter, count: 2 },
    { dropped: silkFilter, count: 8 },
    { dropped: workOkFilter, count: 1 },
  ]);
});
// NFR-2.2 launch gate
it("filters a 1,000-piece wardrobe with 50 types and 1,000 tags in under 300ms", async () => {
  expect(Date.now() - start).toBeLessThan(300);
});
it("adding 40 unused tag types does not slow the same query", async () => { ... });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/query/filters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `queryItems` in `src/features/query/sql.ts`**

Each filter becomes one `EXISTS` subquery against `itemTags`, which makes all-of across types
and any-of within a type fall out of the shape rather than needing a `GROUP BY … HAVING
count(*)` trick. An `untagged` filter is `NOT EXISTS`. Cursor is `(createdAt, id)` or
`(lower(name), id)` depending on sort — never an offset, so a concurrent insert cannot cause a
skip.

The second facet test is the subtle one: a type's own facet counts must be computed with that
type's filter **excluded**, or selecting "shirt" shows every other Category at zero and the
filter sheet becomes unusable.

- [ ] **Step 4: Add the indexes NFR-2.2 needs**

`itemTags(tagId, itemId)` for the EXISTS probes and `items(userId, createdAt desc, id)` for
the default page. The second performance test exists to prove the vocabulary's *size* is not
in the query plan — cost must track matching pieces, not types defined.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- tests/features/query/filters.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: filter query with any-of within a type and all-of across types"
```

---

### Task 7: Search, and the API surface

**Files:**
- Create: `src/features/query/search.ts`, `src/features/query/parse-filters.ts`, `src/features/query/bands.ts`
- Modify: `src/app/api/items/route.ts`
- Create: `src/app/api/items/bands/route.ts`, `src/app/api/items/facets/route.ts`, `src/app/api/search/route.ts`
- Test: `tests/features/query/search.test.ts`, `tests/features/query/parse-filters.test.ts`, `tests/features/query/bands.test.ts`

**Interfaces:**
- Consumes: `queryItems`, `facetCounts`, `relaxCounts`, `listTagTypes`.
- Produces:
  ```ts
  type SearchHit = ItemSummary & {
    matchedOn: { field: 'name' }
             | { field: 'tag'; tagName: string }
             | { field: 'description'; tagName: string };
  };
  searchItems(input: { userId: string; q: string; limit?: number }): Promise<SearchHit[]>;
  parseFilters(input: { userId: string; params: URLSearchParams }):
    Promise<{ filters: TagFilter[]; sort: Sort; search?: string; dropped: string[] }>;
  listBands(q: Omit<ItemQuery,'limit'|'cursor'|'sort'>):
    Promise<{ bands: Array<{ tagId: string; name: string; count: number; preview: ItemSummary[] }>;
              droppedNames: string[] }>;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// search.test.ts — FR-7.8
it("matches an item name", async () => { expect(hit.matchedOn).toEqual({ field: "name" }); });
it("matches a tag name and says which tag", async () => {
  expect(hit.matchedOn).toEqual({ field: "tag", tagName: "linen" });
});
it("matches a tag description and says which tag", async () => {
  // "Cotton kurta" has no linen tag; its 'breathable' description mentions linen
  expect(hit.matchedOn).toEqual({ field: "description", tagName: "breathable" });
});
it("prefers a name match over a tag match for the same piece", async () => { ... });
it("is case-insensitive", async () => { ... });
// Review Focus 5
it("treats % as a literal character, not a wildcard", async () => {
  expect(await searchItems({ userId, q: "%" })).toHaveLength(0);
});
it("treats _ and backslash as literal characters", async () => { expect(hits).toHaveLength(0); });
it("returns nothing for an empty or whitespace query", async () => { expect(hits).toHaveLength(0); });
it("searches only the requesting user's wardrobe", async () => { expect(hits).toHaveLength(0); });

// parse-filters.test.ts — Review Focus 3, FR-7.12
it("parses tag filters grouped by type from the query string", async () => { ... });
it("parses untagged filters", async () => { expect(filters[0]).toEqual({ tagTypeId, untagged: true }); });
it("drops an unknown tag id and names what it dropped", async () => {
  const r = await parseFilters({ userId, params: new URLSearchParams("tag=deleted-id&tag=" + linen) });
  expect(r.filters).toHaveLength(1);
  expect(r.dropped).toEqual(["deleted-id"]);
});
it("drops a tag in a hidden type", async () => { expect(r.dropped).toHaveLength(1); });
it("drops another user's tag id", async () => { expect(r.filters).toHaveLength(0); });
it("falls back to the default sort on an unknown sort value", async () => { expect(r.sort).toBe("newest"); });

// bands.test.ts
it("returns one band per Category tag with its matching count", async () => { ... });
it("counts under the active filters, not totals", async () => { expect(band.count).toBe(4); });
it("drops bands with no matches and names them", async () => {
  expect(r.bands.map(b => b.name)).toEqual(["Shirts","Pants","Outerwear"]);
  expect(r.droppedNames).toEqual(["Tops","Dresses","Skirts","Shoes","Accessories"]);
});
it("returns at most six preview pieces per band", async () => { expect(band.preview).toHaveLength(6); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/features/query/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `searchItems`**

`ILIKE` with `%` and `_` and `\` escaped in the user's string — Review Focus 5 — then one
query per match source combined with `UNION ALL` and a priority column so name beats tag
beats description for the same piece. `matchedOn` is what makes a description match legible
in the UI rather than looking like a bug.

- [ ] **Step 4: Implement `parseFilters`**

Validates every id against the user's own visible vocabulary and returns what it dropped
instead of failing. A bookmarked filter whose tag was later deleted must still show a useful
wardrobe and say what it could not apply.

- [ ] **Step 5: Implement `listBands` and wire the four routes**

`GET /api/items` gains `tag`, `untagged`, `sort`, `q`, and returns `dropped`.
`GET /api/items/bands`, `GET /api/items/facets` (facets plus relax counts),
`GET /api/search`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/features/query/`
Expected: PASS, 20 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: search over names tags and descriptions, bands, facets, and filter parsing"
```

---

### Task 8: Several photographs per piece

**Files:**
- Create: `src/features/items/photos.ts`, `src/app/api/items/[itemId]/photos/route.ts`
- Test: `tests/features/items/photos.test.ts`

**Interfaces:**
- Consumes: `photos`, `items`, `createItemFromPhoto`'s storage path, `enqueueProcessPhoto`.
- Produces: `addPhotoToItem(input: { userId: string; itemId: string; bytes: Buffer }): Promise<Result<{ photoId: string }, CreateItemError>>`; `setPrimaryPhoto(input: { userId: string; itemId: string; photoId: string }): Promise<Result<void, 'not_found'>>`; `deletePhoto(input: { userId: string; itemId: string; photoId: string }): Promise<Result<void, 'not_found' | 'last_photo'>>`; `listPhotos(input: { userId: string; itemId: string }): Promise<Result<Array<{ id: string; isPrimary: boolean; status: string }>, 'item_not_found'>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("adds a second photograph to a piece", async () => { expect(photos).toHaveLength(2); });
it("the first photograph stays primary", async () => { expect(primary.id).toBe(first); });
it("promotes another photograph to primary", async () => { ... });
it("reuses the caps and size checks from item creation", async () => { expect(r.error).toBe("too_large"); });
it("counts every photograph against the storage cap", async () => { expect(r.error).toBe("storage_cap_reached"); });
it("deletes a non-primary photograph and its objects", async () => { ... });
it("promotes the next photograph when the primary is deleted", async () => { expect(newPrimary).toBe(second); });
it("refuses to delete the only photograph", async () => { expect(r.error).toBe("last_photo"); });
it("refuses a photograph belonging to another user's piece", async () => { expect(r.error).toBe("not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/items/photos.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the four functions**

`addPhotoToItem` reuses `createItemFromPhoto`'s ordering and its NFR-5.2 cleanup — the only
difference is it attaches to an existing item instead of creating one. Refusing to delete the
last photograph keeps FR-2.1's invariant that a piece always has one; deleting the piece is
Task 9's job.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/items/photos.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: several photographs per piece with an explicit primary"
```

---

### Task 9: Archive, restore, and delete

**Files:**
- Modify: `src/db/schema.ts` (`items.archivedAt`)
- Create: `src/features/items/lifecycle.ts`, `src/app/api/items/[itemId]/route.ts`, `src/app/api/items/archived/route.ts`
- Test: `tests/features/items/lifecycle.test.ts`

**Interfaces:**
- Consumes: `items`, `photos`, `getObjectStore`, `checkCaps`.
- Produces: `archiveItem(input: { userId: string; itemId: string }): Promise<Result<void, 'not_found'>>`; `restoreItem(input: { userId: string; itemId: string }): Promise<Result<void, 'not_found' | 'item_cap_reached'>>`; `listArchived(input: { userId: string }): Promise<Array<ItemSummary & { archivedAt: string; outfitCount: number }>>`; `previewDeleteItem(input: { userId: string; itemId: string }): Promise<Result<{ photoCount: number; affectedOutfits: Array<{ id: string; name: string; remaining: number }> }, 'not_found'>>`; `deleteItem(input: { userId: string; itemId: string }): Promise<Result<void, 'not_found'>>`.

- [ ] **Step 1: Write the failing test**

```ts
it("archives a piece out of the wardrobe", async () => { expect(ids).not.toContain(itemId); }); // FR-8.2
it("an archived piece stops counting against the item cap", async () => { expect(r.ok).toBe(true); });
it("lists archived pieces with when they were archived", async () => { expect(a[0].archivedAt).toBeTruthy(); });
it("restores a piece to the wardrobe", async () => { expect(ids).toContain(itemId); }); // FR-8.3
it("refuses a restore that would exceed the item cap", async () => { expect(r.error).toBe("item_cap_reached"); });
it("archiving is idempotent", async () => { ... });
// FR-8.4
it("reports photograph count and affected outfits before deleting", async () => {
  expect(preview.value.photoCount).toBe(3);
  expect(preview.value.affectedOutfits).toEqual([]); // plan 4 fills this
});
it("deletes the piece, its photo rows, and its stored objects", async () => {
  await deleteItem({ userId, itemId });
  expect(await store.list(`users/${userId}/photos/${photoId}/`)).toHaveLength(0);
});
it("deletes its tag links but not the tags", async () => { expect(await db.select().from(tags)).toHaveLength(n); });
it("deletes an archived piece", async () => { ... });
it("leaves another user's pieces untouched", async () => { expect(r.error).toBe("not_found"); });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/features/items/lifecycle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the five functions**

`archivedAt` is a nullable timestamp; `queryItems` already excludes archived unless asked
(Task 6). Caps count unarchived pieces only, which is what makes archiving the real answer
to a full wardrobe. `previewDeleteItem` returns `affectedOutfits: []` here with the shape plan
4 will populate — the UI reads the array either way, so plan 4 adds data, not a component.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/items/lifecycle.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: archive, restore, and permanent deletion of pieces"
```

---

### Task 10: The filter sheet

**Files:**
- Create: `src/components/FilterSheet.tsx`, `src/components/FilterChips.tsx`, `src/components/TagChip.tsx`, `src/hooks/useFilters.ts`
- Test: `tests/components/FilterSheet.test.tsx`

**Interfaces:**
- Consumes: `GET /api/items/facets`, `parseFilters`'s URL shape, tokens and `HitArea`.
- Produces: `useFilters(): { filters: TagFilter[]; toggle(tagTypeId: string, tagId: string): void; toggleUntagged(tagTypeId: string): void; clear(): void; clearOne(f: TagFilter): void; matchCount: number }` — state lives in the URL (FR-7.12).

- [ ] **Step 1: Write the failing test**

```ts
it("groups tags by type with a count on each", async () => { expect(screen.getByText("linen")).toBeVisible(); });
it("shows the shipped and the user's own types with no distinction", async () => { ... }); // FR-5.1
it("states the filter logic on screen", async () => {
  expect(screen.getByText(/within a group to widen/i)).toBeVisible();
}); // UI design §6
it("offers 'not tagged' in every group", async () => { expect(screen.getAllByText(/not tagged/i)).toHaveLength(5); });
it("counts the result in the footer before applying", async () => {
  expect(screen.getByRole("button", { name: /show 9 pieces/i })).toBeVisible();
});
it("toggling a tag updates the URL, not component state", async () => { expect(url.searchParams.getAll("tag")).toContain(linen); });
it("clear removes every filter", async () => { ... });
it("renders active filters as removable chips with one clear", async () => { ... }); // FR-7.6
it("omits hidden types", async () => { expect(screen.queryByText("Occasion")).toBeNull(); });
it("every tappable chip has at least 44px of hit area", async () => { ... }); // NFR-8.2
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/FilterSheet.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the hook and three components**

Filter state lives in the URL so FR-7.12's bookmarkable filters come free and the back button
behaves. Chips use `HitArea` from plan 1 Task 14 rather than growing. Copy comes from the UI
design doc, including the logic sentence — it is a requirement made visible, not decoration.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/FilterSheet.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: filter sheet over the whole vocabulary, with state in the url"
```

---

### Task 11: The four wardrobe states

**Files:**
- Modify: `src/app/(app)/wardrobe/page.tsx`, `src/components/ItemGrid.tsx`
- Create: `src/components/CategoryBands.tsx`, `src/components/CategoryView.tsx`, `src/components/NoMatches.tsx`, `src/components/ViewSwitch.tsx`
- Test: `tests/components/CategoryBands.test.tsx`, `tests/components/NoMatches.test.tsx`

**Interfaces:**
- Consumes: `GET /api/items/bands`, `GET /api/items`, `useFilters`, `GET /api/items/facets`.
- Produces: the Categories, Everything, Inside-a-category and Nothing-matches states.

- [ ] **Step 1: Write the failing test**

```ts
// CategoryBands
it("renders a band per category with its matching count", async () => { expect(screen.getByText(/see all 23/i)).toBeVisible(); });
it("shows matching counts, not totals, when filtered", async () => { expect(screen.getByText(/see all 4/i)).toBeVisible(); });
it("names the categories it dropped", async () => {
  expect(screen.getByText(/Tops, Dresses, Skirts, Shoes and Accessories/)).toBeVisible();
}); // UI design §6
it("tapping a band header opens that category", async () => { expect(url.pathname).toMatch(/category/); });
it("the switch moves to Everything without clearing filters", async () => {
  expect(url.searchParams.getAll("tag")).toHaveLength(2);
});
it("inside a category, quick filters are tags those pieces actually carry", async () => {
  expect(screen.getByText(/linen 6/i)).toBeVisible();
  expect(screen.queryByText(/silk/i)).toBeNull();
});
it("inside a category offers a named way back", async () => { expect(screen.getByText(/all categories/i)).toBeVisible(); });

// NoMatches — FR-7.7
it("says what you do own", async () => { expect(screen.getByText(/4 silk pieces/i)).toBeVisible(); });
it("prices dropping each filter", async () => { expect(screen.getByText(/without winter/i)).toBeVisible(); });
it("dropping a filter from here applies it", async () => { ... });
it("offers clear all last", async () => { ... });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/CategoryBands.test.tsx tests/components/NoMatches.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the four components and rework the page**

Bands are horizontal fans of 74x96 chips per the design doc; the chip's field is the piece's
Colour tag with the cutout knocked out. **Two chip states the design doc flags as undrawn and
this task must decide:** no Colour tag falls back to `var(--cut)`; several Colour tags use the
first as the field with a narrow second band for the next.

The dropped-categories sentence is required, not optional — a band vanishing under a filter
reads as a bug without it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/`
Expected: PASS, 11 new tests plus plan 1's grid tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: category bands, everything, inside a category, and nothing matches"
```

---

### Task 12: Editing a piece

**Files:**
- Create: `src/app/(app)/items/[itemId]/edit/page.tsx`, `src/components/TagEditor.tsx`, `src/components/TagPicker.tsx`, `src/components/PhotoStrip.tsx`
- Modify: `src/app/(app)/items/[itemId]/page.tsx`
- Test: `tests/components/TagEditor.test.tsx`, `tests/components/TagPicker.test.tsx`

**Interfaces:**
- Consumes: `listItemTags`, `addItemTag`, `replaceItemTag`, `removeItemTag`, `listTags`, `createTag`, `listPhotos`, `setPrimaryPhoto`.
- Produces: the editing, add-a-tag and photographs screens.

- [ ] **Step 1: Write the failing test**

```ts
// TagEditor — FR-5.13
it("groups tags by type and states each rule", async () => {
  expect(screen.getByText(/colour · several allowed/i)).toBeVisible();
});
it("shows empty types with an add affordance", async () => { expect(within(season).getByText(/\+ add/)).toBeVisible(); });
it("distinguishes autofilled tags from ones you set", async () => { expect(autoChip).toHaveClass(/auto/); });
it("removing a tag calls removeItemTag, not deleteTag", async () => { expect(removeSpy).toHaveBeenCalled(); });
it("says removing a tag here does not delete it from the vocabulary", async () => {
  expect(screen.getByText(/only from this piece/i)).toBeVisible();
});
it("adding a second value in a one-value type replaces, after asking", async () => {
  expect(screen.getByText(/replace/i)).toBeVisible();
});
it("shows the derived name as placeholder text in the name field", async () => {
  expect(screen.getByPlaceholderText("Beige shirt")).toBeVisible();
}); // FR-2.5

// TagPicker — FR-5.10, FR-5.11
it("lists existing tags with their descriptions and counts", async () => {
  expect(screen.getByText(/loose weave, creases easily/i)).toBeVisible();
  expect(screen.getByText(/11 pieces/i)).toBeVisible();
});
it("filters as you type", async () => { ... });
it("offers creation last, labelled as new", async () => {
  const opts = screen.getAllByRole("option");
  expect(opts[opts.length - 1]).toHaveTextContent(/new tag/i);
});
it("creating from here adds the tag to the piece in one step", async () => { ... });
it("an inline tag with no type chosen lands in General", async () => { expect(created.tagTypeId).toBe(generalId); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/TagEditor.test.tsx tests/components/TagPicker.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the three components and both pages**

The picker's descriptions and counts are the whole point of the screen — a plain filtered
list is how a vocabulary fragments into *linen*, *Linen* and *linen-ish*. Creation sits last
and labelled so inventing is deliberate (FR-5.10), and an untyped inline tag lands in General
so capture never forces a taxonomy decision.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/TagEditor.test.tsx tests/components/TagPicker.test.tsx`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: edit a piece's tags, with autocomplete over existing vocabulary"
```

---

### Task 13: The vocabulary screens

**Files:**
- Create: `src/app/(app)/vocabulary/page.tsx`, `src/app/(app)/vocabulary/[tagTypeId]/page.tsx`, `src/app/(app)/vocabulary/tag/[tagId]/page.tsx`, `src/components/MergeTags.tsx`, `src/components/TagTypeForm.tsx`
- Create: `src/app/api/vocabulary/**` routes
- Test: `tests/components/MergeTags.test.tsx`, `tests/app/vocabulary-routes.test.ts`

**Interfaces:**
- Consumes: every function from Tasks 2 and 3.
- Produces: the Your-tags, One-tag, Merging and One-tag-type screens.

- [ ] **Step 1: Write the failing test**

```ts
// routes
it("lists types with rules, tag counts, and builtin or yours", async () => { ... }); // FR-5.15
it("lists hidden types in their own group with their tag counts", async () => { ... }); // FR-5.4
it("creating a type from the sheet returns it ready to tag", async () => { expect(res.status).toBe(201); });
it("each vocabulary route refuses another user's ids", async () => { expect(res.status).toBe(404); });

// MergeTags — FR-5.12
it("names the survivor first and shows both descriptions", async () => {
  expect(screen.getByText(/keep/i)).toBeVisible();
  expect(screen.getByText(/mostly linen, less creasing/i)).toBeVisible();
});
it("warns the absorbed description is discarded", async () => {
  expect(screen.getByText(/description is discarded/i)).toBeVisible();
});
it("previews the resulting count", async () => { expect(screen.getByText(/14 pieces/i)).toBeVisible(); });
it("swaps which tag survives", async () => { ... });

// TagTypeForm
it("renders the four rules as switches", async () => { expect(screen.getAllByRole("switch")).toHaveLength(4); });
it("defaults autofill-may-invent to off and says why", async () => {
  expect(screen.getByText(/keeps the vocabulary yours/i)).toBeVisible();
});
it("offers hide above delete, with what each costs", async () => {
  expect(screen.getByText(/nothing is deleted/i)).toBeVisible();
  expect(screen.getByText(/removes 9 tags from 54 pieces/i)).toBeVisible();
});
it("a builtin type offers hide and no delete", async () => { expect(screen.queryByText(/delete this type/i)).toBeNull(); });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/MergeTags.test.tsx tests/app/vocabulary-routes.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the routes, three pages and two components**

The merge screen is built around one hazard: the absorbed tag's description is thrown away,
and that is easy to do by accident. Both descriptions are visible so anything worth keeping
can be copied first. The One-tag screen surfaces `suggestMerges` — nobody goes looking for
duplicates, so this is the only place merge ever gets used.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/components/MergeTags.test.tsx tests/app/vocabulary-routes.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: vocabulary management — types, tags, descriptions, and merging"
```

---

### Task 14: Search, sorting, and the archive

**Files:**
- Create: `src/app/(app)/search/page.tsx`, `src/components/SearchHits.tsx`, `src/components/SortSheet.tsx`, `src/app/(app)/archived/page.tsx`
- Test: `tests/components/SearchHits.test.tsx`, `tests/components/SortSheet.test.tsx`, `tests/app/archived.test.tsx`

**Interfaces:**
- Consumes: `GET /api/search`, `GET /api/items` sort params, `listArchived`, `restoreItem`, `previewDeleteItem`, `deleteItem`.
- Produces: the Search, Sorting and Archived screens.

- [ ] **Step 1: Write the failing test**

```ts
// SearchHits — the UI design's addition
it("says why each row matched", async () => {
  expect(screen.getByText(/^name$/)).toBeVisible();
  expect(screen.getByText(/tagged linen/i)).toBeVisible();
});
it("shows the description that matched, with the term marked", async () => {
  expect(screen.getByText(/description of breathable/i)).toBeVisible();
});
it("shows each hit's category", async () => { ... });
it("explains that description matches count", async () => {
  expect(screen.getByText(/a tag you wrote mentions/i)).toBeVisible();
});

// SortSheet — FR-7.9
it("offers four piece orderings and marks the active one", async () => { ... });
it("offers category ordering separately", async () => { expect(screen.getByText(/most pieces first/i)).toBeVisible(); });
it("applying a sort puts it in the URL", async () => { expect(url.searchParams.get("sort")).toBe("name_asc"); });

// Archived — FR-8.3
it("lists archived pieces with when and how many outfits", async () => { ... });
it("restores in one tap with no confirmation", async () => { ... });
it("offers a bulk delete only for pieces in no outfits", async () => {
  expect(screen.getByRole("button", { name: /delete the 2 in no outfits/i })).toBeVisible();
});
it("deleting from here names the affected outfits first", async () => { ... });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/components/SearchHits.test.tsx tests/components/SortSheet.test.tsx tests/app/archived.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the three pages and two components**

The "why it matched" label is what makes searching descriptions a feature rather than a
mystery. The archive's outfit count is zero for every piece until plan 4 — the column and the
bulk action are built now and become meaningful then.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — everything from plans 1 and 2.

- [ ] **Step 5: Re-measure NFR-2.2 against the deployment**

Seed 1,000 pieces, 50 tag types and 1,000 tags, then on a throttled phone profile record a
filter apply, a three-filter apply, a band load and a search. The 300 ms gate now has a real
vocabulary behind it, which Task 6's unit test approximates but does not prove. Append to
`docs/superpowers/plans/notes/01-launch-gates.md` with the date and device.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: search, sorting, and the archive; re-measure the filter gate"
```

---

## Requirement coverage

| Req | Task | Req | Task |
|---|---|---|---|
| FR-5.1 one mechanism | 1, 10 | FR-7.1 grid, newest first | 6, 11 |
| FR-5.2 built-ins shipped | 1 | FR-7.2 filter by tags | 6, 10 |
| FR-5.3 create/rename/reorder/delete types | 2, 13 | FR-7.3 one surface, grouped | 10 |
| FR-5.4 hide a built-in | 2, 13 | FR-7.4 any-of / all-of | 6, 10 |
| FR-5.5 create tags in any type | 3, 12 | FR-7.5 untagged filter | 6, 10 |
| FR-5.6 name, type, description | 3, 13 | FR-7.6 removable chips | 10 |
| FR-5.7 one or several | 2, 4 | FR-7.7 count and empty states | 7, 11 |
| FR-5.8 items / outfits / both | 2 | FR-7.8 text search | 7, 14 |
| FR-5.9 autofill suggest / invent | 2, 13 | FR-7.9 sort | 7, 14 |
| FR-5.10 inline creation | 12 | FR-7.10 piece detail | 12 |
| FR-5.11 autocomplete | 12 | FR-7.11 outfits containing | *plan 4* |
| FR-5.12 rename/delete/move/merge | 3, 13 | FR-7.12 URL-addressable | 7, 10 |
| FR-5.13 editable any time | 4, 12 | FR-8.1 edit a piece | 12 |
| FR-5.14 machine vs user | 4, 12 | FR-8.2 archive | 9 (reduced) |
| FR-5.15 browse the vocabulary | 13 | FR-8.3 view and restore | 9, 14 |
| FR-5.16 private | 1 | FR-8.4 delete, naming outfits | 9 (reduced) |
| FR-2.4 several photos | 8 | FR-2.5 derived name | 5 |

---

## Hand-off to Plan 3

- **FR-8.2 and FR-8.4** are complete except for outfits, which plan 4 fills via
  `previewDeleteItem`'s `affectedOutfits` and `listArchived`'s `outfitCount`.
- **`listTags` and `listTagTypes` are what plan 3's autofill reads.** Plan 3 builds a bounded
  vocabulary slice on top; it must not add a second way to read the vocabulary.
- **`autofillSuggest` and `autofillInvent` are stored and editable but unused** until plan 3.
  They are already in the type rules and the UI, so plan 3 consumes them rather than adding
  them.
- **`itemTags.source`** distinguishes `'user'` from `'auto'`. Plan 3 writes `'auto'` on
  accepted proposals; the editing UI already renders the distinction.
- **Do not change `queryItems`' signature.** Plan 4's outfit filtering reuses it for
  "outfits containing a piece that is X".

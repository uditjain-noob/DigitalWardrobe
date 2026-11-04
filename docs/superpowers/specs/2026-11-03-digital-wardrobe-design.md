# Digital Wardrobe — Design

**Date:** 2026-11-03
**Status:** Design, pending approval

---

## 1. Intent

A web app that holds a photographic record of everything you own to wear, so you can
answer questions about your own wardrobe when you are not standing in front of it.

Three moments drive this:

1. **Away from home** — you need to decide what to wear, or pack, without the wardrobe
   in front of you.
2. **Shopping** — you are in a store and need to know what you already own before you
   buy something near-identical to it.
3. **Searching by style** — you want to see every item you own of a particular kind,
   colour, or style at once, which is something a physical wardrobe cannot show you.

Alongside those: outfits that worked are worth keeping, so you can recall them later
instead of re-deriving them.

Four things follow from this and shape everything below.

**Capture has to be nearly free.** If adding a garment takes real effort, the wardrobe
goes stale and every other feature becomes worthless. A photo is the only required input,
and all describing is optional and deferrable.

**Photos arrive in every condition** — on a bed, on a hanger, held up in a shop, in bad
light, against a patterned wall. Left alone, a grid of them reads as a camera roll rather
than a wardrobe, and scanning forty shirts gets harder, which is the exact job the app
exists for. So every photo is normalised (section 6.4).

**The user's vocabulary is the point.** "Style" means something different to everybody.
The app ships a starting vocabulary but the user can extend it, invent their own
dimensions, and write down what each of their terms means — and because those meanings are
written down, autofill can apply the user's own vocabulary rather than only the app's
(section 6.5, FR-6.3).

**The app is a record of clothes that actually exist.** Nothing in the pipeline may invent
or alter a garment's appearance. This is why normalisation is constrained to matting
(FR-4.2) and why every machine-derived value is correctable.

---

## 2. Goals

- Add a garment in under ten seconds, from a phone, with one photo.
- Turn photos taken in any condition into a visually consistent, scannable wardrobe.
- Let the user describe clothes in their own words, in their own dimensions, and have
  autofill use that vocabulary.
- Answer "what do I own that is X?" in a few taps, for any X the user can express.
- Keep named, tagged outfits that can be browsed and filtered later.
- Work from a phone browser, away from home, with no app install.
- Multi-user with open signup: anyone can register and keeps their own private wardrobe.
- Carry no per-use AI cost for the operator: every provider call runs on a credential the
  user supplied.

## 3. Non-goals

These are deliberately out of scope. Not rejected forever — just not this.

- Pinning outfits to specific calendar dates, trip planners, or a "what to wear today"
  scheduler. The outfit store is a browsable library, not a calendar.
- Automatic outfit generation or recommendation ("the app picks for you").
- Weather, occasion, or location-driven suggestions.
- Wear tracking, laundry state, cost-per-wear analytics.
- A social feed, public profiles, likes, or following.
- Retail integration, shopping links, price tracking, or affiliate commerce.
- Paid tiers, billing, or subscriptions. Resource use is bounded by caps (section 7.7),
  not by charging.
- Self-hosting any model. The operator has no GPU and no appetite for model hosting; all
  image intelligence is a third-party API call (NFR-3.8).
- Sharing a tag vocabulary between accounts, or a public library of tag types. Every
  user's vocabulary is their own.
- Native iOS/Android apps.
- Offline use. Phase 1 is online-only; see NFR-1.4 for the constraint that keeps a later
  offline phase affordable.

## 4. Anti-goals

Outcomes that would make this a failure even if every feature technically worked.

- **Describing an item feels like data entry.** If the user must complete a form to make an
  item usable, the wardrobe will not get populated. Everything in section 6.5 is optional.
- **A vocabulary the user cannot extend.** If "linen", "work-ok", or "monsoon" cannot be
  expressed — or can be expressed but only as a flat afterthought the app does not
  understand — the style search the whole thing exists for does not work.
- **Setup before value.** Provider credentials are optional and plural, but the app must be
  worth using with none configured, and must be fully capable with exactly one. Multiple
  credentials are a fallback facility for people who want one, never a prerequisite.
- **A garment is redrawn rather than cut out.** A generative model asked to remove a
  background can alter a collar, soften a pattern, or shift a colour. The wardrobe would
  then be a record of clothes the user does not own, and they would have no way to know.
  Matting only (FR-4.2).
- **Normalisation that quietly ruins photos.** A clipped sleeve or a haloed edge is worse
  than an untouched photo, and worse still if the user cannot tell it happened or undo it.
  The original is always kept and always recoverable (FR-4.4, FR-4.6).
- **Autofill output that cannot be corrected,** or that quietly invents vocabulary. Every
  machine-derived value is editable, and a tag autofill wants to create must be confirmed
  before it exists (FR-6.5).
- **Paying twice for one failure.** Falling back to a second provider when the first one
  worked and the photo was simply unusable spends the user's money for nothing (FR-3.6).
- **Unusable on a phone on mobile data.** The primary moments are all away from a desk.
- **Someone else can see your wardrobe.** Photos of your clothes, and of yourself, are
  personal. Any leakage beyond the providers the user chose is a failure.
- **Signup becomes a way to spend the operator's money.** AI cost sits with the user's own
  credentials, but storage and bandwidth are the operator's. Open signup without caps is an
  abuse vector (section 7.7).

---

## 5. Users and primary journeys

One user type: a person managing their own wardrobe. No moderator or admin role.

| # | Journey | Trigger |
|---|---------|---------|
| J1 | Add a new garment | Just bought or discovered an untracked item |
| J2 | Find items by attribute | Deciding what to wear, or shopping |
| J3 | Build and save an outfit | A combination worked and is worth keeping |
| J4 | Save an outfit from a photo of yourself | A mirror or event photo captures a good outfit |
| J5 | Browse saved outfits | Recalling a known-good combination |
| J6 | Retire a garment | Item given away, worn out, or sold |
| J7 | Teach the app a new dimension | Realising the wardrobe needs "fabric" or "fit" to be searchable |

---

## 6. Functional Requirements

### 6.1 Accounts and access

- **FR-1.1** Anyone can create an account with an email address and a password. Signup is
  open; no invitation is required.
- **FR-1.2** A new account must verify its email address, via a link sent to it, before it
  can add items. Browsing an empty wardrobe before verifying is allowed; uploading is not,
  because uploading is what consumes storage.
- **FR-1.3** A user can sign in, sign out, and reset a forgotten password via a link sent
  to their email address.
- **FR-1.4** A plain-language statement of what the app stores, and of what leaves the
  app's own infrastructure, is reachable from the signup screen (see NFR-4.5).
- **FR-1.5** Each account owns exactly one wardrobe. All items, outfits, tag types, tags,
  and provider credentials belong to that account.
- **FR-1.6** A wardrobe and everything in it is visible only to its owner. There is no
  mechanism in this design by which one user can see another user's content.
- **FR-1.7** A user can delete their account. Their items, outfits, stored photos, tag
  vocabulary, and stored credentials are permanently deleted.

### 6.2 Adding an item

- **FR-2.1** A user can add an item by supplying one photo, either taken with the device
  camera or chosen from the device's photo library. One photo produces one item.
- **FR-2.2** The photo is the only required input. An item created from a photo alone is a
  valid, fully usable item — it appears in the wardrobe, can be filtered on whatever tags
  it has, and can be added to outfits.
- **FR-2.3** A user can add many photos in one session and have each become its own item,
  without being made to tag any of them. The flow is built for the first-session case of
  digitising an existing wardrobe: up to 100 photos in one go, with visible per-photo
  progress, automatic retry of failures, and the ability to leave and come back without
  losing what already uploaded.
- **FR-2.4** An item may hold more than one photo. One is the primary photo, used as the
  thumbnail everywhere the item is listed.
- **FR-2.5** A user can give an item a name. If they do not, the app shows a name derived
  from its Category and Colour tags where present (e.g. "Beige overshirt"), so no item is
  nameless in a list.

### 6.3 Provider credentials

Two features call out to third-party services: background matting (6.4) and attribute
reading (6.6). Both run on credentials the user supplies, so the operator carries no
per-use cost. A user may hold several credentials and order them as fallbacks.

- **FR-3.1 Supported providers are an enumeration.** The app knows a fixed, named set of
  providers. Each entry in that set declares how it is authenticated, how it is called,
  and which of the two capabilities — **matting** and **attribute reading** — it can serve.
  A provider may serve one or both. Adding support for a new provider is a change to this
  enumeration and its adapter, nothing else (NFR-9.1).
- **FR-3.2 Credentials are a list.** A user can add any number of credentials. Each holds:
  the provider, chosen from the enumeration; a label of the user's own choosing, so two
  credentials with the same provider are distinguishable; the secret; and which of the
  provider's capabilities this credential is to be used for.
- **FR-3.3** The list is **ordered, per capability**. For a given capability, the app uses
  the highest-ranked enabled credential that offers it, and the ones below it are
  fallbacks. A credential may rank differently for matting than for attribute reading.
- **FR-3.4** A user can reorder the list, edit a label, replace a secret, disable a
  credential without deleting it, and delete it outright. Disabling is there for the case
  of a key that has run out of quota this month and will work again next month.
- **FR-3.5** The user can see, at a glance, which credential is currently first in line for
  each capability, and which capabilities currently have no credential at all.
- **FR-3.6 Fallback is narrow and bounded.** It is attempted only on provider-side
  failures: authentication rejected, quota exhausted, rate limited, provider unreachable or
  erroring, or a response the adapter cannot parse. It is **never** attempted when a
  provider succeeded and the photo was simply unusable, because that spends money at a
  second provider for a call already known to be futile. At most a bounded number of
  credentials are tried per job.
- **FR-3.7** Each job records which credentials were attempted, in order, with the outcome
  of each, and the user can see this for any item — so "why did this cost me three calls"
  is answerable.
- **FR-3.8 Test connection.** Every credential has an explicit test action the user can run
  on demand. It exercises each capability the credential is marked for, separately, and
  reports per capability: passed, or failed with the specific reason (bad secret,
  capability not enabled on that account, quota exhausted, rate limited, unreachable).
- **FR-3.9** Before running, the test states that it makes a real, billable call. It uses
  the smallest request that still proves the capability works.
- **FR-3.10** A test result is shown next to the credential with the time it was taken, and
  is marked stale when the secret or the capability selection changes. It is presented as a
  snapshot, never as a standing guarantee.
- **FR-3.11** A user can test a single credential or every credential at once.
- **FR-3.12** After saving, a secret is never displayed back in full — only a masked hint
  sufficient to recognise which one it is.
- **FR-3.13** Settings states plainly what each capability is used for, that photos are sent
  to the chosen provider when it is used, and roughly what it will cost — a per-photo order
  of magnitude for each capability, so the user is not surprised by their own bill.
- **FR-3.14** With no credential for a capability, the app still works: items can be added,
  named, tagged by hand, filtered, searched, and built into outfits. Only that capability
  is unavailable, and it says so in place, in plain language, with a route to settings.
- **FR-3.15** A credential is never used for a capability it was not marked for, even when
  its provider supports that capability.

### 6.4 Image normalisation

Photos arrive in any condition. Normalisation is what makes a grid of them readable as a
wardrobe. It matters most in outfit previews, where three or four photos sit side by side
and three different backgrounds look like a mistake.

- **FR-4.1** Every uploaded garment photo is normalised: the garment is located, the
  background removed, and the result stored as a **cutout with an alpha channel**, trimmed
  to the garment and padded to a consistent aspect ratio. The cutout is produced by the
  matting capability of whichever credential is first in line (FR-3.3).

  **The neutral ground is not stored.** It is supplied by the active theme at render time
  and composited behind the cutout. Baking a ground colour into the stored image makes it
  wrong in one theme or the other — a grey chosen for a light theme is a grey hole in a
  dark one — and would mean reprocessing every photo to change it. Amended 2026-11-04 on
  the UI design's finding; see `2026-11-04-wardrobe-ui-design.md` §5.1.
- **FR-4.2 Matting, never generation.** The capability used must produce a mask or an
  alpha-cut image — it removes background pixels and nothing else. Generative image
  editing must not be used for this, even when it is available on the same credential and
  even when the result looks better: a model that can redraw the garment can silently
  falsify the record. No pixel of the garment itself may be invented or altered.
- **FR-4.3** Normalisation requires a credential for matting. Until one exists, photos are
  kept and shown as originals, and the app explains once, plainly, what normalisation
  would do and where to configure it (FR-3.14).
- **FR-4.4** The original photo is always retained, unmodified. Normalisation is additive
  and never destructive.
- **FR-4.5** Normalisation runs asynchronously, after the item already exists. The item is
  usable immediately and shows its original photo; the normalised version replaces it in
  grids and previews once ready. Capture is never blocked waiting for it (NFR-2.3).
- **FR-4.6** Per photo, the user can see the normalised and original versions, choose which
  one the app uses, and re-run normalisation. A bad result is always one tap from being
  undone.
- **FR-4.7** If normalisation fails, times out, or produces nothing usable, the item keeps
  its original photo and the user is not interrupted. Nothing about the item becomes
  unusable.
- **FR-4.8** The user can see which photos are still being processed, and is not made to
  wait on a screen while they are.
- **FR-4.9** Normalised images are what grids, thumbnails, and outfit previews use by
  default. Item detail offers the original at full size.
- **FR-4.10** A user can turn normalisation off for their whole account, in which case
  originals are used everywhere, no photo of theirs is sent for cutting out, and they are
  charged nothing for it.
- **FR-4.11** Because each normalisation costs the user money, a bulk session (FR-2.3)
  states how many photos will be processed before it begins, and the per-account rate
  limit in NFR-7.4 applies.

### 6.5 Describing items: tag types and tags

Everything descriptive on an item is a **tag**, and every tag belongs to a **tag type**. A
tag type is a dimension — Category, Colour, Season, Fabric, Fit. A tag is a value within
it — Shirt, Black, Monsoon, Linen, Oversized.

The app ships a starting vocabulary, but it is a starting point, not a fixed schema: the
user can extend it, invent dimensions the app never thought of, and record what their own
terms mean. Those recorded meanings are what let autofill speak the user's language
(FR-6.3).

- **FR-5.1** One mechanism describes items. There is no separate class of app-defined
  fields sitting above the user's own tags; the built-ins are tag types like any other.
- **FR-5.2** The app ships built-in tag types, pre-populated so a new wardrobe is useful
  immediately: **Category** (shirt, t-shirt, trousers, jeans, shorts, skirt, dress, jacket,
  knitwear, shoes, accessory, other), **Colour**, **Pattern**, and **Style** (casual,
  formal, business, athletic, loungewear, occasion). It also ships a **General** type as
  the home for quick tags created inline.
- **FR-5.3** A user can create their own tag types, rename them, reorder them, and delete
  them. Deleting a type is confirmed and the confirmation says how many items and outfits
  it will affect.
- **FR-5.4** A user can hide a built-in type they do not want, so it stops appearing in
  tagging and filtering, without deleting its data.
- **FR-5.5** A user can create tags inside any type, built-in types included. The shipped
  vocabularies are extendable, not fixed — a user who needs "overshirt" under Category can
  add it.
- **FR-5.6** Each tag has a **name**, the **type** it belongs to, and an optional
  **description** in the user's own words. The description says what the tag means — both
  to remind the user later and to tell autofill what to look for (FR-6.3). A tag like
  "work-ok" is useless to a machine without it and easy to forget without it.
- **FR-5.7** Each tag type declares whether an item may hold **one** tag from it or
  **several** — Category is naturally one, Colour and Season naturally several.
- **FR-5.8** Each tag type declares whether it applies to **items**, **outfits**, or both,
  so Category does not clutter outfit tagging and an outfit-only dimension like "Occasion"
  does not clutter item tagging.
- **FR-5.9** Each tag type declares whether autofill may propose values for it, and whether
  autofill may propose **new** tags within it or only existing ones (FR-6.5).
- **FR-5.10** While tagging an item, a user can create a tag on the spot without leaving the
  screen. An inline tag with no type chosen lands in **General**, and can be given a type
  and a description later. Speed of capture never requires a decision about taxonomy.
- **FR-5.11** When typing a tag, the user is offered tags they already have, so the same
  concept does not fragment into near-duplicate spellings.
- **FR-5.12** Across their whole wardrobe at once, a user can rename a tag, delete a tag,
  move a tag to a different type, and merge two tags into one. Merging matters because
  duplicates do appear, and a vocabulary nobody can tidy stops being trustworthy.
- **FR-5.13** Every tag on an item can be added, changed, or removed at any point in the
  item's life. Nothing is locked after creation.
- **FR-5.14** The app shows, per item, which tags were machine-derived and which the user
  set or confirmed.
- **FR-5.15** A user can browse their whole vocabulary — every type, its tags, their
  descriptions, and how many items carry each — and reach the matching items from it.
- **FR-5.16** Tag types and tags are private to the account, like everything else.

### 6.6 Autofill

- **FR-6.1** Autofill is user-triggered. It runs when the user taps an explicit control on
  the item, not automatically on upload.
- **FR-6.2** Autofill requires a credential for attribute reading (FR-3.2). Without one, the
  control is visible but inactive and explains what it needs.
- **FR-6.3 Autofill uses the user's own vocabulary.** It is given the tag types marked for
  autofill (FR-5.9), the tags within them, and each tag's description (FR-5.6), and asked
  which apply to the photo. This is the reason descriptions exist: a custom tag like
  "work-ok — plain enough for the office, no loud print" is actionable, where the bare word
  is not.
- **FR-6.4** Autofill analyses the item's primary photo — the normalised version where one
  exists, since a clean background improves the result.
- **FR-6.5** Where a type permits it (FR-5.9), autofill may propose a tag that does not
  exist yet. Such a proposal is clearly marked as new and creates nothing until the user
  accepts it. Vocabulary only grows by the user's consent.
- **FR-6.6** Proposed tags are presented for the user to accept, change, or discard before
  they are saved. Autofill never silently overwrites a tag the user set by hand, and
  respects each type's one-or-several rule (FR-5.7).
- **FR-6.7** Autofill can be re-run on an item at any time, any number of times. Re-running
  after the vocabulary has grown is a normal thing to do.
- **FR-6.8** A user can autofill a batch of items in one action and review the results
  together. Before it runs, the app states how many items will be analysed, because the
  cost falls on the user.
- **FR-6.9** If autofill fails or returns nothing, the item is unaffected. A failure never
  blocks an item from being saved or used.
- **FR-6.10** Provider failures are reported distinctly and in plain language, and are
  distinguished from "the model had nothing to say about this photo".
- **FR-6.11** The user can see that autofill is in progress, and the app remains usable
  while it runs.
- **FR-6.12** Where the vocabulary is too large to send in one request (NFR-2.7), the app
  says which types were considered, so a silently partial result is never passed off as a
  complete one.

### 6.7 Browsing, filtering, and search

- **FR-7.1** The wardrobe is presented as a grid of item photos, newest first by default.
- **FR-7.2** A user can filter the wardrobe by any tag in any visible tag type. Built-in
  types and the user's own types appear in the same filter surface, with no distinction
  drawn between them.
- **FR-7.3** The filter surface groups tags by type, so a long vocabulary stays navigable.
- **FR-7.4** Several filters can be active at once. Tags within one type combine as "any
  of" (Shirt or T-shirt); different types combine as "all of" (a Shirt **and** black).
- **FR-7.5** A user can filter for items that have **no** tag in a given type, which is how
  they find what still needs describing.
- **FR-7.6** Active filters are visible as removable chips, and can be cleared
  individually or all at once.
- **FR-7.7** The app shows how many items match the current filters, and shows a clear
  empty state when nothing matches.
- **FR-7.8** A user can search items by text, matching item names, tag names, and tag
  descriptions.
- **FR-7.9** A user can sort the wardrobe by date added and by name.
- **FR-7.10** Tapping an item opens its detail view: its photos, its tags grouped by type,
  and the saved outfits it appears in.
- **FR-7.11** From an item's detail view, the user can see and open the outfits that
  include it.
- **FR-7.12** A filtered view can be reached again by its URL, so a filter the user relies
  on can be bookmarked on their phone.

### 6.8 Editing and removing items

- **FR-8.1** A user can edit any item's name, photos, and tags.
- **FR-8.2** A user can archive an item. An archived item disappears from normal wardrobe
  browsing and from filter results, but stays attached to any outfit that already includes
  it, so historical outfits do not quietly lose pieces.
- **FR-8.3** A user can view their archived items and restore one to the active wardrobe.
- **FR-8.4** A user can permanently delete an item, which removes its photos — originals
  and normalised versions — and removes it from every outfit that contained it. Permanent
  deletion is confirmed before it happens, and the confirmation says which outfits will be
  affected.

### 6.9 Outfits — building from items

- **FR-9.1** An outfit is a named set of items from the user's own wardrobe. It is a set,
  not a template: there are no fixed slots, and nothing requires one top and one bottom.
- **FR-9.2** A user can create an outfit by selecting items from their wardrobe, with the
  same filters and search from 6.7 available while selecting.
- **FR-9.3** An outfit can contain two or more items. The same item can belong to any
  number of outfits.
- **FR-9.4** An outfit has a name. If the user does not supply one, the app assigns a
  placeholder the user can change.
- **FR-9.5** A user can tag an outfit, using the tag types marked as applying to outfits
  (FR-5.8), from the same vocabulary as items.
- **FR-9.6** A user can add items to and remove items from an existing outfit, and rename
  or re-tag it, at any time.
- **FR-9.7** A user can attach a photo to an outfit — for instance a photo of themselves
  wearing it — which becomes the outfit's cover image. Outfit cover photos are not
  normalised; FR-4.1 applies to garment photos, not photos of people.
- **FR-9.8** A user can delete an outfit. Deleting an outfit does not delete the items in
  it.
- **FR-9.9** An outfit's detail view lists its items, each opening to that item's detail
  view.

### 6.10 Outfits — from a photo of yourself (later phase)

- **FR-10.1** A user can create an outfit by uploading a photo of themselves wearing it.
- **FR-10.2** The app analyses the photo, identifies the garments visible in it, and
  derives tags for each. It then proposes wardrobe items whose tags match. This is
  **attribute-level matching**, not visual re-identification of a specific garment: the
  app proposes "your black formal trousers" from among candidates, and relies on the user
  to pick the right one. Per-photo image embeddings and a similarity index are explicitly
  not built, in Phase 1 or Phase 2.
- **FR-10.3** Proposed matches are shown for review before the outfit is saved. The user
  can accept a match, replace it with a different wardrobe item, or drop it. Where several
  wardrobe items match equally, the user is shown the candidates and chooses.
- **FR-10.4** Where a garment is detected in the photo but matches nothing in the wardrobe,
  the user is prompted to add it as a new item, and on accepting, that new item is created
  and included in the outfit.
- **FR-10.5** The uploaded photo is kept as the outfit's cover image (FR-9.7).
- **FR-10.6** If the analysis identifies nothing usable, the user falls back to building the
  outfit by hand (6.9) with the photo already attached.
- **FR-10.7** This analysis uses the attribute-reading capability, under the same credential
  rules as 6.3.

### 6.11 Browsing outfits

- **FR-11.1** Saved outfits are presented as a browsable library, showing each outfit's
  name, its tags, and a visual summary of the items in it, built from normalised item
  images so the summary reads as one piece.
- **FR-11.2** A user can filter outfits by their outfit tags, and search outfits by name.
- **FR-11.3** A user can filter outfits by the tags of the items they contain — for
  example, outfits containing something formal.
- **FR-11.4** Outfits can be sorted by date created and by name.

### 6.12 Access from a phone

- **FR-12.1** Every capability above is reachable from a phone browser. There is no
  desktop-only feature.
- **FR-12.2** Adding an item uses the phone's camera directly, without a separate
  save-then-upload step.
- **FR-12.3** A signed-in session persists across visits, so returning to the app from a
  phone does not require signing in again each time.
- **FR-12.4** The app is usable from any device the user signs in on, with the same
  wardrobe and the same photos.

---

## 7. Non-Functional Requirements

### 7.1 Platform and reach

- **NFR-1.1** A mobile-first responsive web app, served over HTTPS, usable on a phone
  browser with no install step.
- **NFR-1.2** Supported targets: current and previous major versions of Safari on iOS,
  Chrome on Android, and Chrome, Safari, Firefox, and Edge on desktop.
- **NFR-1.3** Hosted so it is reachable from anywhere on the public internet, not from the
  user's own machine.
- **NFR-1.4 Offline is out of scope now but must stay affordable later.** Phase 1 is
  online-only. Two structural constraints keep a later offline read-cache from becoming a
  client rewrite:
  - The client reads wardrobe data through an HTTP API returning data, not only as
    server-rendered HTML. Filtering and browsing must be satisfiable from data the client
    already holds.
  - Item photos are served from **stable, cacheable per-item URLs** (NFR-3.6), not from
    URLs that change per request.

  Nothing else about offline — no service worker, no cache, no sync — is built in Phase 1.
- **NFR-1.5** The deployment includes a mechanism for running work outside the request
  cycle, for normalisation and autofill jobs. No GPU, no model weights, and no unusual
  memory are required — the heavy lifting is a third-party API call — so an ordinary
  background worker or managed job runner is sufficient. What is ruled out is hosting that
  can only answer HTTP requests with no way to continue work after the response.

### 7.2 Performance

Targets are for a phone on a typical mobile connection, with a wardrobe of up to 500
items. NFR-2.1, 2.2, and 2.3 are **launch gates**: they are measured against a seeded
wardrobe of 1,000 items, 20 tag types, and 300 tags, on a throttled connection, before
release. NFR-2.4 and 2.5 are targets, not gates, because they depend on a third-party
provider.

- **NFR-2.1** First meaningful render of the wardrobe grid within 3 seconds on a cold
  load; within 1 second on a warm load.
- **NFR-2.2** Applying or clearing a filter updates results within 300 ms, and does not
  degrade as the user's vocabulary grows — the cost is in the number of matching items, not
  the number of tag types defined.
- **NFR-2.3** From choosing a photo to the item existing in the wardrobe: under 5 seconds.
  Only what is needed to show the item happens inline. Normalisation and thumbnailing
  happen afterwards and never block this.
- **NFR-2.4** A photo's normalised version is available within 60 seconds of upload at the
  95th percentile. A bulk session of 100 photos (FR-2.3) drains without starving single
  uploads made by other users, and respects each provider's own rate limits rather than
  being throttled or blocked by them.
- **NFR-2.5** Autofill returns within 10 seconds for a single item, before any fallback. It
  runs asynchronously: the user is never blocked waiting, and can leave the screen and come
  back to the result.
- **NFR-2.6** The wardrobe grid loads images progressively rather than all at once, and
  stays responsive while scrolling a large wardrobe.
- **NFR-2.7** The vocabulary sent to the attribute-reading provider is bounded, so a large
  vocabulary cannot make a request fail or grow without limit. The bound is a configuration
  value, the selection it makes is deterministic, and what was left out is reported to the
  user (FR-6.12).

### 7.3 Images

- **NFR-3.1** Photos are stored server-side so they are available from any device the user
  signs in on.
- **NFR-3.2** Uploaded photos are stored at a resolution good enough to view full-screen,
  and are not kept at full original camera resolution.
- **NFR-3.3** Thumbnails are generated server-side. Grid views are served thumbnails, not
  downscaled full images.
- **NFR-3.4** Accepted formats: JPEG, PNG, HEIC/HEIF, and WebP, up to 15 MB per photo.
  HEIC from iPhones is converted to a web-displayable format on upload.
- **NFR-3.5** Image orientation metadata is honoured, so photos are never shown rotated.
- **NFR-3.6 Serving.** Each photo has one stable application URL per version (original and
  normalised). A request to it is authorised against the signed-in user, and is then
  satisfied by redirecting to a short-lived signed storage URL. This is deliberate:
  ownership is checked on every request, the storage URL is unguessable and time-boxed,
  the bytes do not proxy through the application, and the stable outer URL remains
  cacheable — which is what NFR-1.4 depends on.
- **NFR-3.7 Pipeline.** Resize, format conversion, trimming, padding and thumbnailing happen
  locally. Background removal is a third-party API call (NFR-3.8). Both the original and the
  normalised version are stored for every photo, which roughly doubles per-photo storage —
  budgeted for in NFR-7.2.

  The normalised version is stored in a format carrying an alpha channel (FR-4.1), so it is
  **not** a JPEG. The ground is composited by the client from a theme token, never written
  into the file. Thumbnails of normalised images likewise keep their transparency.
- **NFR-3.8 Where background removal runs.** On a third-party service, called with one of
  the user's own credentials (FR-3.3). No model is hosted, downloaded, or run by this
  application, and no GPU is required. The capability used must be **matting** — a mask or
  alpha cutout — and explicitly not a generative image-editing endpoint, even where the
  same provider and credential offer one (FR-4.2).
- **NFR-3.9** Normalisation quality is assessed before launch against a deliberately
  awkward sample — garments on patterned bedding, on hangers against walls, held up in
  shops, in poor light, and more than one garment in frame. Two acceptance bars: a bad
  result is rare and always recoverable (FR-4.6, FR-4.7), and the garment in the output is
  verifiably the garment in the input, unaltered (FR-4.2).
- **NFR-3.10** Normalisation never modifies or replaces the stored original (FR-4.4).
- **NFR-3.11** The image sent for background removal is the smallest version that still
  yields a usable cutout, since the user is charged per call and may be charged by size.

### 7.4 Privacy and security

- **NFR-4.1** All traffic over HTTPS. No user content served over plain HTTP.
- **NFR-4.2** Passwords stored only as salted hashes using a current password-hashing
  algorithm. Never stored or logged in recoverable form.
- **NFR-4.3** Every read and write is authorised against the signed-in user. A user cannot
  reach another user's items, outfits, tags, photos, or credentials by guessing or
  manipulating an identifier.
- **NFR-4.4 Credentials.** Every stored secret is encrypted at rest with a key held outside
  the application's own database and outside the source tree. Secrets are never written to
  logs, never included in error messages, crash reports, or the job history in FR-3.7,
  and never returned to the client after being saved. A secret is purged when its
  credential is deleted and when the account is deleted. Holding several credentials
  multiplies nothing about this — each is protected identically.
- **NFR-4.5 Disclosure.** The statement in FR-1.4 and the settings copy in FR-3.13 say
  plainly: photos are stored on the app's servers; garment photos are sent to the provider
  of whichever credential is first in line, in order to cut out the background, and this
  happens automatically on upload unless the user turns normalisation off (FR-4.10);
  autofill sends a photo and the user's own tag vocabulary to the attribute-reading
  provider only when the user triggers it; a fallback may send the same photo to a second
  provider the user configured; each provider's terms are between the user and that
  provider; no user content is used to train models by this application; and photos of
  people attached to outfits are not sent anywhere (FR-9.7).
- **NFR-4.6** Account deletion removes photos — originals and normalised versions — from
  storage, not only the database rows pointing at them, within 30 days. The email address
  becomes re-registerable immediately.
- **NFR-4.7** Application logs do not contain photos or personal content, and never contain
  a secret or a request body carrying one.
- **NFR-4.8** Standard web protections: protection against cross-site request forgery,
  output escaping against injection, and rate limiting on signup, sign-in, password reset,
  email verification sends, upload, and the test action in FR-3.8.
- **NFR-4.9** Uploads are validated as actual images by inspecting content, not by trusting
  a filename or a declared type, and are processed in a way that does not let a malicious
  file reach a shell or execute.
- **NFR-4.10** Tag names and descriptions are user-supplied text that is later placed in a
  provider request. They are treated as data, never as instructions, and the request is
  built so that a tag description cannot redirect what the provider is asked to do.

### 7.5 Reliability and data safety

- **NFR-5.1** A user's wardrobe data and photos are backed up, with a documented restore
  procedure. The restore is exercised end-to-end before launch.
- **NFR-5.2** An interrupted upload leaves no half-created item and no orphaned photo.
- **NFR-5.3** A failure in normalisation degrades only appearance: items keep their
  original photos and everything else works (FR-4.7). A failure in autofill degrades only
  autofill. Neither can take the wardrobe down.
- **NFR-5.4** Jobs are retried on transient failure, with backoff, and give up after a
  bounded number of attempts rather than retrying forever. Retries and fallbacks together
  must not multiply what the user is charged beyond a stated bound, and a job that cannot
  be processed does not block the queue behind it.
- **NFR-5.5** A provider outage, quota exhaustion, or rate limit is distinguished from a
  genuine failure of the photo. The first class triggers fallback (FR-3.6); the second
  never does.
- **NFR-5.6** A provider whose credential is first in line but persistently failing is
  visible as such to the user, rather than silently costing them a wasted call on every
  job before the fallback succeeds.
- **NFR-5.7** Deleting a tag, a tag type, or a credential while a job referencing it is in
  flight leaves the system consistent: the job either completes against what it captured or
  is abandoned cleanly.
- **NFR-5.8** Errors are surfaced in plain language, saying what failed and what the user
  can do, never as a raw technical error.

### 7.6 Scale

- **NFR-6.1** Signup is open, but the expected population is small — the app is not being
  promoted. Sized for low thousands of accounts, each with up to roughly 1,000 items,
  several hundred outfits, 50 tag types, and 1,000 tags, without redesign. Growth beyond
  that is a capacity problem to be measured, not designed for in advance.
- **NFR-6.2** Filtering, search, and the outfit library stay within the NFR-2 targets at
  the top of that per-account range.
- **NFR-6.3** Job throughput is bounded by the providers' rate limits, not by the
  application's own capacity. Queue depth and per-provider error rates are observable.

### 7.7 Cost and abuse

Two different cost pictures sit side by side, and conflating them is how this gets
expensive. AI cost is the user's, on their own credentials. Storage and bandwidth are the
operator's, and open signup is what makes caps necessary.

- **NFR-7.1** The operator carries no per-use AI cost. Normalisation, autofill, and the
  test action all run on the requesting user's own credentials (FR-3.2), so all are bounded
  by that user's own provider quotas.
- **NFR-7.2** Operator running cost is hosting, the job runner, database, image storage,
  bandwidth, and transactional email only.
- **NFR-7.3** Per-account caps: a maximum item count, a maximum total stored bytes, and
  maximum counts of tag types and tags. On reaching a cap, the user is told plainly which
  limit they hit; existing content is never deleted or degraded. Caps are configurable
  without a code change, and the author's own account can be exempted.
- **NFR-7.4** Per-account rate limits on upload, normalisation, autofill, and connection
  tests. These protect the *user's* bill as much as the operator's infrastructure: a
  runaway retry loop, a fallback chain, or an accidental repeat of a 100-photo session must
  not quietly cost them money.
- **NFR-7.5** Email verification gates uploading (FR-1.2), so an unverified address cannot
  consume storage.
- **NFR-7.6** Total storage, job queue depth, per-provider error rates, and signup rate are
  observable, with a signal when any crosses a threshold — so trouble is noticed from a
  dashboard rather than from a bill.
- **NFR-7.7** Autofill results and normalised images are stored, not regenerated per
  request, so the same photo is never paid for twice unless the user asks for it.

### 7.8 Accessibility and usability

- **NFR-8.1** Text and interactive controls meet WCAG 2.1 AA contrast — 4.5:1 for body text,
  3:1 for large text and UI boundaries. Every theme's token set is asserted against these
  ratios by an automated test, so a later palette change cannot quietly break one. The
  measured table is in `2026-11-04-wardrobe-ui-design.md` §5.2.
- **NFR-8.2** Tap targets on phone are at least 44x44 points. **Visual size and hit area are
  decoupled:** chips, tabs and switches are drawn at 24-30px by design, and each gets its
  full hit area from padding or an overlay. This is a property of the shared components, not
  of each place they are used.
- **NFR-8.3** Every item photo carries meaningful alternative text, derived in this order:
  the item's name if set, otherwise its derived name, followed by its Category and Colour
  tags — "Linen shirt, a beige shirt".
- **NFR-8.4** The app is fully operable by keyboard on desktop, and labelled for screen
  readers.
- **NFR-8.5 Appearance.** Four themes ship. Each is a complete palette, two light-first and
  two dark-first, and each supplies the `--cut` ground that FR-4.1's alpha cutouts are
  composited onto.

  The setting offers five options, and **"Match my device" is the default**: it follows
  `prefers-color-scheme`, pairing one light theme with one dark one. Choosing a named theme
  pins it in both appearances. This is how four themes and "honours the device's setting"
  coexist. Palettes and pairings: `2026-11-04-wardrobe-ui-design.md` §2.1.
- **NFR-8.6** Managing the vocabulary and the credential list is usable on a phone, not
  only on desktop — reordering credentials and editing a tag description included
  (FR-12.1).

### 7.9 Maintainability

- **NFR-9.1** Each supported provider is an adapter behind one internal boundary that
  exposes exactly two capabilities, matting and attribute reading. Adding a provider means
  adding an entry to the enumeration and an adapter; it must require no change to item,
  tag, filter, outfit, or job-orchestration logic.
- **NFR-9.2** Credential selection, ordering, and fallback live in one place, not spread
  through the features that call providers, so FR-3.6's narrowness is enforced once.
- **NFR-9.3** The built-in tag types and their shipped tags are seed data, not schema. A
  built-in type is the same kind of record as a user-created one, and changing the shipped
  vocabulary requires no migration.
- **NFR-9.4** Automated tests cover the tag and filter logic, the item and outfit
  lifecycle, tag rename/move/merge/delete across items and outfits, the normalisation and
  autofill jobs' success, failure, retry and fallback paths, and authorisation boundaries
  between users.
- **NFR-9.5** Normalisation, autofill, and the test action are all testable without calling
  a live provider and without a real secret.
- **NFR-9.6** A test asserts that the generative-editing path is not reachable for
  normalisation (FR-4.2), so the rule cannot be lost to a later refactor.
- **NFR-9.7** A test asserts that fallback does not fire on a non-provider failure
  (FR-3.6), since that rule costs the user money when it breaks and is otherwise invisible.

---

## 8. Phasing

**Phase 1 — the wardrobe.** Sections 6.1 through 6.9, 6.11, 6.12. Open signup with email
verification, photo capture including the bulk first session, the credential list with
test connection and fallback, image normalisation, the tag vocabulary, autofill over the
user's own vocabulary, filtering and search, item lifecycle, outfits built by hand, outfit
library.

Phase 1 alone serves all three driving moments. It is the releasable product.

Suggested order within Phase 1, so the thing becomes useful early:

1. Accounts.
2. Capture and the item grid.
3. Tag types and tags, hand tagging, filtering and search — the first point at which the
   app is worth using, and it needs no credential at all.
4. The credential list, with test connection before anything consumes a credential. Being
   able to prove a key works before a job depends on it is worth having early.
5. Normalisation. Prove it on the awkward sample in NFR-3.9 before wiring it into the
   upload path — it is the piece most likely to disappoint, and a provider whose matting is
   not good enough is cheapest to discover here.
6. Autofill, which depends on the vocabulary from step 3 existing.
7. Outfits.

Ordering and fallback (FR-3.3, FR-3.6) can land after a single credential works
end-to-end; the credential list should be a list from the first commit, so nothing has to
be unpicked from a single-key assumption later.

**Phase 2 — outfits from a photo of yourself.** Section 6.10, including the
prompt-to-add-a-new-item step (FR-10.4), which the user explicitly placed in a later phase.

Nothing in Phase 1 should assume outfits are only ever assembled by hand — FR-9.7's
outfit cover photo is the seam Phase 2 builds on.

**Later, unscheduled.**

- **Offline browsing.** A cached, installable version so the wardrobe can be browsed and
  filtered with no signal — the shop case. NFR-1.4 is what makes this a feature rather
  than a rewrite.
- **Sharing.** Showing a wardrobe or an outfit to another account. Deliberately not
  designed here; wardrobes are private by default (FR-1.6) and any future sharing is
  opt-in per wardrobe or per outfit, never on by default.

---

## 9. Decisions made and decisions left open

### Settled with the user

- Photo is the only required input; describing is optional and deferrable.
- **Every photo is normalised** — background removed, garment on a consistent ground —
  because photos arrive in any condition and an unnormalised grid reads as a camera roll.
- **Background removal is a paid third-party API, not a self-hosted model.** The operator
  has no GPU and no appetite for hosting one.
- **Providers are an enumeration and credentials are a list**, not a single key. A user can
  hold several, order them, and have later ones act as fallbacks.
- **Every credential has an explicit test-connection action.**
- **The user can create tag types as well as tags**, and every tag carries a description.
- **Autofill uses the user's own tags and their descriptions**, not only an app-defined
  vocabulary. This is what descriptions are for.
- Autofill is a button the user taps, not automatic on upload; re-runnable.
- Filters span the shipped vocabulary and the user's own, in one surface.
- Outfits are sets of items, named, with their own tags.
- Outfits are a browsable library, not a calendar — no pinning to dates.
- A second route to creating an outfit, from a photo of yourself, with
  prompt-to-add-unmatched-items deferred to a later phase.
- Multi-user with private wardrobes.
- **Open signup**, no invitations. The app is not being promoted to anyone, so the
  exposure is accepted and handled with caps rather than gates.
- **Online-only in Phase 1**, with offline browsing kept open as a later phase — which is
  what NFR-1.4's two constraints exist to protect.

### Consequences of the paid-API choice, for the record

- Garment photos leave the app's infrastructure automatically on upload, where
  self-hosting would have sent nothing anywhere. This is disclosed at signup and in
  settings (NFR-4.5), and FR-4.10 lets a user switch it off entirely.
- A configured fallback means the same photo may reach a second provider. Also disclosed.
- Normalisation stays automatic rather than becoming a button, because a half-normalised
  grid is worse than either extreme. The guards against surprise cost are the pre-flight
  count on bulk sessions (FR-4.11), the rate limits in NFR-7.4, the bound on retries and
  fallbacks (NFR-5.4), and the account-level off switch.
- Hosting needs no GPU and no unusual memory — only a way to run work after a response
  (NFR-1.5).

### My calls, not the user's — flagged for review

- **The built-in attributes are tag types, not separate fixed fields** (FR-5.1, FR-5.2).
  Category, Colour, Pattern, and Style ship pre-populated but are the same kind of record
  as a type the user creates. One tagging mechanism, one filter mechanism, one autofill
  mechanism — and the user's own dimensions are first-class rather than second-tier. This
  is the largest structural call in the document and the one most worth challenging; the
  alternative is keeping four hard-coded fields alongside the tag system, which means
  building and testing everything twice.
- Per-type rules rather than global ones: one-or-several values (FR-5.7), applies to
  items/outfits/both (FR-5.8), and whether autofill may propose into it and may invent new
  tags in it (FR-5.9). Without the last one, autofill into free-form types would sprawl the
  vocabulary.
- A **General** type as the landing place for quick inline tags (FR-5.2, FR-5.10), so fast
  capture never forces a taxonomy decision.
- Tag **merge** as well as rename, move, and delete (FR-5.12) — duplicates appear, and a
  vocabulary nobody can tidy stops being trusted.
- Hiding a built-in type rather than only deleting it (FR-5.4).
- Credential ordering is **per capability** (FR-3.3), since a provider good at matting is
  not necessarily the one you want reading attributes.
- **Fallback fires only on provider-side failures, never on an unusable photo** (FR-3.6),
  enforced by a test (NFR-9.7). This rule spends the user's money when it breaks and is
  otherwise invisible.
- The per-item attempt history in FR-3.7, so a user can see what their calls were spent on.
- The test action makes a real billable call and says so first (FR-3.9); its result is a
  timestamped snapshot that goes stale, not a standing guarantee (FR-3.10).
- Tag names and descriptions are treated as untrusted data when composing a provider
  request (NFR-4.10) — they are user text heading into a model prompt.
- The vocabulary sent to a provider is bounded, deterministically selected, and what was
  omitted is reported (NFR-2.7, FR-6.12), rather than passing off a partial result as
  complete.
- Filtering for items with **no** tag in a type (FR-7.5), which is how a user finds what
  still needs describing.
- Search covers tag descriptions as well as names (FR-7.8).
- **Matting only, never generative image editing, for normalisation** (FR-4.2), enforced by
  a test (NFR-9.6).
- Normalisation is automatic on every garment photo, asynchronous, non-destructive,
  revertible per photo, and switchable off per account (6.4).
- Outfit cover photos — pictures of people — are not normalised and are not sent to any
  provider (FR-9.7).
- Email-and-password sign-in rather than third-party sign-in; verification required before
  uploading rather than before browsing (FR-1.2); password reset by emailed link, which
  requires a transactional email sender.
- Per-account caps now include tag-type and tag counts (NFR-7.3), with an exemption for
  the author's own account.
- Archive-and-restore as distinct from permanent deletion, so removing a garment does not
  silently gut saved outfits.
- Filter combination semantics in FR-7.4 ("any of" within a type, "all of" across types).
- Autofill reads the normalised image where one exists (FR-6.4).
- Batch autofill (FR-6.8), with the item count shown before it runs because it is the
  user's money.
- Bulk first-session capture sized at 100 photos with retry and resume (FR-2.3).
- Phase 2 matching is attribute-level, with no image embeddings or similarity index in any
  phase (FR-10.2).
- Stable per-item photo URL, authorised per request, redirecting to a short-lived signed
  storage URL (NFR-3.6).
- NFR-2.1, 2.2, and 2.3 as hard launch gates measured on a seeded 1,000-item wardrobe with
  a 300-tag vocabulary; NFR-2.4 and 2.5 as targets only.
- Specific performance, scale, storage, and image-handling numbers throughout section 7.

### Left to the builder

- Language, framework, database, hosting provider, image storage mechanism, job runner,
  and transactional email provider.
- **Which providers populate the enumeration at launch**, subject to the hard constraints
  that at least one offers matting good enough against NFR-3.9's awkward sample, that
  generative editing is not used for normalisation (FR-4.2), and that one credential can be
  enough for a user who wants only one.
- The neutral ground colour and padding ratio used by normalisation, subject to NFR-8.5.
- The exact shipped contents of the built-in tag types.
- How the vocabulary is composed into an attribute-reading request, within NFR-2.7 and
  NFR-4.10.
- The numeric values of the caps in NFR-7.3, the rate limits in NFR-7.4, and the fallback
  and retry bounds in FR-3.6 and NFR-5.4.
- Data model, API shape, and client architecture, within the NFR-1.4 constraints.
- How tag filtering is indexed to hit NFR-2.2 at the scale in NFR-6.1.
- Where the encryption key for stored secrets lives (NFR-4.4).
- Visual design beyond the mobile-first and accessibility constraints above.

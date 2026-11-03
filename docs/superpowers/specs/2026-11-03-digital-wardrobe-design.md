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

Capture has to be nearly free. If adding a garment takes real effort, the wardrobe goes
stale and every other feature becomes worthless. That is why a photo is the only required
input and all attribute entry is optional and deferrable.

---

## 2. Goals

- Add a garment in under ten seconds, from a phone, with one photo.
- Answer "what do I own that is X?" in a few taps, where X combines app-derived
  attributes and the user's own vocabulary.
- Keep named, tagged outfits that can be browsed and filtered later.
- Work from a phone browser, away from home, with no app install.
- Multi-user: each person keeps their own private wardrobe.

## 3. Non-goals

These are deliberately out of scope. Not rejected forever — just not this.

- Open public signup. Accounts are created by invitation (section 6.1).
- Pinning outfits to specific calendar dates, trip planners, or a "what to wear today"
  scheduler. The outfit store is a browsable library, not a calendar.
- Automatic outfit generation or recommendation ("the app picks for you").
- Weather, occasion, or location-driven suggestions.
- Wear tracking, laundry state, cost-per-wear analytics.
- A social feed, public profiles, likes, or following.
- Retail integration, shopping links, price tracking, or affiliate commerce.
- Native iOS/Android apps.
- Offline use. Phase 1 is online-only; see section 7.1 for the constraint that keeps a
  later offline phase affordable.

## 4. Anti-goals

Outcomes that would make this a failure even if every feature technically worked.

- **Tagging feels like data entry.** If the user must complete a form to make an item
  usable, the wardrobe will not get populated.
- **A rigid taxonomy that cannot hold the user's own language.** If "linen", "work-ok",
  or "monsoon" cannot be expressed, the style search the whole thing exists for does not
  work.
- **Autofill output that cannot be corrected.** Every machine-derived value must be
  editable and overridable, permanently.
- **Unusable on a phone on mobile data.** The primary moments are all away from a desk.
- **Someone else can see your wardrobe.** Photos of your clothes, and of yourself, are
  personal. Any leakage is a failure.
- **The operator carries an unbounded AI bill.** Autofill runs on each user's own
  provider key (section 6.4), so per-use cost sits with the person spending it.

---

## 5. Users and primary journeys

One user type: a person managing their own wardrobe. No moderator role. There is an
operator who issues invitations, which needs no in-app UI in Phase 1.

| # | Journey | Trigger |
|---|---------|---------|
| J1 | Add a new garment | Just bought or discovered an untracked item |
| J2 | Find items by attribute | Deciding what to wear, or shopping |
| J3 | Build and save an outfit | A combination worked and is worth keeping |
| J4 | Save an outfit from a photo of yourself | A mirror or event photo captures a good outfit |
| J5 | Browse saved outfits | Recalling a known-good combination |
| J6 | Retire a garment | Item given away, worn out, or sold |

---

## 6. Functional Requirements

### 6.1 Accounts and access

- **FR-1.1** Accounts are created by invitation. A visitor holding a valid invitation can
  create an account with an email address and a password. There is no open signup form.
- **FR-1.2** An invitation is single-use, is tied to no particular email address, and
  expires if unused. Issuing one requires no in-app interface in Phase 1; a command-line
  or direct-database route is sufficient.
- **FR-1.3** Accepting an invitation proves control of the email address, so no separate
  verification step is needed before the wardrobe becomes usable.
- **FR-1.4** A user can sign in, sign out, and reset a forgotten password via a link sent
  to their email address.
- **FR-1.5** Each account owns exactly one wardrobe. All items and outfits belong to that
  wardrobe.
- **FR-1.6** A wardrobe and everything in it — items, photos, tags, outfits — is visible
  only to its owner. There is no mechanism in this design by which one user can see
  another user's content.
- **FR-1.7** A user can delete their account. Their items, outfits, stored photos, and
  stored provider key are permanently deleted.

### 6.2 Adding an item

- **FR-2.1** A user can add an item by supplying one photo, either taken with the device
  camera or chosen from the device's photo library. One photo produces one item.
- **FR-2.2** The photo is the only required input. An item created from a photo alone is a
  valid, fully usable item — it appears in the wardrobe, can be filtered on whatever
  attributes it has, and can be added to outfits.
- **FR-2.3** A user can add many photos in one session and have each become its own item,
  without being made to tag any of them. The flow is built for the first-session case of
  digitising an existing wardrobe: up to 100 photos in one go, with visible per-photo
  progress, automatic retry of failures, and the ability to leave and come back without
  losing what already uploaded.
- **FR-2.4** An item may hold more than one photo. One is the primary photo, used as the
  thumbnail everywhere the item is listed.
- **FR-2.5** A user can give an item a name. If they do not, the app shows a name derived
  from the item's attributes (e.g. "Beige overshirt") so no item is nameless in a list.

### 6.3 Item attributes and tags

Two kinds of descriptive data sit on an item, and the distinction is visible to the user.

- **FR-3.1 Structured attributes.** Each item has a defined set of attribute fields:
  category, colour, pattern, and style. Each may be empty. These are the fields autofill
  populates, and they drive the standard filters.
- **FR-3.2 Category** comes from an app-defined list covering the normal garment types
  (shirt, t-shirt, trousers, jeans, shorts, skirt, dress, jacket, knitwear, shoes,
  accessory, and so on), plus "other".
- **FR-3.3 Colour and pattern** come from app-defined lists. An item may carry more than
  one colour.
- **FR-3.4 Style** comes from an app-defined list (casual, formal, business, athletic,
  loungewear, occasion, and so on). An item may carry more than one style.
- **FR-3.5 Free-form tags.** A user can attach any number of their own tags to an item,
  as free text of their own invention. The app does not constrain the vocabulary.
- **FR-3.6** When typing a tag, the user is offered tags they have already used elsewhere
  in their wardrobe, so the same concept does not fragment into near-duplicate spellings.
- **FR-3.7** A user can rename one of their own tags across their whole wardrobe at once,
  and delete a tag from their whole wardrobe at once. Both apply to items and outfits
  together, since they share one vocabulary.
- **FR-3.8** Every structured attribute and every tag can be edited, added, or removed at
  any point in an item's life, including long after it was created. No field is locked
  after creation.
- **FR-3.9** The app shows, per item, which structured attributes were machine-derived and
  which the user set or corrected.

### 6.4 Autofill

Autofill runs on the user's own vision-provider account, using a key they supply. The
operator pays nothing per use, and the user can see and control what they spend.

- **FR-4.1** A user can store a vision-provider API key in their settings, replace it, and
  remove it. The key is validated when saved, and the user is told immediately if it does
  not work.
- **FR-4.2** After saving, the key is never displayed back in full — only a masked hint
  sufficient to recognise which key it is.
- **FR-4.3** Until a key is stored, the autofill control is visible but inactive, and
  explains in plain language what it needs and where to add it. Everything else in the app
  works without a key.
- **FR-4.4** Autofill is user-triggered. It runs when the user taps an explicit control on
  the item, not automatically on upload.
- **FR-4.5** Autofill analyses the item's primary photo and proposes values for the
  structured attributes in FR-3.1, and may additionally propose free-form tags.
- **FR-4.6** Proposed values are presented for the user to accept, change, or discard
  before they are saved. Autofill never silently overwrites a value the user set by hand.
- **FR-4.7** Autofill can be re-run on an item at any time, any number of times.
- **FR-4.8** A user can autofill a batch of items in one action and review the results
  together. Before it runs, the app states how many items will be analysed, because the
  cost falls on the user.
- **FR-4.9** Provider failures are reported distinctly and in plain language — an invalid
  or revoked key, an exhausted quota, and a rate limit are different problems with
  different fixes, and are not collapsed into one generic error.
- **FR-4.10** If autofill fails or returns nothing, the item is unaffected. A failure never
  blocks an item from being saved or used.
- **FR-4.11** The user can see that autofill is in progress, and the app remains usable
  while it runs.

### 6.5 Browsing, filtering, and search

- **FR-5.1** The wardrobe is presented as a grid of item photos, newest first by default.
- **FR-5.2** A user can filter the wardrobe by structured attributes — category, colour,
  pattern, style.
- **FR-5.3** A user can filter the wardrobe by their own free-form tags. Structured
  attributes and own tags appear in the same filter surface and can be combined freely in
  one query; they are not separate modes.
- **FR-5.4** Several filters can be active at once. Values within one attribute combine as
  "any of" (Shirt or T-shirt); different attributes combine as "all of" (a Shirt **and**
  black). Free-form tags combine as "all of".
- **FR-5.5** Active filters are visible as removable chips, and can be cleared
  individually or all at once.
- **FR-5.6** The app shows how many items match the current filters, and shows a clear
  empty state when nothing matches.
- **FR-5.7** A user can search items by text, matching item names and tags.
- **FR-5.8** A user can sort the wardrobe by date added and by name.
- **FR-5.9** Tapping an item opens its detail view: its photos, its structured attributes,
  its tags, and the saved outfits it appears in.
- **FR-5.10** From an item's detail view, the user can see and open the outfits that
  include it.
- **FR-5.11** A filtered view can be reached again by its URL, so a filter the user relies
  on can be bookmarked on their phone.

### 6.6 Editing and removing items

- **FR-6.1** A user can edit any item's name, photos, attributes, and tags.
- **FR-6.2** A user can archive an item. An archived item disappears from normal wardrobe
  browsing and from filter results, but stays attached to any outfit that already includes
  it, so historical outfits do not quietly lose pieces.
- **FR-6.3** A user can view their archived items and restore one to the active wardrobe.
- **FR-6.4** A user can permanently delete an item, which removes its photos and removes
  it from every outfit that contained it. Permanent deletion is confirmed before it
  happens, and the confirmation says which outfits will be affected.

### 6.7 Outfits — building from items

- **FR-7.1** An outfit is a named set of items from the user's own wardrobe. It is a set,
  not a template: there are no fixed slots, and nothing requires one top and one bottom.
- **FR-7.2** A user can create an outfit by selecting items from their wardrobe, with the
  same filters and search from 6.5 available while selecting.
- **FR-7.3** An outfit can contain two or more items. The same item can belong to any
  number of outfits.
- **FR-7.4** An outfit has a name. If the user does not supply one, the app assigns a
  placeholder the user can change.
- **FR-7.5** A user can attach their own free-form tags to an outfit, drawn from the same
  tag vocabulary as items.
- **FR-7.6** A user can add items to and remove items from an existing outfit, and rename
  or re-tag it, at any time.
- **FR-7.7** A user can attach a photo to an outfit — for instance a photo of themselves
  wearing it — which becomes the outfit's cover image.
- **FR-7.8** A user can delete an outfit. Deleting an outfit does not delete the items in
  it.
- **FR-7.9** An outfit's detail view lists its items, each opening to that item's detail
  view.

### 6.8 Outfits — from a photo of yourself (later phase)

- **FR-8.1** A user can create an outfit by uploading a photo of themselves wearing it.
- **FR-8.2** The app analyses the photo, identifies the garments visible in it, and derives
  attributes for each. It then proposes wardrobe items whose attributes match. This is
  **attribute-level matching**, not visual re-identification of a specific garment: the
  app proposes "your black formal trousers" from among candidates, and relies on the user
  to pick the right one. Per-photo image embeddings and a similarity index are explicitly
  not built, in Phase 1 or Phase 2.
- **FR-8.3** Proposed matches are shown for review before the outfit is saved. The user can
  accept a match, replace it with a different wardrobe item, or drop it. Where several
  wardrobe items match equally, the user is shown the candidates and chooses.
- **FR-8.4** Where a garment is detected in the photo but matches nothing in the wardrobe,
  the user is prompted to add it as a new item, and on accepting, that new item is created
  and included in the outfit.
- **FR-8.5** The uploaded photo is kept as the outfit's cover image (FR-7.7).
- **FR-8.6** If the analysis identifies nothing usable, the user falls back to building the
  outfit by hand (6.7) with the photo already attached.
- **FR-8.7** This analysis runs on the user's own provider key, under the same rules as
  6.4.

### 6.9 Browsing outfits

- **FR-9.1** Saved outfits are presented as a browsable library, showing each outfit's
  name, its tags, and a visual summary of the items in it.
- **FR-9.2** A user can filter outfits by their own tags, and search outfits by name.
- **FR-9.3** A user can filter outfits by the attributes of the items they contain — for
  example, outfits containing something formal.
- **FR-9.4** Outfits can be sorted by date created and by name.

### 6.10 Access from a phone

- **FR-10.1** Every capability above is reachable from a phone browser. There is no
  desktop-only feature.
- **FR-10.2** Adding an item uses the phone's camera directly, without a separate
  save-then-upload step.
- **FR-10.3** A signed-in session persists across visits, so returning to the app from a
  phone does not require signing in again each time.
- **FR-10.4** The app is usable from any device the user signs in on, with the same
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
  - Item photos are served from **stable, cacheable per-item URLs** (see NFR-3.6), not
    from URLs that change per request.

  Nothing else about offline — no service worker, no cache, no sync — is built in Phase 1.

### 7.2 Performance

Targets are for a phone on a typical mobile connection, with a wardrobe of up to 500
items. NFR-2.1, 2.2, and 2.3 are **launch gates**: they are measured against a seeded
wardrobe of 1,000 items on a throttled connection before release. NFR-2.4 is a target, not
a gate, because it depends on a third-party provider.

- **NFR-2.1** First meaningful render of the wardrobe grid within 3 seconds on a cold
  load; within 1 second on a warm load.
- **NFR-2.2** Applying or clearing a filter updates results within 300 ms.
- **NFR-2.3** From choosing a photo to the item existing in the wardrobe: under 5 seconds.
  Image processing that is not needed to show the item happens afterwards and does not
  block the user.
- **NFR-2.4** Autofill returns within 10 seconds for a single item. It runs
  asynchronously: the user is never blocked waiting, and can leave the screen and come
  back to the result.
- **NFR-2.5** The wardrobe grid loads images progressively rather than all at once, and
  stays responsive while scrolling a large wardrobe.

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
- **NFR-3.6 Serving.** Each photo has one stable application URL. A request to it is
  authorised against the signed-in user, and is then satisfied by redirecting to a
  short-lived signed storage URL. This is deliberate: ownership is checked on every
  request, the storage URL is unguessable and time-boxed, the bytes do not proxy through
  the application, and the stable outer URL remains cacheable — which is what NFR-1.4
  depends on.
- **NFR-3.7** The image pipeline is **resize, format conversion, and thumbnailing only**.
  No background removal or garment cutout, in any phase. Items are shown as photographed.

### 7.4 Privacy and security

- **NFR-4.1** All traffic over HTTPS. No user content served over plain HTTP.
- **NFR-4.2** Passwords stored only as salted hashes using a current password-hashing
  algorithm. Never stored or logged in recoverable form.
- **NFR-4.3** Every read and write is authorised against the signed-in user. A user cannot
  reach another user's items, outfits, tags, or photos by guessing or manipulating an
  identifier.
- **NFR-4.4 Provider keys.** A stored vision-provider key is encrypted at rest with a key
  held outside the application's own database and outside the source tree. It is never
  written to logs, never included in error messages or crash reports, and never returned
  to the client after being saved. It is deleted when the user removes it and when the
  account is deleted.
- **NFR-4.5** Photos and item data are never used to train models by this application.
  When the user runs autofill, their photo is sent to the provider whose key they supplied,
  under that provider's terms — the app states this plainly at the point the key is added,
  and notes that those terms are between the user and their provider.
- **NFR-4.6** Account deletion removes photos from storage, not only the database rows
  pointing at them, within 30 days. The email address becomes re-registerable
  immediately.
- **NFR-4.7** Application logs do not contain photos or personal content.
- **NFR-4.8** Standard web protections: protection against cross-site request forgery,
  output escaping against injection, rate limiting on sign-in, on password reset, on
  invitation redemption, and on upload.

### 7.5 Reliability and data safety

- **NFR-5.1** A user's wardrobe data and photos are backed up, with a documented restore
  procedure. The restore is exercised end-to-end before anyone other than the author holds
  an account.
- **NFR-5.2** An interrupted upload leaves no half-created item and no orphaned photo.
- **NFR-5.3** A failure at the vision provider degrades only autofill. Adding, browsing,
  filtering, and outfits continue to work.
- **NFR-5.4** Errors are surfaced in plain language, saying what failed and what the user
  can do, never as a raw technical error.

### 7.6 Scale

- **NFR-6.1** Sized for low hundreds of invited accounts, each with up to roughly 1,000
  items and several hundred outfits. Open signup at larger scale is a later phase
  (section 8) and is not designed for here.
- **NFR-6.2** Filtering, search, and the outfit library stay within the NFR-2 targets at
  the top of that per-account range.

### 7.7 Cost

- **NFR-7.1** The operator carries no per-use AI cost. Every vision call runs on the
  requesting user's own key (FR-4.1), so autofill cost is bounded by that user's own
  provider quota, not by the operator's budget.
- **NFR-7.2** Operator running cost is hosting, database, image storage, bandwidth, and
  transactional email only — all bounded by the invited-account scale in NFR-6.1.
- **NFR-7.3** Autofill results are stored on the item, so the same photo is not re-analysed
  unless the user asks for it. This is now the user's money being saved, which makes it
  more important, not less.
- **NFR-7.4** Per-account rate limits on autofill still apply, to protect the provider
  relationship and to stop a runaway batch, not to protect the operator's bill.

### 7.8 Accessibility and usability

- **NFR-8.1** Text and interactive controls meet WCAG 2.1 AA contrast.
- **NFR-8.2** Tap targets on phone are at least 44x44 points.
- **NFR-8.3** Every item photo carries meaningful alternative text derived from the item's
  name and attributes.
- **NFR-8.4** The app is fully operable by keyboard on desktop, and labelled for screen
  readers.
- **NFR-8.5** Honours the device's light and dark appearance setting.

### 7.9 Maintainability

- **NFR-9.1** The vision provider sits behind an internal boundary, so it can be swapped
  without touching item, filter, or outfit logic. Because users supply their own keys, the
  boundary also carries which provider a given key belongs to.
- **NFR-9.2** The category, colour, pattern, and style vocabularies are defined in one
  place and extendable without a schema migration.
- **NFR-9.3** Automated tests cover the attribute and filter logic, the item and outfit
  lifecycle, and authorisation boundaries between users.
- **NFR-9.4** Autofill is testable without calling a live vision provider and without a
  real key.

---

## 8. Phasing

**Phase 1 — the wardrobe.** Sections 6.1 through 6.7, 6.9, 6.10. Invitation-based
accounts, photo capture including the bulk first session, attributes and own tags,
user-triggered autofill on the user's own key, filtering and search, item lifecycle,
outfits built by hand, outfit library.

Phase 1 alone serves all three driving moments. It is the releasable product.

Suggested order within Phase 1, so the thing becomes useful early: accounts → capture and
the item grid → attributes, tags, and filtering → autofill → outfits. Capture plus
filtering is the first point at which the app is worth using, and should be reached before
autofill is built.

**Phase 2 — outfits from a photo of yourself.** Section 6.8, including the
prompt-to-add-a-new-item step (FR-8.4), which the user explicitly placed in a later phase.

Nothing in Phase 1 should assume outfits are only ever assembled by hand — FR-7.7's
outfit cover photo is the seam Phase 2 builds on.

**Later, unscheduled.**

- **Offline browsing.** A cached, installable version so the wardrobe can be browsed and
  filtered with no signal — the shop case. NFR-1.4 is what makes this a feature rather
  than a rewrite.
- **Open signup.** Replacing invitations with public registration. Brings with it email
  verification, signup abuse protection, published terms and privacy policy, and the
  larger-scale assumptions NFR-6.1 declines to make.
- **Sharing.** Showing a wardrobe or an outfit to another account. Deliberately not
  designed here; wardrobes are private by default (FR-1.6) and any future sharing is
  opt-in per wardrobe or per outfit, never on by default.

---

## 9. Decisions made and decisions left open

### Settled with the user

- Photo is the only required input; tagging is optional and deferrable.
- Autofill is a button the user taps, not automatic on upload; re-runnable.
- Filters span app-derived attributes and the user's own tags together.
- Outfits are sets of items, named, with their own tags.
- Outfits are a browsable library, not a calendar — no pinning to dates.
- A second route to creating an outfit, from a photo of yourself, with
  prompt-to-add-unmatched-items deferred to a later phase.
- Multi-user with private wardrobes.
- **Invitation-only accounts** in Phase 1, rather than open public signup.
- **Each user supplies their own vision-provider API key**; the operator carries no
  per-use AI cost.
- **Online-only in Phase 1**, with offline browsing kept open as a later phase — which is
  what NFR-1.4's two constraints exist to protect.

### My calls, not the user's — flagged for review

- Mobile-first responsive web app rather than a native app; server-side photo storage;
  publicly hosted.
- Email-and-password sign-in rather than third-party sign-in; invitation acceptance stands
  in for email verification (FR-1.3); password reset by emailed link, which requires a
  transactional email sender.
- Invitations issued without an in-app admin interface in Phase 1 (FR-1.2).
- Archive-and-restore as distinct from permanent deletion, so removing a garment does not
  silently gut saved outfits.
- Filter combination semantics in FR-5.4 ("any of" within an attribute, "all of" across
  attributes).
- Tag rename and bulk delete (FR-3.7) and tag autocomplete (FR-3.6), to stop the user's
  own vocabulary fragmenting — the style search depends on it. One shared tag vocabulary
  across items and outfits.
- Batch autofill (FR-4.8), with the item count shown before it runs because it is the
  user's money.
- Bulk first-session capture sized at 100 photos with retry and resume (FR-2.3).
- Phase 2 matching is attribute-level, with no image embeddings or similarity index in any
  phase (FR-8.2) — this is what keeps Phase 1 from having to pay to process every photo.
- No background removal or cutout in the image pipeline, ever (NFR-3.7).
- Stable per-item photo URL, authorised per request, redirecting to a short-lived signed
  storage URL (NFR-3.6).
- NFR-2.1, 2.2, and 2.3 as hard launch gates measured on a 1,000-item seeded wardrobe;
  NFR-2.4 as a target only.
- Specific performance, scale, and image-handling numbers throughout section 7.

### Left to the builder

- Language, framework, database, hosting provider, image storage mechanism, and
  transactional email provider.
- Which vision providers are supported for user-supplied keys, behind the boundary in
  NFR-9.1.
- The exact contents of the category, colour, pattern, and style vocabularies.
- Data model, API shape, and client architecture, within the NFR-1.4 constraints.
- How attribute and tag filtering is indexed to hit NFR-2.2 at the scale in NFR-6.
- Where the encryption key for stored provider keys lives (NFR-4.4).
- Visual design beyond the mobile-first and accessibility constraints above.

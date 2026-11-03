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

Two things follow from this and shape everything below.

**Capture has to be nearly free.** If adding a garment takes real effort, the wardrobe
goes stale and every other feature becomes worthless. A photo is the only required input,
and all attribute entry is optional and deferrable.

**Photos arrive in every condition** — on a bed, on a hanger, held up in a shop, in bad
light, against a patterned wall. Left alone, a grid of them reads as a camera roll rather
than a wardrobe, and scanning forty shirts gets harder, which is the exact job the app
exists for. So the app normalises every photo (section 6.3).

---

## 2. Goals

- Add a garment in under ten seconds, from a phone, with one photo.
- Turn photos taken in any condition into a visually consistent, scannable wardrobe.
- Answer "what do I own that is X?" in a few taps, where X combines app-derived
  attributes and the user's own vocabulary.
- Keep named, tagged outfits that can be browsed and filtered later.
- Work from a phone browser, away from home, with no app install.
- Multi-user with open signup: anyone can register and keeps their own private wardrobe.

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
- Native iOS/Android apps.
- Offline use. Phase 1 is online-only; see NFR-1.4 for the constraint that keeps a later
  offline phase affordable.

## 4. Anti-goals

Outcomes that would make this a failure even if every feature technically worked.

- **Tagging feels like data entry.** If the user must complete a form to make an item
  usable, the wardrobe will not get populated.
- **A rigid taxonomy that cannot hold the user's own language.** If "linen", "work-ok",
  or "monsoon" cannot be expressed, the style search the whole thing exists for does not
  work.
- **Normalisation that quietly ruins photos.** A clipped sleeve or a haloed edge is worse
  than an untouched photo, and worse still if the user cannot tell it happened or undo it.
  The original is always kept and always recoverable (FR-3.2, FR-3.4).
- **Autofill output that cannot be corrected.** Every machine-derived value must be
  editable and overridable, permanently.
- **Unusable on a phone on mobile data.** The primary moments are all away from a desk.
- **Someone else can see your wardrobe.** Photos of your clothes, and of yourself, are
  personal. Any leakage is a failure.
- **Signup becomes a way to spend the operator's money.** Autofill runs on each user's own
  provider key, but storage and normalisation compute are the operator's. Open signup
  without caps is an abuse vector (section 7.7).

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

---

## 6. Functional Requirements

### 6.1 Accounts and access

- **FR-1.1** Anyone can create an account with an email address and a password. Signup is
  open; no invitation is required.
- **FR-1.2** A new account must verify its email address, via a link sent to it, before it
  can add items. Browsing an empty wardrobe before verifying is allowed; uploading is not,
  because uploading is what consumes storage and compute.
- **FR-1.3** A user can sign in, sign out, and reset a forgotten password via a link sent
  to their email address.
- **FR-1.4** A plain-language statement of what the app stores, and of what leaves the
  app's own infrastructure, is reachable from the signup screen (see NFR-4.5).
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

### 6.3 Image normalisation

Photos arrive in any condition. Normalisation is what makes a grid of them readable as a
wardrobe. It matters most in outfit previews, where three or four photos sit side by side
and three different backgrounds look like a mistake.

- **FR-3.1** Every uploaded photo is normalised: the garment is located, the background
  removed, and the garment placed on a uniform neutral ground with consistent padding and
  a consistent aspect ratio.
- **FR-3.2** The original photo is always retained, unmodified. Normalisation is additive
  and never destructive.
- **FR-3.3** Normalisation runs asynchronously, after the item already exists. The item is
  usable immediately and shows its original photo; the normalised version replaces it in
  grids and previews once ready. Capture is never blocked waiting for it (NFR-2.3).
- **FR-3.4** Per photo, the user can see the normalised and original versions, choose which
  one the app uses, and re-run normalisation. A bad result is always one tap from being
  undone.
- **FR-3.5** If normalisation fails, times out, or produces nothing usable, the item keeps
  its original photo and the user is not interrupted. Nothing about the item becomes
  unusable.
- **FR-3.6** The user can see which photos are still being processed, and is not made to
  wait on a screen while they are.
- **FR-3.7** Normalised images are what grids, thumbnails, and outfit previews use by
  default. Item detail offers the original at full size.
- **FR-3.8** A user can turn normalisation off for their whole account, in which case
  originals are used everywhere and no photo of theirs is processed.

### 6.4 Item attributes and tags

Two kinds of descriptive data sit on an item, and the distinction is visible to the user.

- **FR-4.1 Structured attributes.** Each item has a defined set of attribute fields:
  category, colour, pattern, and style. Each may be empty. These are the fields autofill
  populates, and they drive the standard filters.
- **FR-4.2 Category** comes from an app-defined list covering the normal garment types
  (shirt, t-shirt, trousers, jeans, shorts, skirt, dress, jacket, knitwear, shoes,
  accessory, and so on), plus "other".
- **FR-4.3 Colour and pattern** come from app-defined lists. An item may carry more than
  one colour.
- **FR-4.4 Style** comes from an app-defined list (casual, formal, business, athletic,
  loungewear, occasion, and so on). An item may carry more than one style.
- **FR-4.5 Free-form tags.** A user can attach any number of their own tags to an item,
  as free text of their own invention. The app does not constrain the vocabulary.
- **FR-4.6** When typing a tag, the user is offered tags they have already used elsewhere
  in their wardrobe, so the same concept does not fragment into near-duplicate spellings.
- **FR-4.7** A user can rename one of their own tags across their whole wardrobe at once,
  and delete a tag from their whole wardrobe at once. Both apply to items and outfits
  together, since they share one vocabulary.
- **FR-4.8** Every structured attribute and every tag can be edited, added, or removed at
  any point in an item's life, including long after it was created. No field is locked
  after creation.
- **FR-4.9** The app shows, per item, which structured attributes were machine-derived and
  which the user set or corrected.

### 6.5 Autofill

Autofill runs on the user's own vision-provider account, using a key they supply. The
operator pays nothing per use, and the user can see and control what they spend.

- **FR-5.1** A user can store a vision-provider API key in their settings, replace it, and
  remove it. The key is validated when saved, and the user is told immediately if it does
  not work.
- **FR-5.2** After saving, the key is never displayed back in full — only a masked hint
  sufficient to recognise which key it is.
- **FR-5.3** Until a key is stored, the autofill control is visible but inactive, and
  explains in plain language what it needs and where to add it. Everything else in the app
  works without a key.
- **FR-5.4** Autofill is user-triggered. It runs when the user taps an explicit control on
  the item, not automatically on upload.
- **FR-5.5** Autofill analyses the item's primary photo — the normalised version where one
  exists, since a clean background improves the result — and proposes values for the
  structured attributes in FR-4.1, and may additionally propose free-form tags.
- **FR-5.6** Proposed values are presented for the user to accept, change, or discard
  before they are saved. Autofill never silently overwrites a value the user set by hand.
- **FR-5.7** Autofill can be re-run on an item at any time, any number of times.
- **FR-5.8** A user can autofill a batch of items in one action and review the results
  together. Before it runs, the app states how many items will be analysed, because the
  cost falls on the user.
- **FR-5.9** Provider failures are reported distinctly and in plain language — an invalid
  or revoked key, an exhausted quota, and a rate limit are different problems with
  different fixes, and are not collapsed into one generic error.
- **FR-5.10** If autofill fails or returns nothing, the item is unaffected. A failure never
  blocks an item from being saved or used.
- **FR-5.11** The user can see that autofill is in progress, and the app remains usable
  while it runs.

### 6.6 Browsing, filtering, and search

- **FR-6.1** The wardrobe is presented as a grid of item photos, newest first by default.
- **FR-6.2** A user can filter the wardrobe by structured attributes — category, colour,
  pattern, style.
- **FR-6.3** A user can filter the wardrobe by their own free-form tags. Structured
  attributes and own tags appear in the same filter surface and can be combined freely in
  one query; they are not separate modes.
- **FR-6.4** Several filters can be active at once. Values within one attribute combine as
  "any of" (Shirt or T-shirt); different attributes combine as "all of" (a Shirt **and**
  black). Free-form tags combine as "all of".
- **FR-6.5** Active filters are visible as removable chips, and can be cleared
  individually or all at once.
- **FR-6.6** The app shows how many items match the current filters, and shows a clear
  empty state when nothing matches.
- **FR-6.7** A user can search items by text, matching item names and tags.
- **FR-6.8** A user can sort the wardrobe by date added and by name.
- **FR-6.9** Tapping an item opens its detail view: its photos, its structured attributes,
  its tags, and the saved outfits it appears in.
- **FR-6.10** From an item's detail view, the user can see and open the outfits that
  include it.
- **FR-6.11** A filtered view can be reached again by its URL, so a filter the user relies
  on can be bookmarked on their phone.

### 6.7 Editing and removing items

- **FR-7.1** A user can edit any item's name, photos, attributes, and tags.
- **FR-7.2** A user can archive an item. An archived item disappears from normal wardrobe
  browsing and from filter results, but stays attached to any outfit that already includes
  it, so historical outfits do not quietly lose pieces.
- **FR-7.3** A user can view their archived items and restore one to the active wardrobe.
- **FR-7.4** A user can permanently delete an item, which removes its photos — originals
  and normalised versions — and removes it from every outfit that contained it. Permanent
  deletion is confirmed before it happens, and the confirmation says which outfits will be
  affected.

### 6.8 Outfits — building from items

- **FR-8.1** An outfit is a named set of items from the user's own wardrobe. It is a set,
  not a template: there are no fixed slots, and nothing requires one top and one bottom.
- **FR-8.2** A user can create an outfit by selecting items from their wardrobe, with the
  same filters and search from 6.6 available while selecting.
- **FR-8.3** An outfit can contain two or more items. The same item can belong to any
  number of outfits.
- **FR-8.4** An outfit has a name. If the user does not supply one, the app assigns a
  placeholder the user can change.
- **FR-8.5** A user can attach their own free-form tags to an outfit, drawn from the same
  tag vocabulary as items.
- **FR-8.6** A user can add items to and remove items from an existing outfit, and rename
  or re-tag it, at any time.
- **FR-8.7** A user can attach a photo to an outfit — for instance a photo of themselves
  wearing it — which becomes the outfit's cover image. Outfit cover photos are not
  normalised; FR-3.1 applies to garment photos, not photos of people.
- **FR-8.8** A user can delete an outfit. Deleting an outfit does not delete the items in
  it.
- **FR-8.9** An outfit's detail view lists its items, each opening to that item's detail
  view.

### 6.9 Outfits — from a photo of yourself (later phase)

- **FR-9.1** A user can create an outfit by uploading a photo of themselves wearing it.
- **FR-9.2** The app analyses the photo, identifies the garments visible in it, and derives
  attributes for each. It then proposes wardrobe items whose attributes match. This is
  **attribute-level matching**, not visual re-identification of a specific garment: the
  app proposes "your black formal trousers" from among candidates, and relies on the user
  to pick the right one. Per-photo image embeddings and a similarity index are explicitly
  not built, in Phase 1 or Phase 2.
- **FR-9.3** Proposed matches are shown for review before the outfit is saved. The user can
  accept a match, replace it with a different wardrobe item, or drop it. Where several
  wardrobe items match equally, the user is shown the candidates and chooses.
- **FR-9.4** Where a garment is detected in the photo but matches nothing in the wardrobe,
  the user is prompted to add it as a new item, and on accepting, that new item is created
  and included in the outfit.
- **FR-9.5** The uploaded photo is kept as the outfit's cover image (FR-8.7).
- **FR-9.6** If the analysis identifies nothing usable, the user falls back to building the
  outfit by hand (6.8) with the photo already attached.
- **FR-9.7** This analysis runs on the user's own provider key, under the same rules as
  6.5.

### 6.10 Browsing outfits

- **FR-10.1** Saved outfits are presented as a browsable library, showing each outfit's
  name, its tags, and a visual summary of the items in it, built from normalised item
  images so the summary reads as one piece.
- **FR-10.2** A user can filter outfits by their own tags, and search outfits by name.
- **FR-10.3** A user can filter outfits by the attributes of the items they contain — for
  example, outfits containing something formal.
- **FR-10.4** Outfits can be sorted by date created and by name.

### 6.11 Access from a phone

- **FR-11.1** Every capability above is reachable from a phone browser. There is no
  desktop-only feature.
- **FR-11.2** Adding an item uses the phone's camera directly, without a separate
  save-then-upload step.
- **FR-11.3** A signed-in session persists across visits, so returning to the app from a
  phone does not require signing in again each time.
- **FR-11.4** The app is usable from any device the user signs in on, with the same
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
- **NFR-1.5** The deployment includes a background worker process, not only a web process.
  Image normalisation (NFR-3.8) and autofill both run there. This rules out hosting that
  offers request handling only.

### 7.2 Performance

Targets are for a phone on a typical mobile connection, with a wardrobe of up to 500
items. NFR-2.1, 2.2, and 2.3 are **launch gates**: they are measured against a seeded
wardrobe of 1,000 items on a throttled connection before release. NFR-2.4 and 2.5 are
targets, not gates, because they depend on queue depth and a third-party provider.

- **NFR-2.1** First meaningful render of the wardrobe grid within 3 seconds on a cold
  load; within 1 second on a warm load.
- **NFR-2.2** Applying or clearing a filter updates results within 300 ms.
- **NFR-2.3** From choosing a photo to the item existing in the wardrobe: under 5 seconds.
  Only what is needed to show the item happens inline. Normalisation and thumbnailing
  happen afterwards and never block this.
- **NFR-2.4** A photo's normalised version is available within 60 seconds of upload at the
  95th percentile under normal queue depth. A bulk session of 100 photos (FR-2.3) drains
  without starving single uploads made by other users.
- **NFR-2.5** Autofill returns within 10 seconds for a single item. It runs
  asynchronously: the user is never blocked waiting, and can leave the screen and come
  back to the result.
- **NFR-2.6** The wardrobe grid loads images progressively rather than all at once, and
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
- **NFR-3.6 Serving.** Each photo has one stable application URL per version (original and
  normalised). A request to it is authorised against the signed-in user, and is then
  satisfied by redirecting to a short-lived signed storage URL. This is deliberate:
  ownership is checked on every request, the storage URL is unguessable and time-boxed,
  the bytes do not proxy through the application, and the stable outer URL remains
  cacheable — which is what NFR-1.4 depends on.
- **NFR-3.7 Pipeline.** Resize, format conversion, thumbnailing, and garment segmentation
  with background replacement (FR-3.1). Both the original and the normalised version are
  stored for every photo, which roughly doubles per-photo storage — budgeted for in
  NFR-7.2.
- **NFR-3.8 Where segmentation runs.** On a **self-hosted model**, in the background
  worker, on the operator's own compute. No third-party per-image fee, and no user photo
  leaves the app's infrastructure for normalisation. This is the one place the app spends
  real compute per photo; it is why NFR-1.5 exists.
- **NFR-3.9** Segmentation quality is assessed before launch against a deliberately awkward
  sample — garments on patterned bedding, on hangers against walls, held up in shops, in
  poor light, and more than one garment in frame. The acceptance bar is that a bad result
  is rare and always recoverable (FR-3.4, FR-3.5), not that every result is perfect.
- **NFR-3.10** Normalisation never modifies or replaces the stored original (FR-3.2).

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
- **NFR-4.5 Disclosure.** The statement in FR-1.4 says plainly: photos are stored on the
  app's servers; normalisation happens there and sends nothing to anyone else; autofill,
  only when the user triggers it, sends the photo to the provider whose key the user
  supplied, under that provider's terms, which are between the user and that provider; and
  no user content is used to train models by this application.
- **NFR-4.6** Account deletion removes photos — originals and normalised versions — from
  storage, not only the database rows pointing at them, within 30 days. The email address
  becomes re-registerable immediately.
- **NFR-4.7** Application logs do not contain photos or personal content.
- **NFR-4.8** Standard web protections: protection against cross-site request forgery,
  output escaping against injection, and rate limiting on signup, sign-in, password reset,
  email verification sends, and upload.
- **NFR-4.9** Uploads are validated as actual images by inspecting content, not by trusting
  a filename or a declared type, and are processed in a way that does not let a malicious
  file reach a shell or execute.

### 7.5 Reliability and data safety

- **NFR-5.1** A user's wardrobe data and photos are backed up, with a documented restore
  procedure. The restore is exercised end-to-end before launch.
- **NFR-5.2** An interrupted upload leaves no half-created item and no orphaned photo.
- **NFR-5.3** A failure in normalisation degrades only appearance: items keep their
  original photos and everything else works (FR-3.5). A failure at the vision provider
  degrades only autofill.
- **NFR-5.4** Normalisation jobs are retried on transient failure and give up after a
  bounded number of attempts rather than retrying forever. A job that cannot be processed
  does not block the queue behind it.
- **NFR-5.5** Errors are surfaced in plain language, saying what failed and what the user
  can do, never as a raw technical error.

### 7.6 Scale

- **NFR-6.1** Signup is open, but the expected population is small — the app is not being
  promoted. Sized for low thousands of accounts, each with up to roughly 1,000 items and
  several hundred outfits, without redesign. Growth beyond that is a capacity problem to
  be measured, not designed for in advance.
- **NFR-6.2** Filtering, search, and the outfit library stay within the NFR-2 targets at
  the top of that per-account range.
- **NFR-6.3** The normalisation queue is sized so that one user's 100-photo bulk session
  does not stall other users' uploads (NFR-2.4), and so that queue depth is observable.

### 7.7 Cost and abuse

Open signup plus operator-funded storage and compute is an exposure, and caps are the
guardrail. These are protective limits, not a product tier.

- **NFR-7.1** The operator carries no per-use AI cost. Every vision call runs on the
  requesting user's own key (FR-5.1), so autofill cost is bounded by that user's own
  provider quota.
- **NFR-7.2** The operator does carry storage and normalisation compute. Running cost is
  hosting, the worker, database, image storage, bandwidth, and transactional email.
- **NFR-7.3** Per-account caps: a maximum item count and a maximum total stored bytes. On
  reaching a cap, the user is told plainly which limit they hit; existing content is never
  deleted or degraded. Caps are configurable without a code change, and the author's own
  account can be exempted.
- **NFR-7.4** Per-account rate limits on upload and on autofill, so a single account cannot
  saturate the normalisation queue or the provider relationship.
- **NFR-7.5** Email verification gates uploading (FR-1.2), so an unverified address cannot
  consume storage or compute.
- **NFR-7.6** Total storage, queue depth, and signup rate are observable, with a signal
  when any crosses a threshold — so abuse is noticed from a dashboard rather than from a
  bill.
- **NFR-7.7** Autofill results are stored on the item, so the same photo is not re-analysed
  unless the user asks. Normalised images are likewise stored, not regenerated per request.

### 7.8 Accessibility and usability

- **NFR-8.1** Text and interactive controls meet WCAG 2.1 AA contrast.
- **NFR-8.2** Tap targets on phone are at least 44x44 points.
- **NFR-8.3** Every item photo carries meaningful alternative text derived from the item's
  name and attributes.
- **NFR-8.4** The app is fully operable by keyboard on desktop, and labelled for screen
  readers.
- **NFR-8.5** Honours the device's light and dark appearance setting. The neutral ground
  used by normalisation (FR-3.1) works in both appearances.

### 7.9 Maintainability

- **NFR-9.1** The vision provider sits behind an internal boundary, so it can be swapped
  without touching item, filter, or outfit logic. Because users supply their own keys, the
  boundary also carries which provider a given key belongs to.
- **NFR-9.2** The segmentation model sits behind its own boundary, so it can be replaced or
  moved off the worker without touching item, filter, or outfit logic.
- **NFR-9.3** The category, colour, pattern, and style vocabularies are defined in one
  place and extendable without a schema migration.
- **NFR-9.4** Automated tests cover the attribute and filter logic, the item and outfit
  lifecycle, the normalisation job's success, failure, and retry paths, and authorisation
  boundaries between users.
- **NFR-9.5** Autofill and normalisation are both testable without calling a live provider,
  without a real key, and without loading the segmentation model.

---

## 8. Phasing

**Phase 1 — the wardrobe.** Sections 6.1 through 6.8, 6.10, 6.11. Open signup with email
verification, photo capture including the bulk first session, image normalisation,
attributes and own tags, user-triggered autofill on the user's own key, filtering and
search, item lifecycle, outfits built by hand, outfit library.

Phase 1 alone serves all three driving moments. It is the releasable product.

Suggested order within Phase 1, so the thing becomes useful early: accounts → capture and
the item grid → attributes, tags, and filtering → normalisation → autofill → outfits.
Capture plus filtering is the first point at which the app is worth using. Normalisation
should be proved on a small awkward sample (NFR-3.9) before it is wired into the main
flow, since it is the piece most likely to disappoint.

**Phase 2 — outfits from a photo of yourself.** Section 6.9, including the
prompt-to-add-a-new-item step (FR-9.4), which the user explicitly placed in a later phase.

Nothing in Phase 1 should assume outfits are only ever assembled by hand — FR-8.7's
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

- Photo is the only required input; tagging is optional and deferrable.
- **Every photo is normalised** — background removed, garment on a consistent ground —
  because photos arrive in any condition and an unnormalised grid reads as a camera roll.
- Autofill is a button the user taps, not automatic on upload; re-runnable.
- Filters span app-derived attributes and the user's own tags together.
- Outfits are sets of items, named, with their own tags.
- Outfits are a browsable library, not a calendar — no pinning to dates.
- A second route to creating an outfit, from a photo of yourself, with
  prompt-to-add-unmatched-items deferred to a later phase.
- Multi-user with private wardrobes.
- **Open signup**, no invitations. The app is not being promoted to anyone, so the
  exposure is accepted and handled with caps rather than gates.
- **Each user supplies their own vision-provider API key**; the operator carries no
  per-use AI cost.
- **Online-only in Phase 1**, with offline browsing kept open as a later phase — which is
  what NFR-1.4's two constraints exist to protect.

### My calls, not the user's — flagged for review

- Mobile-first responsive web app rather than a native app; server-side photo storage;
  publicly hosted.
- Segmentation on a **self-hosted model in a background worker** (NFR-3.8) rather than a
  paid cutout API — keeps per-photo cost at zero and keeps photos inside the app's
  infrastructure, at the price of needing a worker and real memory (NFR-1.5).
- Normalisation is automatic on every photo, asynchronous, non-destructive, revertible per
  photo, and switchable off per account (6.3). It is automatic only because it is free per
  image; a paid API would have made it a button like autofill.
- Outfit cover photos — pictures of people — are not normalised (FR-8.7).
- Email-and-password sign-in rather than third-party sign-in; verification required before
  uploading rather than before browsing (FR-1.2); password reset by emailed link, which
  requires a transactional email sender.
- Per-account item and storage caps with an exemption for the author's own account
  (NFR-7.3), rather than refusing signups or charging.
- Archive-and-restore as distinct from permanent deletion, so removing a garment does not
  silently gut saved outfits.
- Filter combination semantics in FR-6.4 ("any of" within an attribute, "all of" across
  attributes).
- Tag rename and bulk delete (FR-4.7) and tag autocomplete (FR-4.6), to stop the user's
  own vocabulary fragmenting — the style search depends on it. One shared tag vocabulary
  across items and outfits.
- Autofill reads the normalised image where one exists (FR-5.5), on the reasoning that a
  clean background improves the result.
- Batch autofill (FR-5.8), with the item count shown before it runs because it is the
  user's money.
- Bulk first-session capture sized at 100 photos with retry and resume (FR-2.3).
- Phase 2 matching is attribute-level, with no image embeddings or similarity index in any
  phase (FR-9.2) — this is what keeps Phase 1 from having to pay to process every photo
  twice.
- Stable per-item photo URL, authorised per request, redirecting to a short-lived signed
  storage URL (NFR-3.6).
- NFR-2.1, 2.2, and 2.3 as hard launch gates measured on a 1,000-item seeded wardrobe;
  NFR-2.4 and 2.5 as targets only.
- Specific performance, scale, storage, and image-handling numbers throughout section 7.

### Left to the builder

- Language, framework, database, hosting provider, image storage mechanism, queue, and
  transactional email provider.
- Which segmentation model is used, behind the boundary in NFR-9.2, and whether it runs on
  CPU or GPU — subject to NFR-2.4 and NFR-3.9.
- Which vision providers are supported for user-supplied keys, behind the boundary in
  NFR-9.1.
- The neutral ground colour and padding ratio used by normalisation, subject to NFR-8.5.
- The exact contents of the category, colour, pattern, and style vocabularies.
- The numeric values of the caps in NFR-7.3.
- Data model, API shape, and client architecture, within the NFR-1.4 constraints.
- How attribute and tag filtering is indexed to hit NFR-2.2 at the scale in NFR-6.
- Where the encryption key for stored provider keys lives (NFR-4.4).
- Visual design beyond the mobile-first and accessibility constraints above.

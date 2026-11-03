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

Three things follow from this and shape everything below.

**Capture has to be nearly free.** If adding a garment takes real effort, the wardrobe
goes stale and every other feature becomes worthless. A photo is the only required input,
and all attribute entry is optional and deferrable.

**Photos arrive in every condition** — on a bed, on a hanger, held up in a shop, in bad
light, against a patterned wall. Left alone, a grid of them reads as a camera roll rather
than a wardrobe, and scanning forty shirts gets harder, which is the exact job the app
exists for. So every photo is normalised (section 6.4).

**The app is a record of clothes that actually exist.** Nothing in the pipeline may invent
or alter a garment's appearance. This is why normalisation is constrained to matting
(FR-4.2) and why every machine-derived value is correctable.

---

## 2. Goals

- Add a garment in under ten seconds, from a phone, with one photo.
- Turn photos taken in any condition into a visually consistent, scannable wardrobe.
- Answer "what do I own that is X?" in a few taps, where X combines app-derived
  attributes and the user's own vocabulary.
- Keep named, tagged outfits that can be browsed and filtered later.
- Work from a phone browser, away from home, with no app install.
- Multi-user with open signup: anyone can register and keeps their own private wardrobe.
- Carry no per-use AI cost for the operator: one key, supplied by the user, powers both
  normalisation and autofill.

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
- **A garment is redrawn rather than cut out.** A generative model asked to remove a
  background can alter a collar, soften a pattern, or shift a colour. The wardrobe would
  then be a record of clothes the user does not own, and they would have no way to know.
  Matting only (FR-4.2).
- **Normalisation that quietly ruins photos.** A clipped sleeve or a haloed edge is worse
  than an untouched photo, and worse still if the user cannot tell it happened or undo it.
  The original is always kept and always recoverable (FR-4.4, FR-4.6).
- **Autofill output that cannot be corrected.** Every machine-derived value must be
  editable and overridable, permanently.
- **A second key, or a second setup step.** One provider key covers normalisation and
  autofill. Asking a user to go and open accounts with two vendors before their wardrobe
  looks right is a failure of the design, not of the user.
- **Unusable on a phone on mobile data.** The primary moments are all away from a desk.
- **Someone else can see your wardrobe.** Photos of your clothes, and of yourself, are
  personal. Any leakage beyond the provider the user chose is a failure.
- **Signup becomes a way to spend the operator's money.** AI cost sits with the user's own
  key, but storage and bandwidth are the operator's. Open signup without caps is an abuse
  vector (section 7.7).

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
  because uploading is what consumes storage.
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

### 6.3 Provider key

Both image features — normalisation (6.4) and autofill (6.6) — are third-party API calls
made with a key the user supplies. One key serves both, so there is one setup step and the
operator carries no per-use cost.

- **FR-3.1** A user can store one provider API key in their settings, replace it, and
  remove it. The key is validated when saved, against both capabilities the app needs, and
  the user is told immediately and specifically if either does not work.
- **FR-3.2** After saving, the key is never displayed back in full — only a masked hint
  sufficient to recognise which key it is.
- **FR-3.3** The settings screen states plainly what the key is used for, that photos are
  sent to that provider when it is used, and roughly what it will cost — a per-photo order
  of magnitude for normalisation and for autofill, so the user is not surprised by their
  own bill.
- **FR-3.4** Without a key, the app works: items can be added, named, tagged by hand,
  filtered, searched, and built into outfits. Only normalisation and autofill are
  unavailable, and each says so in place, in plain language, with a route to settings.
- **FR-3.5** Provider failures are reported distinctly and in plain language — an invalid
  or revoked key, an exhausted quota, a rate limit, and an unsupported capability are
  different problems with different fixes, and are not collapsed into one generic error.
- **FR-3.6** Although one key is the design intent, the stored-credential model can hold
  more than one provider credential without a schema change, in case no single provider
  ever offers both capabilities at acceptable quality.

### 6.4 Image normalisation

Photos arrive in any condition. Normalisation is what makes a grid of them readable as a
wardrobe. It matters most in outfit previews, where three or four photos sit side by side
and three different backgrounds look like a mistake.

- **FR-4.1** Every uploaded garment photo is normalised: the garment is located, the
  background removed, and the garment placed on a uniform neutral ground with consistent
  padding and a consistent aspect ratio. The cutout is produced by a third-party image
  service, called with the user's key (FR-3.1).
- **FR-4.2 Matting, never generation.** The service used must produce a mask or an
  alpha-cut image — it removes background pixels and nothing else. Generative image
  editing must not be used for this, even when it is available on the same key and even
  when the result looks better: a model that can redraw the garment can silently falsify
  the record. No pixel of the garment itself may be invented or altered.
- **FR-4.3** Normalisation requires a stored key. Until one exists, photos are kept and
  shown as originals, and the app explains once, plainly, what normalisation would do and
  where to add a key (FR-3.4).
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

### 6.5 Item attributes and tags

Two kinds of descriptive data sit on an item, and the distinction is visible to the user.

- **FR-5.1 Structured attributes.** Each item has a defined set of attribute fields:
  category, colour, pattern, and style. Each may be empty. These are the fields autofill
  populates, and they drive the standard filters.
- **FR-5.2 Category** comes from an app-defined list covering the normal garment types
  (shirt, t-shirt, trousers, jeans, shorts, skirt, dress, jacket, knitwear, shoes,
  accessory, and so on), plus "other".
- **FR-5.3 Colour and pattern** come from app-defined lists. An item may carry more than
  one colour.
- **FR-5.4 Style** comes from an app-defined list (casual, formal, business, athletic,
  loungewear, occasion, and so on). An item may carry more than one style.
- **FR-5.5 Free-form tags.** A user can attach any number of their own tags to an item,
  as free text of their own invention. The app does not constrain the vocabulary.
- **FR-5.6** When typing a tag, the user is offered tags they have already used elsewhere
  in their wardrobe, so the same concept does not fragment into near-duplicate spellings.
- **FR-5.7** A user can rename one of their own tags across their whole wardrobe at once,
  and delete a tag from their whole wardrobe at once. Both apply to items and outfits
  together, since they share one vocabulary.
- **FR-5.8** Every structured attribute and every tag can be edited, added, or removed at
  any point in an item's life, including long after it was created. No field is locked
  after creation.
- **FR-5.9** The app shows, per item, which structured attributes were machine-derived and
  which the user set or corrected.

### 6.6 Autofill

- **FR-6.1** Autofill is user-triggered. It runs when the user taps an explicit control on
  the item, not automatically on upload.
- **FR-6.2** Autofill requires the stored key (FR-3.1). Without one, the control is visible
  but inactive and explains what it needs.
- **FR-6.3** Autofill analyses the item's primary photo — the normalised version where one
  exists, since a clean background improves the result — and proposes values for the
  structured attributes in FR-5.1, and may additionally propose free-form tags.
- **FR-6.4** Proposed values are presented for the user to accept, change, or discard
  before they are saved. Autofill never silently overwrites a value the user set by hand.
- **FR-6.5** Autofill can be re-run on an item at any time, any number of times.
- **FR-6.6** A user can autofill a batch of items in one action and review the results
  together. Before it runs, the app states how many items will be analysed, because the
  cost falls on the user.
- **FR-6.7** If autofill fails or returns nothing, the item is unaffected. A failure never
  blocks an item from being saved or used.
- **FR-6.8** The user can see that autofill is in progress, and the app remains usable
  while it runs.

### 6.7 Browsing, filtering, and search

- **FR-7.1** The wardrobe is presented as a grid of item photos, newest first by default.
- **FR-7.2** A user can filter the wardrobe by structured attributes — category, colour,
  pattern, style.
- **FR-7.3** A user can filter the wardrobe by their own free-form tags. Structured
  attributes and own tags appear in the same filter surface and can be combined freely in
  one query; they are not separate modes.
- **FR-7.4** Several filters can be active at once. Values within one attribute combine as
  "any of" (Shirt or T-shirt); different attributes combine as "all of" (a Shirt **and**
  black). Free-form tags combine as "all of".
- **FR-7.5** Active filters are visible as removable chips, and can be cleared
  individually or all at once.
- **FR-7.6** The app shows how many items match the current filters, and shows a clear
  empty state when nothing matches.
- **FR-7.7** A user can search items by text, matching item names and tags.
- **FR-7.8** A user can sort the wardrobe by date added and by name.
- **FR-7.9** Tapping an item opens its detail view: its photos, its structured attributes,
  its tags, and the saved outfits it appears in.
- **FR-7.10** From an item's detail view, the user can see and open the outfits that
  include it.
- **FR-7.11** A filtered view can be reached again by its URL, so a filter the user relies
  on can be bookmarked on their phone.

### 6.8 Editing and removing items

- **FR-8.1** A user can edit any item's name, photos, attributes, and tags.
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
- **FR-9.5** A user can attach their own free-form tags to an outfit, drawn from the same
  tag vocabulary as items.
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
  derives attributes for each. It then proposes wardrobe items whose attributes match. This
  is **attribute-level matching**, not visual re-identification of a specific garment: the
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
- **FR-10.7** This analysis runs on the user's stored key, under the same rules as 6.3.

### 6.11 Browsing outfits

- **FR-11.1** Saved outfits are presented as a browsable library, showing each outfit's
  name, its tags, and a visual summary of the items in it, built from normalised item
  images so the summary reads as one piece.
- **FR-11.2** A user can filter outfits by their own tags, and search outfits by name.
- **FR-11.3** A user can filter outfits by the attributes of the items they contain — for
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
wardrobe of 1,000 items on a throttled connection before release. NFR-2.4 and 2.5 are
targets, not gates, because they depend on a third-party provider.

- **NFR-2.1** First meaningful render of the wardrobe grid within 3 seconds on a cold
  load; within 1 second on a warm load.
- **NFR-2.2** Applying or clearing a filter updates results within 300 ms.
- **NFR-2.3** From choosing a photo to the item existing in the wardrobe: under 5 seconds.
  Only what is needed to show the item happens inline. Normalisation and thumbnailing
  happen afterwards and never block this.
- **NFR-2.4** A photo's normalised version is available within 60 seconds of upload at the
  95th percentile. A bulk session of 100 photos (FR-2.3) drains without starving single
  uploads made by other users, and respects the provider's own rate limits rather than
  being throttled or blocked by them.
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
- **NFR-3.7 Pipeline.** Resize, format conversion, and thumbnailing happen locally.
  Background removal is a third-party API call (NFR-3.8). Both the original and the
  normalised version are stored for every photo, which roughly doubles per-photo storage —
  budgeted for in NFR-7.2.
- **NFR-3.8 Where background removal runs.** On a third-party image service, called with
  the user's own key (FR-3.1). No model is hosted, downloaded, or run by this application,
  and no GPU is required. The chosen capability must be **matting** — a mask or alpha
  cutout — and explicitly not a generative image-editing endpoint, even where the same
  provider and key offer one (FR-4.2).
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
  reach another user's items, outfits, tags, or photos by guessing or manipulating an
  identifier.
- **NFR-4.4 Provider keys.** A stored provider key is encrypted at rest with a key held
  outside the application's own database and outside the source tree. It is never written
  to logs, never included in error messages or crash reports, and never returned to the
  client after being saved. It is deleted when the user removes it and when the account is
  deleted.
- **NFR-4.5 Disclosure.** The statement in FR-1.4 and the settings copy in FR-3.3 say
  plainly: photos are stored on the app's servers; garment photos are sent to the provider
  whose key the user supplied in order to cut out the background, and this happens
  automatically on upload unless the user turns normalisation off (FR-4.10); autofill sends
  a photo to that same provider only when the user triggers it; the provider's terms are
  between the user and that provider; no user content is used to train models by this
  application; and photos of people attached to outfits are not sent anywhere (FR-9.7).
- **NFR-4.6** Account deletion removes photos — originals and normalised versions — from
  storage, not only the database rows pointing at them, within 30 days. The email address
  becomes re-registerable immediately.
- **NFR-4.7** Application logs do not contain photos or personal content, and never contain
  a provider key or a request body carrying one.
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
  original photos and everything else works (FR-4.7). A failure in autofill degrades only
  autofill. Neither can take the wardrobe down.
- **NFR-5.4** Normalisation and autofill jobs are retried on transient failure, with
  backoff, and give up after a bounded number of attempts rather than retrying forever.
  Retries must not multiply what the user is charged beyond a stated bound, and a job that
  cannot be processed does not block the queue behind it.
- **NFR-5.5** A provider outage, quota exhaustion, or rate limit is distinguished from a
  genuine failure of the photo, so the app retries the first and gives up on the second.
- **NFR-5.6** Errors are surfaced in plain language, saying what failed and what the user
  can do, never as a raw technical error.

### 7.6 Scale

- **NFR-6.1** Signup is open, but the expected population is small — the app is not being
  promoted. Sized for low thousands of accounts, each with up to roughly 1,000 items and
  several hundred outfits, without redesign. Growth beyond that is a capacity problem to
  be measured, not designed for in advance.
- **NFR-6.2** Filtering, search, and the outfit library stay within the NFR-2 targets at
  the top of that per-account range.
- **NFR-6.3** Job throughput is bounded by the provider's rate limits, not by the
  application's own capacity. Queue depth and provider error rates are observable.

### 7.7 Cost and abuse

Two different cost pictures sit side by side, and conflating them is how this gets
expensive. AI cost is the user's, on their own key. Storage and bandwidth are the
operator's, and open signup is what makes caps necessary.

- **NFR-7.1** The operator carries no per-use AI cost. Both normalisation and autofill run
  on the requesting user's own key (FR-3.1), so both are bounded by that user's own
  provider quota.
- **NFR-7.2** Operator running cost is hosting, the job runner, database, image storage,
  bandwidth, and transactional email only.
- **NFR-7.3** Per-account caps: a maximum item count and a maximum total stored bytes. On
  reaching a cap, the user is told plainly which limit they hit; existing content is never
  deleted or degraded. Caps are configurable without a code change, and the author's own
  account can be exempted.
- **NFR-7.4** Per-account rate limits on upload, on normalisation, and on autofill. These
  now protect the *user's* bill as much as the operator's infrastructure: a runaway retry
  loop or an accidental repeat of a 100-photo session must not quietly cost them money.
- **NFR-7.5** Email verification gates uploading (FR-1.2), so an unverified address cannot
  consume storage.
- **NFR-7.6** Total storage, job queue depth, provider error rates, and signup rate are
  observable, with a signal when any crosses a threshold — so trouble is noticed from a
  dashboard rather than from a bill.
- **NFR-7.7** Autofill results and normalised images are stored, not regenerated per
  request, so the same photo is never paid for twice unless the user asks for it.

### 7.8 Accessibility and usability

- **NFR-8.1** Text and interactive controls meet WCAG 2.1 AA contrast.
- **NFR-8.2** Tap targets on phone are at least 44x44 points.
- **NFR-8.3** Every item photo carries meaningful alternative text derived from the item's
  name and attributes.
- **NFR-8.4** The app is fully operable by keyboard on desktop, and labelled for screen
  readers.
- **NFR-8.5** Honours the device's light and dark appearance setting. The neutral ground
  used by normalisation (FR-4.1) works in both appearances.

### 7.9 Maintainability

- **NFR-9.1** The provider sits behind one internal boundary covering both capabilities —
  background removal and attribute reading — so a provider can be swapped, or the two
  capabilities split across two providers (FR-3.6), without touching item, filter, or
  outfit logic.
- **NFR-9.2** The category, colour, pattern, and style vocabularies are defined in one
  place and extendable without a schema migration.
- **NFR-9.3** Automated tests cover the attribute and filter logic, the item and outfit
  lifecycle, the normalisation and autofill jobs' success, failure, retry, and
  provider-error paths, and authorisation boundaries between users.
- **NFR-9.4** Normalisation and autofill are both testable without calling a live provider
  and without a real key.
- **NFR-9.5** A test asserts that the generative-editing path is not reachable for
  normalisation (FR-4.2), so the rule cannot be lost to a later refactor.

---

## 8. Phasing

**Phase 1 — the wardrobe.** Sections 6.1 through 6.9, 6.11, 6.12. Open signup with email
verification, photo capture including the bulk first session, the provider key, image
normalisation, attributes and own tags, user-triggered autofill, filtering and search,
item lifecycle, outfits built by hand, outfit library.

Phase 1 alone serves all three driving moments. It is the releasable product.

Suggested order within Phase 1, so the thing becomes useful early: accounts → capture and
the item grid → attributes, tags, and filtering → provider key → normalisation → autofill
→ outfits. Capture plus filtering is the first point at which the app is worth using, and
both work with no key at all, which is why the key comes after them.

Before normalisation is wired into the main flow, prove it on the awkward sample in
NFR-3.9. It is the piece most likely to disappoint, and the cheapest moment to discover
that a provider's matting is not good enough is before the upload path depends on it.

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

- Photo is the only required input; tagging is optional and deferrable.
- **Every photo is normalised** — background removed, garment on a consistent ground —
  because photos arrive in any condition and an unnormalised grid reads as a camera roll.
- **Background removal is a paid third-party API, not a self-hosted model.** The operator
  has no GPU and no appetite for hosting one.
- **One provider key, supplied by the user, powers both normalisation and autofill.** This
  requires choosing a provider that sells both a matting capability and a multimodal model
  under a single credential.
- Autofill is a button the user taps, not automatic on upload; re-runnable.
- Filters span app-derived attributes and the user's own tags together.
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

- Garment photos now leave the app's infrastructure automatically on upload, where
  self-hosting would have sent nothing anywhere. This is disclosed at signup and in
  settings (NFR-4.5), and FR-4.10 lets a user switch it off entirely.
- Normalisation stays automatic rather than becoming a button, because a half-normalised
  grid is worse than either extreme. The guard against surprise cost is the pre-flight
  count on bulk sessions (FR-4.11), the rate limits in NFR-7.4, and the account-level off
  switch.
- Hosting no longer needs real memory or a GPU — only a way to run work after a response
  (NFR-1.5).

### My calls, not the user's — flagged for review

- Mobile-first responsive web app rather than a native app; server-side photo storage;
  publicly hosted.
- **Matting only, never generative image editing, for normalisation** (FR-4.2), enforced by
  a test (NFR-9.5). A generative model can redraw a garment, which would make the wardrobe
  a record of clothes that do not exist.
- Normalisation is automatic on every garment photo, asynchronous, non-destructive,
  revertible per photo, and switchable off per account (6.4).
- Outfit cover photos — pictures of people — are not normalised and are not sent to any
  provider (FR-9.7).
- The settings screen states the rough per-photo cost (FR-3.3), on the reasoning that a
  user spending their own money should not have to go and look it up.
- The credential model can hold more than one provider credential without a migration
  (FR-3.6), as a hedge in case no single provider does both well.
- Email-and-password sign-in rather than third-party sign-in; verification required before
  uploading rather than before browsing (FR-1.2); password reset by emailed link, which
  requires a transactional email sender.
- Per-account item and storage caps with an exemption for the author's own account
  (NFR-7.3), rather than refusing signups or charging.
- Archive-and-restore as distinct from permanent deletion, so removing a garment does not
  silently gut saved outfits.
- Filter combination semantics in FR-7.4 ("any of" within an attribute, "all of" across
  attributes).
- Tag rename and bulk delete (FR-5.7) and tag autocomplete (FR-5.6), to stop the user's
  own vocabulary fragmenting — the style search depends on it. One shared tag vocabulary
  across items and outfits.
- Autofill reads the normalised image where one exists (FR-6.3), on the reasoning that a
  clean background improves the result.
- Batch autofill (FR-6.6), with the item count shown before it runs because it is the
  user's money.
- Bulk first-session capture sized at 100 photos with retry and resume (FR-2.3).
- Phase 2 matching is attribute-level, with no image embeddings or similarity index in any
  phase (FR-10.2).
- Stable per-item photo URL, authorised per request, redirecting to a short-lived signed
  storage URL (NFR-3.6).
- Sending the smallest usable image for cutout, since the user is billed per call
  (NFR-3.11).
- NFR-2.1, 2.2, and 2.3 as hard launch gates measured on a 1,000-item seeded wardrobe;
  NFR-2.4 and 2.5 as targets only.
- Specific performance, scale, storage, and image-handling numbers throughout section 7.

### Left to the builder

- Language, framework, database, hosting provider, image storage mechanism, job runner,
  and transactional email provider.
- **Which provider is chosen**, subject to the hard constraint that one credential must
  cover both a matting capability and a multimodal model (FR-3.1), that the matting is good
  enough against NFR-3.9's awkward sample, and that generative editing is not used for
  normalisation (FR-4.2).
- The neutral ground colour and padding ratio used by normalisation, subject to NFR-8.5.
- The exact contents of the category, colour, pattern, and style vocabularies.
- The numeric values of the caps in NFR-7.3 and the rate limits in NFR-7.4.
- Data model, API shape, and client architecture, within the NFR-1.4 constraints.
- How attribute and tag filtering is indexed to hit NFR-2.2 at the scale in NFR-6.
- Where the encryption key for stored provider keys lives (NFR-4.4).
- Visual design beyond the mobile-first and accessibility constraints above.

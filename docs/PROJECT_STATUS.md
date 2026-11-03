# Project Status

**Last updated:** 4 November 2026
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md` (v2.5)
**Current phase:** Phase 3 interface revision — presentation rebuild of the homepage and booking preview
**Phase 3:** Implemented as a design preview with real assets and real rates; three booking rules remain unanswered. Not production-approved.

## Revision — 4 November 2026 (map presentation and responsive pass)

Follow-up to the same-day fix above. Still Phase 3; no backend or new-phase work.

- **Map card:** the panel was rebuilt, not just its frame. The header pairs a pin
  badge with the confirmed address and a bordered "Get directions" action; the
  map sits inset in a rounded, ringed frame; the address hierarchy and pin
  coordinates stay below it; the footer is a single metadata line. The glassy
  stacked bands and the "MAP" kicker are gone.
- **Tiles:** switched from OpenFreeMap Liberty to Positron (style endpoint and
  v8 style JSON verified). The neutral basemap reads as current and keeps
  street and barangay labels legible under the white pin label.
- **Pin and label:** the popup label wraps within `min(16rem, 72vw)` so it cannot
  clip on narrow screens, and a soft ring layer (radius interpolated by zoom)
  marks the exact spot. Map rotation is disabled so labels stay upright; zoom is
  limited to 11–18.
- **Responsive check:** marker and popup stayed inside the map and inside the
  viewport at 1440×1000, 768×1024, 390×844, 360×740 and 844×390 landscape, with
  no horizontal overflow at any size.
- **Home and booking review (light and dark):** hero, courts, rates,
  how-it-works, location, FAQ, footer, booking step 1, review and payment were
  inspected and hold up against the approved direction. Only two adjustments
  came out of it: calendar cells are now 44px touch targets in a `max-w-md`
  column, and secondary map text was nudged up in contrast. The mobile action
  bar looked broken only because the Next.js development badge overlaps it; it
  is a dev-only overlay.
- **Files:** `components/home/club-map.tsx`,
  `components/booking/booking-preview.tsx`, `app/globals.css`.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint` on the changed components | Passed, no output |
| `npm run build` | Passed; 10 routes; `club-map-frame` and the calendar utilities present in the emitted CSS |
| Map, five viewports | Marker and popup visible and inside the map at 1440/768/390/360, plus 844×390 landscape |
| Themes | Location band, map card and booking calendar checked in light and dark |
| Console | No errors on `/` or `/design-preview/booking` |
| Keyboard, screen reader, real devices | Not performed in this revision |

## Revision — 4 November 2026 (map frame, location detail, booking calendar)

Two fixes raised after reviewing the Phase 3 preview. Still Phase 3; no new
phase work and no backend changes.

- **Map frame:** the map region no longer depends on an arbitrary Tailwind
  height. `app/globals.css` now owns `.club-map-frame` (22rem, 26rem from
  40rem). With no height of its own, the container let MapLibre's canvas feed
  its size back into the page: the panel grew from 0 to over 14,000px and the
  lower page became unreachable. The frame now measures 416px at desktop and
  352px at 390px wide, unchanged through scroll and zoom.
- **Map label:** the marker popup keeps its own white pill. The design-system
  reset had left MapLibre's popup content transparent, so the navy label was
  unreadable over the dark band. The pill now shows the club name and the
  confirmed address line.
- **Location detail:** a strip below the map lists the confirmed address
  hierarchy — Purok / area Bung-aw, Barangay Pondol, Municipality Balamban,
  Province Cebu — with the confirmed pin coordinates. No street name, purok
  number, or landmark was invented.
- **Booking calendar:** the seven-day strip was replaced with a month calendar
  (Sunday-first, previous/next month, days outside the sample window disabled).
  The sample window is pinned to 5 Nov – 31 Dec 2026 so server and client render
  the same grid; it is labelled sample availability, not a real booking window.
- **Files:** `components/home/club-map.tsx`,
  `components/booking/booking-preview.tsx`, `app/globals.css`.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint` on the two changed components | Passed, no output |
| `npm run lint` (repository-wide) | Not clean: the run also lints the gitignored `.tmp-ui` Chrome profiles and reports errors there. Same state before this change |
| Map at 1280×900 | Frame 416px before, during, and after scroll and zoom; document height constant at 6,835px; page bottom reachable |
| Map at 390×844 | Frame 352px; detail strip in two columns; no horizontal overflow |
| Calendar at 1280×900 and 390×844 | November 2026 grid with 26 selectable days (5–30 Nov); choosing 14 Nov updated the summary date; previous arrow disabled in November, next arrow disabled in December (31 selectable days); no horizontal overflow |
| Console | No errors on `/` or `/design-preview/booking` |
| Build, keyboard, screen reader, real devices | Not re-run in this revision |

## Revision — 3 November 2026 (homepage and booking rebuild)

A second Phase 3 revision replaced the flat review presentation with a
customer-facing interface layer. It stays UI-only and does not begin Phase 4,
5, 6, or 7.

- **Route move:** the root route `/` is now the presentation-quality homepage.
  The phase review index moved to `/design-preview`, and the old
  `/design-preview/homepage` route redirects to `/` (HTTP 307). Both preview
  routes and the homepage are marked `noindex` while content is unapproved.
- **Design foundation:** semantic color tokens now drive light and dark themes
  from one contract. The theme follows the OS by default, can be switched from
  every shell, persists in `localStorage`, and is applied before first paint.
- **Motion system:** `motion` (Framer Motion's React package) was added. Hero
  entrance is CSS-only so it runs before hydration; below-fold sections reveal
  on view; selection pills, step transitions, FAQ disclosure, toasts, the mobile
  action bar, and payment-status feedback are animated. Reduced motion removes
  non-essential movement.
- **Homepage:** photography-led hero, court cards, rate panel, three-step booking
  explanation, confirmed-policy details, location band, accessible FAQ, and a
  final booking CTA. Only client-confirmed hours, courts, rates, durations,
  payment review, and the 24-hour cutoff are stated as facts. No testimonials,
  ratings, schedules, facilities, address, or map pin were invented.
- **Booking flow:** rebuilt with skeleton availability, grouped time slots,
  animated date/duration/court selection, empty states for no matching courts
  and no open times, inline field validation with focus management, a live
  sample hold countdown, copy-reference feedback, drag-free image selection,
  optimistic proof submission, status transitions, and a mobile action bar.
- **Components:** refreshed button, badge tint, alert, field, stepper, booking
  summary, policy notice, payment instructions; new shared icon set, theme
  toggle, toast, and motion primitives.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed, no output |
| `npm run build` | Passed; seven routes generated including the homepage, review index, booking preview, and design system |
| Production route audit | `/`, `/design-preview`, `/design-preview/booking`, `/design-system` at 390/768/1440: no horizontal overflow, one `<h1>` each, no console errors |
| Redirect | `/design-preview/homepage` returned HTTP 307 to `/` |
| Theme | Light and dark body/heading/card tokens verified; toggle persisted `dhidden-theme` |
| Hero first paint | Entrance computed to the CSS `rise-in` animation, not a hydration-gated style |
| Mobile header | 390px menu opened and exposed the section links |
| FAQ | Second question expanded to one visible region with `aria-expanded="true"` |
| Skeletons | Present on first booking load and again after a date change |
| Slot selection | Summary updated with court, date, time, duration, and a computed peso amount |
| Step focus | Review heading received focus after the exit transition |
| Validation | Submitting an empty review form rendered all three field errors |
| Payment step | Reached after valid details and terms; countdown, sample reference, and sample QR rendered |
| Mobile booking | 390px action bar appeared after selecting a slot |
| Keyboard / screen reader / real device / user testing | Still not performed |

### Revision limitations

1. **Lottie was not added.** No approved Lottie artwork exists, and hand-authored
   Lottie JSON would add bundle weight and a second animation system without
   improving the key moments. CSS and SVG motion cover the hero, selection,
   disclosure, confirmation, and status feedback. Lottie remains an option once
   licensed club motion assets exist.
2. **shadcn/ui was not adopted wholesale.** The repository already has an
   equivalent primitive layer with the same Tailwind token approach. Replacing
   it would rewrite working components without a visual gain; the primitives
   were refreshed in place instead.
3. The homepage is still a presentation preview. Real availability, accounts,
   and payments are not implemented. The address, map, phone, and email are now
   published; the open-play schedule, the facilities list, and the club's GCash
   code are not.
4. The booking flow remains local browser state. The countdown, reference,
   availability, and payment status are sample values.
5. No automated test suite exists. Verification was type, lint, build, HTTP, and
   headless-browser based.

## Revision — 3 November 2026

The client's exported questionnaire was reconciled and the supplied assets were
integrated.

- **Response 2 (30 October 2026, "Management") is authoritative.** Response 1
  (Edna Doster, 28 October) was reviewed and is not adopted. The register was
  rewritten to version 2.0 with per-decision status, and blanks stay open rather
  than being filled from Response 1.
- **Club name:** the project owner chose to match the logo, so the written name is
  **D-Hidden Pickleball Court & Bistro**. Confirmed as "D-Hidden Pickleball" on
  4 November 2026.
- **Assets integrated:** official logo in the header, footer, review index, and
  design reference; logo-derived app icons; two supplied court photographs on the
  homepage mockup and the design reference; a clearly marked sample GCash QR in
  the payment panel.
- **Booking preview revised:** account gate at review with required name, email,
  and mobile; daily 7:00 AM–12:00 AM availability; 60/90/120-minute durations;
  ₱250/₱300 rates with a computed amount; held-slot states; "past closing" guards;
  GCash as the only confirmed method; 24-hour cutoff and contact-the-club
  messaging.
- **Sample payment QR:** `public/qr/qr.jpg` was renamed to
  `public/qr/gcash-sample.jpg`. It is a personal account used as a stand-in, and
  the UI overlays a band that breaks the code plus a "do not send money" caption.
- **Resolved 4 November 2026:** the temporary-hold length (15 minutes), the
  payment deadline (the same window), the cancellation outcomes, the club name,
  the address and map pin, and the publishable phone and email. See
  `docs/ux/CLIENT_DECISIONS.md`. The remaining blockers are the club's real GCash
  code and account name, plus weekend, rounding, and booking-window pricing.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed on 3 Nov 2026. Re-checked 4 Nov: the project source is still clean; the bare command now fails only because ESLint walks the gitignored `.tmp-ui/` browser profiles (145 errors from Chrome's bundled extension scripts) |
| `npm run build` | Passed; four review routes plus `/icon.png`, `/apple-icon.png`, and `/_not-found` generated |
| Route and asset check (`next start`) | All four routes and the logo, court, QR, and icon files returned HTTP 200 |
| Overflow and heading audit | 4 routes × 3 widths (390/768/1440): no horizontal overflow, one `<h1>` each, no console errors |
| Selection and pricing | 34 slots across two courts; selecting 7:00 AM Court 1 produced ₱250 for 60 minutes |
| Gates | Review disabled until a slot is chosen; confirm disabled until terms accepted; three required account fields present |
| Sample QR | Rendered 174×319 with a visible "Sample · do not pay" band |
| Keyboard / screen reader / real device / user testing | Still not performed |


## Phase 3 deliverables produced

- Reusable booking-flow components:
  - `components/ui/stepper.tsx`
  - `components/ui/booking-summary.tsx`
  - `components/ui/status-pair.tsx`
  - `components/ui/policy-notice.tsx`
  - `components/ui/payment-instructions.tsx`
- Responsive, interactive court-reservation preview at
  `/design-preview/booking`, implemented in
  `components/booking/booking-preview.tsx`
- Design-system reference extended with the new components and states
- Temporary review index updated for Phase 3
- Homepage mockup updated to link to the booking preview and Phase 3 status
- `docs/PHASE_3_DESIGN.md` with scope, placeholder policy, checks, and limitations
- Step entrance motion added to `app/globals.css` with the global
  reduced-motion reset still in force

Phase 3 remains UI-only. No database, authentication, booking persistence, payment
integration, QR image, file storage, notification, staff tool, public-site page,
coaching, or DUPR feature was added.

## Phase 3 checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed, no output |
| `npm run build` | Passed; `/`, `/design-preview/booking`, `/design-preview/homepage`, `/design-system`, `/_not-found` generated as static routes |
| Production route check | `/`, `/design-system`, `/design-preview/homepage`, and `/design-preview/booking` returned HTTP 200 |
| Browser overflow and heading audit | No horizontal overflow and exactly one `<h1>` on every route at 390px, 768px, and 1440px |
| Console errors | None captured on any audited route |
| Booking selection | Summary updated to Court 1, Thu 29 Oct, 7:00 AM, 60 minutes |
| Step transition | Review disabled until a slot was selected; focus moved to the new step heading |
| Terms gate | Confirmation disabled until the preview-terms checkbox was selected |
| Confirmation state | Pending approval, Unpaid, sample reference, QR placeholder, and proof control rendered |
| Proof state | Local image selection enabled preview submission; payment moved to Awaiting verification |
| Mobile layout defect | Date strip initially stretched the 390px page; fixed with grid `min-w-0` constraints and re-tested |
| Keyboard traversal | Not performed beyond programmatic clicks and heading focus |
| Screen-reader review | Not performed |
| Real-device testing | Not performed |
| User testing | Not performed |
| Automated tests | No test suite exists |
| Tap-target audit | Not performed |

## Phase 3 exit status

| Exit criterion | Status |
| --- | --- |
| Existing Phase 1 visual direction retained | Met |
| Reusable booking-flow component layer | Met at design-preview level |
| Responsive court-reservation flow | Implemented and browser-inspected at 390px, 768px, and 1440px; not user-tested |
| Disabled, selected, pending, unpaid, and proof states | Implemented as preview states |
| Prices, final policies, and payment details visible before confirmation | Structure present; real values remain deferred |
| Account and confirmation-model decisions | Shown as explicit decision placeholders; `D-01` and `D-02` remain open |
| Accessibility intent | Focus handling, `aria-current`, `aria-pressed`, labels, and reduced-motion rules implemented; no screen-reader or full keyboard pass |
| Production readiness | **Not met** — placeholders, missing assets, missing business answers, and no user/device testing |

Phase 3 completes the visual and component layer only. It does not authorize or
implement Phase 5 public pages or Phase 7 booking logic.

## Phase 2 deliverables produced

- Sitemap and route-level information architecture for public, auth, player,
  booking, and staff areas
- Navigation model for public, mobile, booking wizard, account, and staff shells
- End-to-end player journeys: court booking, returning-player booking, open play,
  cancellation/reschedule, payment proof, location, and account recovery
- Staff workflows: dashboard, check-in/payment, QR verification, walk-in
  bookings, court blocks, open-play operations, reconciliation, permissions
- Booking/payment status model and required UI states
- Page-by-page low-fidelity wireframes with desktop and mobile layouts
- Responsive behaviour rules and interaction/component requirements
- Accessibility and usability requirements
- Content/asset requirements and an open decision register
- Acceptance criteria for each planned journey
- Blueprint conflict log covering the deferred coaching/DUPR scope
- Documents created:
  - `docs/ux/UX_PLAN.md`
  - `docs/ux/WIREFRAMES.md`
  - `docs/ux/CLIENT_DECISIONS.md`
  - `docs/ux/CLIENT_QUESTIONNAIRE.md` (client-facing short form; answers pending)

No application code, dependencies, database schema, auth, or payment code was
changed in Phase 2.

**Client approval recorded 27 October 2026:** the Phase 2 artifacts are approved
as drafted: sitemap, labels/navigation, player and staff journeys, wireframes,
state requirements, component/accessibility requirements, and acceptance
criteria. This approval does **not** answer the open business decisions in
`docs/ux/CLIENT_DECISIONS.md`, which remain deferred pre-implementation
blockers. It did not itself authorize Phase 3; Phase 3 was separately
authorized on 28 October 2026.

## Phase 2 checks

| Check | Result |
| --- | --- |
| Phase 2 blueprint requirements reviewed | All ten requested deliverables mapped to `docs/ux/UX_PLAN.md` and `docs/ux/WIREFRAMES.md` |
| Sitemap and access model | Documented for anonymous, player, staff, and manager roles |
| Player journeys | Seven journeys documented with failure/recovery states |
| Staff workflows | Eight workflows documented with permission and audit expectations |
| Mobile-first booking layouts | Availability and review wireframes specified at 390px before desktop |
| Price/payment/rules before commitment | Explicit in journey, screen requirements, and wireframes |
| States | Loading, empty, error, success, disabled, unavailable specified |
| Deferred features excluded | No coaching/DUPR routes, navigation, tables, or components planned |
| Client questionnaire | Created at `docs/ux/CLIENT_QUESTIONNAIRE.md`; returned 30 October 2026 and reconciled on 3 November 2026 |
| App files changed | None |
| `npx tsc --noEmit` (re-run) | Passed, no output |
| `npm run lint` (re-run) | Passed, no output |
| `npm run build` (re-run) | Passed; `/`, `/design-system`, `/design-preview/homepage`, `/_not-found` generated as static routes |

## Phase 2 exit status

The Phase 2 artifacts are **client-approved as drafted**, but several business
inputs remain deferred. The planning phase can close on the approved structure;
affected implementation work cannot be finalized until the deferred decisions
are supplied.

| Exit criterion | Status |
| --- | --- |
| Primary player journeys mapped | Met |
| Staff workflows mapped | Met |
| Mobile layouts specified for booking interactions | Met as specifications; not user-tested |
| Login placement decided | **Deferred** — `D-02` remains open; recommendation documented |
| Full price, duration, payment method, and rules shown before confirmation | Structure specified; real values deferred on `D-03`, `D-06`, `D-07`, `D-08` |
| Loading, empty, error, unavailable, and success states | Specified |
| Labels and page structure confirmed by client | Approved as drafted, 27 October 2026 |
| Client-approved prices, policies, and business rules | **Deferred** — not supplied |

Until the deferred items are resolved, no implementation phase should treat the
booking rules, prices, or payment policy as final. No implementation phase may
begin without explicit authorization.

## Phase 1 completed work (unchanged)

- Logo-derived color tokens plus separate semantic status colors
- Archivo display type and Source Sans 3 body type through `next/font`
- Typography, spacing, radius, elevation, and motion foundations
- UI primitives: button, field/input/select/textarea, badge, alert
- Interaction previews: slot picker, native dialog, loading, disabled, error,
  empty, and skeleton states
- `/design-system` component and token reference page
- `/design-preview/homepage` desktop/mobile mockup slice
- Temporary `/` review index (to be replaced by the real homepage in Phase 5)
- Placeholder components for the missing logo and photography
- `docs/DESIGN_BRIEF.md` with asset checklist and client decisions
- `docs/PROJECT_STATUS.md` (this file)

## Phase 1 checks actually run (last code change)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed, no output |
| `npm run build` | Passed; `/`, `/design-system`, `/design-preview/homepage`, `/_not-found` generated as static routes |
| Production server route check (`next start`) | All three routes returned HTTP 200 with expected content; unknown route returned 404 |
| CSS and font delivery | Built CSS served (53 KB); both WOFF2 font files requested by the page returned HTTP 200 |
| Overflow audit (headless Chrome, CDP) | No horizontal page overflow at 390px, 768px, or 1440px on all three routes |
| Heading structure | Exactly one `<h1>` per route |
| Console errors | None captured on any audited route |
| Font application | `document.fonts.status` = `loaded`; display sample computed to Archivo |
| Slot picker interaction | Clicking a time updated `aria-pressed` and the `aria-live` summary |
| Dialog interaction | Opened with `showModal`, focus moved to the first action, `aria-describedby` resolved; closed programmatically |
| Keyboard focus | First `Tab` on the mockup showed a visible blue focus ring |
| Tap targets (390px) | Homepage: no interactive target under 44px tall. Design reference: remaining sub-44px items are the intentional “small button” sample, 16px custom radio/checkbox controls inside larger labels, and disabled preview buttons |

Browser review used production builds in headless Chrome through the DevTools
Protocol. Screenshots were inspected at 390px and 1440px; 768px was checked for
overflow and heading structure.

## Not verified

Phase 2:

- Wireframes were not tested with users, on devices, or through a clickable
  prototype. They are structural specifications only.
- No design-tool file exists (Figma or equivalent); the ASCII wireframes are the
  agreed fallback for this phase.
- The decision register is only partly answered. The sitemap,
  labels, journeys, and wireframes were approved as drafted on 27 October 2026.
- Acceptance criteria are future implementation targets; none has been executed.

Phase 3:

- The booking preview has not been tested with users, on real devices, or with a
  screen reader.
- Full keyboard traversal and tap-target measurement were not performed.
- No end-to-end booking, account, payment, or file-storage path exists to test.
- The preview was exercised in headless Chrome only; Safari and Firefox were not
  checked.

Phase 1:

- Real iOS/Android device testing and touch behavior
- Screen-reader announcement quality (VoiceOver/TalkBack/NVDA)
- Safari and Firefox rendering
- Reduced-motion behavior visually (the global CSS rule is implemented but was
  not visually inspected with the OS preference toggled)
- Full keyboard traversal of every control on the reference page
- Escape-key dismissal of the dialog (native behavior relied upon, not tested)
- Lighthouse/performance profiling on a throttled mobile connection
- Color contrast with a dedicated audit tool (values were spot-checked manually)

## Known limitations

1. **Assets are supplied but not final.** The logo is a raster WebP, not a vector
   master, and no light-on-dark version exists. Court photography is used on the
   owner's instruction; final crops and captions are Phase 5 work.
2. **Palette measured, not approved.** Sampling the logo gave navy `#062E6B`
   against the `#123B78` token. Aligning it changes every surface, so it is left
   for an explicit decision.
3. **White text on court blue** measures approximately 4.68:1. It passes AA for
   normal text but has little headroom; confirm the final brand blue before
   production.
4. **Temporary `/` route.** It is a review index, not the public homepage.
   Phase 5 replaces it.
5. **No automated test suite.** The project still has no Vitest or Playwright
   configuration; verification was type, lint, build, HTTP, and browser-based.
6. **Default 404 page.** Next.js’s default not-found screen is unstyled beyond
   the global body and font tokens. Not in Phase 1 scope.
7. **Design reference and booking preview are intentionally incomplete.**
   `/design-preview/booking` demonstrates states with local browser state and
   sample data; it is not a booking, account, payment, or file-storage flow.
8. **Wireframes are text-based.** No design tool was available, so low-fidelity
   layouts are ASCII specifications in `docs/ux/WIREFRAMES.md` rather than
   Figma artboards or a clickable prototype.
9. **Booking rules are partly decided.** The 4 November owner decisions cover the
   hold, the payment deadline, and cancellation. Weekend rate, rounding, booking
   window, buffer, and maximum players are still open, and the preview labels
   those gaps as unconfirmed.

## Client input still blocking production polish

The prioritized register is `docs/ux/CLIENT_DECISIONS.md` version 2.1, which
records the client's 30 October answers and the project owner's 4 November
decisions. Remaining blockers:

- Weekend rate, partial-hour rounding, buffer, and booking window
- Maximum players per court and the publishable facilities list
- Holiday closures
- Open-play schedule, capacity, and waitlist rules
- Named staff accounts and the permission split
- The club's real GCash QR and receiving account name
- Any publishable social links
- Privacy, terms, and payment-proof retention wording
- Written client sign-off on the 4 November owner decisions before policies ship

## Recommended next step

1. Review the revised Phase 3 preview and the new decision register; send
   corrections rather than reopening the approved Phase 2 structure.
2. Send the short list of remaining questions back to the client. The flow now
   runs end to end on the 4 November decisions; what remains is pricing detail,
   facilities, open play, and the club's GCash account.
3. Replace the sample GCash QR with the club's own code before any deployment.
4. Obtain explicit authorization before starting the next blueprint phase. Do not
   start Phase 4 or any later phase automatically.

## Deferred / out of scope

Coaching and DUPR integration remain conditional and unapproved. No related
pages, tables, endpoints, or workflows exist. The public site, accounts, booking
engine, staff tools, notifications, QR payment verification, OpenFreeMap, and
launch work belong to Phases 5–12 and remain unimplemented. The Phase 3 preview
is a local-state UI prototype and does not change that boundary.

## Revision — 4 November 2026

The project owner answered the three flow blockers and the location, contact, and
name questions.

- **Hold and payment:** 15 minutes from the moment the request is confirmed. The
  payment deadline is the same window, so its expiry is what auto-cancels the
  request and returns the slot to the schedule.
- **Cancellation:** 24 hours or more before play gives a full GCash refund or one
  free move; inside 24 hours the fee is forfeited and the slot released;
  no-shows and late arrivals are neither refunded nor extended; club closures are
  refunded or moved.
- **Location and contact:** "Bung-aw, Pondol, Balamban, Cebu", map pin
  10.5015278, 123.7161667 linked to Google Maps, phone 0956 167 0905, and
  gracemilan87@gmail.com are published on the homepage location section and in
  the footer, all read from `lib/club.ts`.
- **Name:** confirmed as "D-Hidden Pickleball"; no copy changed.
- **Payment testing:** a labelled *Simulate a successful payment* control reaches
  the paid and awaiting-verification states with no real transfer, so the flow
  can be demonstrated before the club's QR arrives.
- **Palette:** shipped tokens kept; the logo is to be redrawn in `#123B78`.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint --ignore-pattern ".tmp-ui/**"` | Passed, no output |
| `npm run lint` | Fails only on the gitignored `.tmp-ui/` browser profiles (145 errors from Chrome extension scripts); not project source |
| `npm run build` | Passed; 10 static pages including `/`, `/design-preview/booking`, and `/design-system` |
| Served HTML (`next start` on port 3100) | `/` and `/design-preview/booking` returned HTTP 200; address, coordinates, map link, phone, and email present; no "pending confirmation" copy remains |
| Test-mode control in a browser | Not exercised — the paid states sit behind interaction and were reviewed from the implementation, not driven |

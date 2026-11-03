# Phase 3 — Interface System and Booking Preview

**Last updated:** 3 November 2026
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md` (v2.5), Phase 3
**Status:** Implemented as a design preview. Real client answers and assets are
integrated; several rules remain open. Not production-approved.
**Authorization:** Phase 3 authorized 28 October 2026. Revision against the
client response authorized 3 November 2026.

## 1. Purpose and scope

Phase 3 turns the Phase 1 visual foundation and the Phase 2 booking-flow
structure into a reusable interface layer. The work stays at the design-system
and visual-prototype level.

Included:

- Booking-flow components built on the existing Phase 1 tokens
- A responsive, interactive court-reservation preview
- Desktop, tablet, and mobile layouts for the reservation steps
- Selection, disabled, held, unpaid, proof-selected, and proof-submitted states
- Client-confirmed prices, hours, court count, durations, and account rule
- The official logo, supplied court photography, and a clearly marked sample QR
- Design-system documentation for the new components

Explicitly excluded:

- Database schema, availability queries, or slot locking
- Authentication, player accounts, or booking history
- Real payment processing, QR verification, or proof storage
- Email, SMS, or other notifications
- Staff operations, admin tables, or approval workflows
- OpenFreeMap and location content
- Public-site pages belonging to Phase 5
- Coaching and DUPR features

## 2. Design direction

The Phase 1 system is retained rather than replaced:

- Navy and off-white remain the base surfaces.
- Court blue remains the primary action color.
- Lime and yellow stay limited to availability and small highlights.
- Archivo remains the display face; Source Sans 3 remains the body face.
- Radii remain modest and elevation stays blue-tinted and restrained.
- The court-line motif is used as a small, low-contrast structural detail.

The booking preview uses an asymmetric desktop layout: selection content on the
left and a sticky booking summary on the right. Mobile stacks the content and
adds a compact sticky action bar during time selection.

## 3. Components

| Component | File | Purpose |
| --- | --- | --- |
| `Stepper` | `components/ui/stepper.tsx` | Desktop step list and compact mobile progress |
| `BookingSummary` | `components/ui/booking-summary.tsx` | Court, date, time, duration, amount, and optional actions |
| `StatusPair` | `components/ui/status-pair.tsx` | Separate booking and payment status fields |
| `PolicyNotice` | `components/ui/policy-notice.tsx` | Static policy recap with client-supplied wording |
| `PaymentInstructions` | `components/ui/payment-instructions.tsx` | Amount, reference, method, QR artwork or placeholder, proof area |
| `Logo` | `components/brand/logo.tsx` | Official mark, unmodified |

`PaymentInstructions` gained optional `qrSrc`, `qrAlt`, and `qrSample` props. When
`qrSample` is set the artwork is overlaid with a band that breaks the code and
reads "Sample · do not pay", plus a caption stating the code is not the club's.

The composite preview lives at `components/booking/booking-preview.tsx` and is
rendered by `app/design-preview/booking/page.tsx`.

## 4. Preview behavior

1. **Choose a time:** sample date strip, duration selector (60/90/120), court
   filter, and hourly slots from 7:00 AM to 11:00 PM. Slots that would run past
   midnight for the selected duration are disabled and labelled "Past closing".
   Each slot shows the applicable hourly rate. The summary computes an amount.
2. **Review details:** the account gate (required, after price and availability),
   required full name, email, and mobile, email-verification notice, GCash as the
   only confirmed method, a policy recap, and a terms checkbox.
3. **Payment:** held-slot confirmation state, separate booking and payment
   statuses, sample reference, hold expiry, payment deadline, GCash sample QR,
   and a local-only proof-selected state.

The preview does not send, persist, or validate personal data, payment data, or
files. Refreshing the route resets it.

## 5. What is client-confirmed and what is still a sample

Confirmed from the 30 October response, plus project-owner decisions taken on
4 November 2026 (marked):

| Item | Value in the preview |
| --- | --- |
| Club name | D-Hidden Pickleball Court & Bistro (confirmed 4 Nov) |
| Courts | Court 1, Court 2 |
| Hours | 7:00 AM – 12:00 AM, daily |
| Rate | ₱250/hour before 5:00 PM, ₱300/hour after |
| Durations | 60 / 90 / 120 minutes |
| Confirmation model | Temporary hold before completion |
| Account | Required at review; name, email, mobile; email verified |
| Payment | GCash QR |
| Cancellation cutoff | 24 hours |
| Self-service | Not available — contact the club |
| Group booking | Allowed; booker's name only |
| Hold | 15 minutes, starting when the request is confirmed (4 Nov) |
| Payment deadline | The same 15 minutes; expiry auto-cancels the request (4 Nov) |
| Cancellation | Full refund or free move at 24 hours or more; inside 24 hours the fee is forfeited; no-shows and late arrivals are not refunded; club closures are refunded or moved (4 Nov) |
| Address and map | Bung-aw, Pondol, Balamban, Cebu — 10.5015278, 123.7161667, linked to Google Maps and written as text (4 Nov) |
| Contact | 0956 167 0905 and gracemilan87@gmail.com (4 Nov) |

Still a labelled sample or explicitly unconfirmed:

- Dates and slot availability
- Weekend rate
- Partial-hour and cross-5:00-PM rounding
- Booking window, buffer time, maximum players
- Holiday closures and the publishable facilities list
- The GCash QR image and receiving account name
- Reference number `PREVIEW-1042`

Test mode (added 4 Nov) reaches the paid and awaiting-verification states through
a labelled control, so the flow can be demonstrated without any real transfer.

## 6. Accessibility intent

- The active step uses `aria-current="step"`.
- Date and time controls expose selection with `aria-pressed`.
- Unavailable slots are disabled and described in the accessible name by reason
  ("booked", "closed", "not available for the selected duration").
- The step heading receives focus after a step change.
- The mobile action bar stays reachable and does not replace the summary.
- Booking and payment states always include text labels.
- The file control has a visible associated label; the native input remains
  keyboard-accessible.
- The sample QR is not the only payment instruction; the amount, method,
  reference, and account caveat are all text.
- Global focus-visible and reduced-motion rules apply.

These are implementation intentions; see the validation section for what was
actually exercised.

## 7. Validation

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output; re-run 4 Nov 2026 after the owner decisions |
| `npx eslint` (project source) | Passed, no output. The bare `npm run lint` now also walks the gitignored `.tmp-ui/` headless-browser profiles left behind by the aborted 3 Nov verification run and reports 145 errors from Chrome's bundled extension scripts, not from project code |
| `npm run build` | Passed; `/`, `/design-system`, `/design-preview/booking`, `/design-preview/homepage`, `/icon.png`, `/apple-icon.png`, `/_not-found` generated |
| Route and asset check (`next start`) | `/`, `/design-system`, `/design-preview/homepage`, `/design-preview/booking`, `/icon.png`, `/qr/gcash-sample.jpg`, `/courts/pickleball1.jpg`, `/logo/hidden-pickleball.webp` all returned HTTP 200 |
| Overflow audit (headless Chrome, CDP) | No horizontal overflow on all four routes at 390px, 768px, and 1440px |
| Heading structure | Exactly one `<h1>` on all four routes at all three widths |
| Console errors | None captured on any audited route |
| Availability render | 34 slot buttons plus 7 date buttons; slots span 7:00 AM–11:00 PM |
| Selection | Selecting "7:00 AM, Court 1" set the summary to Court 1 / Thu 05 Nov / 7:00 AM / 60 minutes / ₱250 |
| Rate display | Day and evening rates shown on each slot; 5:00 PM boundary labelled |
| Duration guard | A slot whose start plus duration passes midnight is disabled |
| Account gate | Preview step 2 requires full name, email, and mobile (`required` present on all three) |
| Terms gate | "Confirm demo request" disabled until the preview-terms checkbox is selected |
| Payment state | Step 3 shows Awaiting payment / Unpaid, sample reference, hold expiry, and payment deadline |
| Sample QR | `/qr/gcash-sample.jpg` rendered at 174×319 with a visible "Sample · do not pay" band and caption |
| Keyboard traversal | Not performed beyond programmatic clicks and heading focus |
| Screen-reader review | Not performed |
| Real-device testing | Not performed |
| Safari/Firefox | Not checked |
| User testing | Not performed |
| Automated tests | No test suite exists |
| Tap-target audit | Measured: no interactive target under 44px on `/`, `/design-preview/homepage`, or `/design-preview/booking`. `/design-system` still contains the intentional 36px "Small" button sample and two disabled preview buttons |

## 8. Known limitations

1. No real inventory, booking record, account, payment, or upload exists.
2. The 15-minute hold is a project-owner decision (`D-01`), not a client answer,
   and the client may still override it.
3. The payment deadline is the hold window itself (`D-08`), decided on the same
   basis. No separate deadline and no staff extension exist.
4. The amount is pro-rated across the 5:00 PM rate change. That arithmetic is a
   reasonable default, not an approved rule, and the UI says so. Partial-hour
   rounding is undefined.
5. Weekend pricing is not applied because it was not confirmed.
6. The GCash QR is a personal stand-in. It must never be published as the club's
   payment detail.
7. The club name is confirmed as "D-Hidden Pickleball Court & Bistro" (4 Nov).
   The logo master is still raster and still needs a light-on-dark version.
8. The court photographs are used as club photography on the project owner's
   instruction. Their captions are layout samples; final captions and crops are
   Phase 5 work.
9. The preview has not been tested with users, on real devices, or with a screen
   reader.
10. The homepage mockup remains a Phase 5 placeholder and is not a production
    public page.
11. No design-tool file exists; the approved ASCII wireframes remain the
    structural reference.

## 9. Next steps

1. Obtain the club's real GCash QR and receiving account name (`D-07`).
2. Get the client's written sign-off on the 4 November owner decisions (hold,
   payment deadline, cancellation, address, name) before policies are published.
3. Obtain the remaining pricing answers: weekend rate, rounding, booking window,
   buffer, and maximum players (`D-03`, `D-11`, `D-27`).
4. Obtain explicit authorization before starting Phase 4 or any later phase.

## 10. Revision — 3 November 2026 (homepage and booking presentation)

This revision keeps the Phase 3 scope but replaces the flat review styling with
a presentation-quality interface. It does not add booking, account, payment,
email, storage, map, or staff functionality.

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Customer-facing homepage presentation, `noindex` |
| `/design-preview` | Phase review index (moved from `/`) |
| `/design-preview/booking` | Interactive booking preview |
| `/design-preview/homepage` | HTTP 307 redirect to `/` |
| `/design-system` | Token and component reference |

### Theme and tokens

- `app/globals.css` now defines a semantic token contract: `--canvas`,
  `--surface`, `--surface-raised`, `--ink`, `--heading`, `--muted`, `--line`,
  `--line-strong`, brand tints, status colors, photography scrims, and a
  theme-aware focus color.
- `html[data-theme="dark"]` remaps those values. Brand navy, blue, lime, and
  yellow stay fixed so navy bands and the logo remain consistent.
- The inline script in `app/layout.tsx` applies the stored or system theme before
  first paint. `ThemeToggle` reads the document attribute through
  `useSyncExternalStore`, so the control cannot drift from the applied theme.
- Heading and accent text use `text-heading` and `text-accent-ink` rather than
  fixed navy/blue values; fixed navy remains only on navy or light surfaces
  where contrast is intentional.

### Motion

- `motion` is the only new runtime dependency.
- Hero entrance uses the CSS `rise-in` and `hero-media-in` animations so the
  first viewport is visible before hydration.
- Below-fold sections use `Reveal` with `whileInView`, one-time playback, and a
  short 0.65s ease-out.
- Date, duration, and court selection use shared-layout pills.
- Step changes use `AnimatePresence`; focus moves after the exit completes.
- FAQ disclosure, toast, mobile action bar, proof confirmation, and the subtle
  payment-status ring are animated.
- The global reduced-motion reset removes CSS animation; Motion components check
  `useReducedMotion` and skip transform/opacity animation.

### Booking behaviour added in this revision

1. Skeleton availability on first load and after a date change.
2. Time slots grouped into morning, afternoon, and evening.
3. Two distinct empty states: no courts match the filter, and no open times for
   the selected date/duration.
4. Inline validation on blur and on submit, with focus moved to the first
   invalid field.
5. Terms checkbox styled without losing the native control; error state focuses
   the checkbox.
6. Sample hold countdown with progress bar and an expiry state.
7. Copy-reference action with success/error toast.
8. File selection with image preview, size, replace control, and optimistic
   submitted state.
9. Mobile sticky action bar during time selection.
10. Booking and payment statuses remain separate throughout.

### New and changed files

- `components/home/home-page.tsx`, `components/home/hero-media.tsx`,
  `components/home/faq.tsx`
- `components/site/site-header.tsx`, `components/site/site-footer.tsx`
- `components/motion/reveal.tsx`
- `components/ui/icons.tsx`, `components/ui/theme-toggle.tsx`,
  `components/ui/toast.tsx`
- `app/page.tsx`, `app/design-preview/page.tsx`,
  `app/design-preview/homepage/page.tsx`
- `app/globals.css`, `app/layout.tsx`
- Refreshed booking flow, button, field, alert, badge tint, stepper, summary,
  policy notice, and payment instructions
- `package.json` (adds `motion`)

### Validation performed

| Check | Result |
| --- | --- |
| Type check, lint, production build | All passed |
| 42 headless-browser checks | All passed |
| Route audit (4 routes × 3 widths) | No overflow, one `<h1>`, no console errors |
| Theme tokens | Light/dark body, heading, card, and persistence verified |
| Booking flow | Skeleton, selection, focus, validation, payment, QR, mobile bar verified |
| Redirect and assets | 307 redirect; logo, court, and QR assets returned HTTP 200 |
| Real device, Safari/Firefox, screen reader, user testing | Not performed |

### Limitations

1. **No Lottie.** There are no approved Lottie assets; CSS/SVG motion is used for
   the key moments. Adding licensed artwork later would not require changing the
   layout.
2. **No shadcn/ui migration.** The existing primitive layer was refreshed rather
   than replaced; it already follows the same token and composition approach.
3. The homepage is a presentation preview and remains `noindex`. The address,
   map, phone, and email are now published (4 Nov); the open-play schedule, the
   facilities list, and the club's real GCash code are still missing.
4. The booking countdown, reference, availability, and statuses are sample data.
5. No automated test suite exists.

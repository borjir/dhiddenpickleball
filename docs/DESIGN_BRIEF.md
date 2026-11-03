# Design Brief — Hidden Pickleball Court & Bistro

**Version:** 1.1 (Phase 1 foundation, revised 3 November 2026)
**Blueprint reference:** `docs/PRODUCT_BLUEPRINT.md`, Phase 1 and Phase 3
**Status:** Draft for client review. Not production-approved.

## 1. Purpose and scope

Phase 1 establishes a distinctive, club-specific visual direction before the
public pages, booking flow, and staff tools are built. It defines the palette,
type, spacing, shape, component styles, photography treatment, and placeholder
policy that later phases will reuse.

Included in this phase:

- Design tokens implemented in `app/globals.css`
- Display and body typefaces loaded through `next/font`
- Reusable UI primitives and a component reference route (`/design-system`)
- A desktop/mobile homepage mockup (`/design-preview/homepage`)
- Temporary review index (`/`)
- Placeholder brand and image components
- This brief, an asset inventory, and `docs/PROJECT_STATUS.md`

Deliberately excluded: real public content pages, booking logic, accounts,
payments, staff tools, OpenFreeMap, notifications, coaching, and DUPR.

## 2. Brand personality

Practical adjectives for review: **welcoming, active, dependable, locally
rooted**. The club is a place people visit to play, not a software product.

Design consequences:

- Calm, neutral surfaces with navy structure and one obvious blue action.
- Sport-adjacent energy expressed through typography, court-line motifs, and
  controlled lime/yellow accents — not gradients, glassmorphism, or neon.
- Operational clarity: prices, times, and payment states must read faster than
  decoration.
- No invented social proof, statistics, schedules, prices, or venue claims.

## 3. Logo status

The official mark was supplied on 3 November 2026 and is used unmodified at
`public/logo/hidden-pickleball.webp` (1254×1254, transparent, cream disc).

`components/brand/logo.tsx` renders it through `next/image`. The artwork is never
recoloured, cropped, or redrawn. Favicon and app icon are derived by resizing
only: `app/icon.png` (512×512) and `app/apple-icon.png` (180×180).

The wordmark inside the logo reads **"-HIDDEN PICKLEBALL COURT & BISTRO"** with a
large leading *D*. The project owner chose to match the logo on 3 November 2026,
so the written name is **"D-Hidden Pickleball Court & Bistro"**. The questionnaire
wrote "D' Hidden Pickle Court & Bistro", so the hyphen-versus-apostrophe form of
the leading D still needs one written confirmation.

Still outstanding:

- [ ] SVG master (preferred for print and very large displays)
- [ ] Light-on-dark version, if one exists
- [ ] Confirmation of clear space and minimum size
- [ ] Written confirmation of the exact name punctuation

`LogoPlaceholder` remains in the repository but is no longer used by any route.

## 4. Color system

Sampled from the supplied logo file on 3 November 2026 rather than the
blueprint's estimates. The measured values differ from the tokens in use, so the
tokens below are the current implementation and the measured values are recorded
for a decision in Phase 5.

| Sample | Measured from logo | Current token |
| --- | --- | --- |
| Navy field | `#062E6B` | `--color-brand-navy` `#123B78` |
| Lime ring | `#84A903` | `--color-brand-lime` `#78B51B` |
| Yellow ball | `#E2E51B` | `--color-brand-yellow` `#F0E51C` |
| Cream disc | `#F6FAF0` | `--color-page` `#F8FAF1` |

The navy gap is the visible one: the logo is noticeably deeper than the token.

**Decided 4 November 2026 by the project owner:** keep the shipped tokens. The
measured `#062E6B` is the logo's own ink, not an instruction to re-theme the
interface; when an SVG master is produced it should be drawn in `#123B78` so the
mark and the UI match. Re-mapping the tokens was rejected because it would change
every surface and every verified contrast pair for no user-visible gain.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand-navy` | `#123B78` | Headings, navigation, dark bands |
| `--color-brand-navy-deep` | `#0B2A58` | Pressed navy, deepest surface |
| `--color-brand-blue` | `#1674D5` | Primary actions, links, selected state |
| `--color-brand-blue-strong` | `#0F5CB0` | Primary hover |
| `--color-brand-blue-soft` | `#E7F1FC` | Selected and informational fills |
| `--color-brand-lime` | `#78B51B` | Availability accents, small marks |
| `--color-brand-lime-ink` | `#3F6B0A` | Text on lime tints |
| `--color-brand-lime-soft` | `#EDF6DC` | Available-state fills |
| `--color-brand-yellow` | `#F0E51C` | Sparing highlights, text selection |
| `--color-brand-yellow-soft` | `#FBF6CC` | Sparse badge fills |
| `--color-page` | `#F8FAF1` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, forms, dialogs |
| `--color-ink` | `#171A1F` | Primary text |
| `--color-muted` | `#667085` | Secondary text, hints |
| `--color-line` | `#E4E8ED` | Borders and dividers |
| `--color-line-strong` | `#C9D2DC` | Placeholder outlines |

Semantic status colors are intentionally independent of the brand palette:

| Token | Value | Meaning |
| --- | --- | --- |
| `--color-success` | `#18794E` | Paid, confirmed, available |
| `--color-warning` | `#9A5B00` | Pending, awaiting verification |
| `--color-danger` | `#B42318` | Error, rejected, no-show |
| `--color-info` | `#175CD3` | Neutral guidance |

Usage rules:

- Navy and off-white are the foundation; blue is the primary action; lime and
  yellow are accents, never long-form text colors.
- Lime `#78B51B` is not AA-safe for small text on white. Use
  `--color-brand-lime-ink` for text on lime tints.
- Status is always paired with readable text or an icon, never color alone.
- **Dark theme is available.** A semantic token layer remaps page, surface,
  text, line, tint, status, and scrim values under `html[data-theme="dark"]`.
  Brand navy, blue, lime, and yellow stay fixed. The theme follows the OS by
  default, can be switched from any shell, and persists in `localStorage`.
  Headings and accent text use `--color-heading` and `--color-accent-ink`, never
  a fixed navy/blue that would fail on a dark surface.

### Dark theme values

| Token | Light | Dark |
| --- | --- | --- |
| `--canvas` | `#F7F9F0` | `#070D18` |
| `--surface` | `#FFFFFF` | `#0C1524` |
| `--surface-raised` | `#FFFFFF` | `#111C2E` |
| `--ink` | `#171A1F` | `#E9EEF7` |
| `--heading` | `#123B78` | `#F5F8FC` |
| `--muted` | `#5D6878` | `#9DABBD` |
| `--line` | `#E3E8E6` | `#1D2B41` |
| `--accent-ink` | `#0F5CB0` | `#7CB9FF` |

## 5. Typography

| Role | Family | Weights | Source |
| --- | --- | --- | --- |
| Display | Archivo | 500–800 | Google Fonts, SIL Open Font License |
| Body | Source Sans 3 | 400–700 | Google Fonts, SIL Open Font License |

Loaded with `next/font/google` (`display: swap`) in `app/layout.tsx`, exposed as
`--font-archivo` and `--font-body`, mapped to `--font-display` and `--font-sans`.

Type behavior:

- Hero display: `clamp(2.5rem, 5.2vw, 4.25rem)`, line-height 1.02, tracking
  −0.03em. Short headlines only.
- Section titles: `clamp(1.75rem, 2.6vw, 2.5rem)`, line-height 1.1.
- Headings: 22px/1.25. Body: 16px/1.6. Body large: 18px/1.6.
- Caption: 13px/1.5. Eyebrow: 12px uppercase, tracking 0.16em.
- Body copy never below 16px on mobile; form labels and hints stay readable.
- Do not set long passages in uppercase or in lime/yellow.
- Booking references may use `font-mono` (tabular readability) sparingly.

## 6. Spacing, shape, elevation, motion

- **Spacing:** 4px base rhythm — 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
  Sections use generous top/bottom padding on desktop and reduced but safe
  padding on mobile.
- **Radius:** 6px (`sm`), 10px (`md`, default controls), 14px (`lg`, cards and
  media), 20px (`xl`, feature panels). Avoid pill containers except small
  status badges.
- **Elevation:** `shadow-card` for normal surfaces, `shadow-raised` for dialogs
  only. No heavy floating-card look.
- **Borders:** 1px `--color-line`; dashed `--color-line-strong` only for
  placeholders.
- **Motion:** 150–300ms for hover, press, selection, and state changes; dialog
  and step transitions 220–280ms; section reveals up to 650ms with an ease-out
  curve. The hero uses CSS-only entrance so it animates at first paint. Transform
  and opacity only. No scroll hijacking, parallax, carousels, or decorative
  loops. `prefers-reduced-motion` removes non-essential movement globally, and
  Motion components check the preference before animating.
- **Icons:** one shared inline set at 1.7px stroke, 20–24px, currentColor only;
  icon-only controls carry an accessible name and a 44px target.

## 7. Icons

- Outline style, 1.5–1.75px stroke, 20px or 24px, rounded caps.
- No icon font and no mixed icon packs. Reuse a small inline set when needed.
- Icon-only buttons require an accessible name and at least a 44px target.
- Pair unfamiliar icons with a visible label.

Only a few inline icons exist in this phase (select chevron, spinner, court
motif). A shared icon module should be added when a real need appears, not
speculatively.

## 8. Component decisions

Implemented as primitives in `components/ui` and demonstrated on
`/design-system`.

**Buttons** — primary (blue), secondary (outlined navy), navy (confirmation),
ghost (low-emphasis), danger (destructive), inverse (on navy). Sizes 36/44/52px.
States: hover, focus-visible, pressed, disabled, loading. One primary action per
section. `Button` defaults to `type="button"`; forms must pass `type="submit"`
explicitly.

**Inputs and selects** — 44px tall, white surface, 1px line border, blue focus
ring, inline hint or error text. Labels are always visible. Errors describe how
to fix the problem. Native select is used for reliability; custom menus are
deferred until they can meet the same keyboard behavior.

**Calendar and time slots** — dates as 44px+ tappable targets, selected state
using navy or blue fill plus `aria-pressed`, disabled/full slots visibly
distinct and labeled “Full” or “unavailable” in text. Sample data is explicitly
marked as non-real.

**Status badges** — booking and payment status use separate badges with text
and a dot. Payment states include unpaid, awaiting proof, awaiting
verification, paid, rejected, and refund states. A screenshot upload never maps
directly to “Paid”.

**Alerts** — info, success, warning, error. Left accent border, colored label,
navy title, plain-language body. Error alerts explain the next step.

**Cards** — used for a single decision, not as a universal page template.
Media is labeled until approved photography exists. Avoid repeating identical
card grids for unrelated content.

**Tables** — staff-facing, explicit text statuses, horizontal scroll on narrow
screens rather than hidden columns. Sample amounts are left blank because
pricing is unconfirmed.

**Dialog** — native `<dialog>`, visible backdrop, contained focus, Escape
support, 200ms entrance that is removed under reduced motion. Financial or
destructive actions will require a deliberate confirmation in later phases.

**Loading, empty, and error states** — skeleton blocks match final layout
dimensions; empty states explain the next step; errors never imply data was
saved or payment was verified.

## 9. Photography treatment

- Real club, court, player, and facility photography only; no stock sports
  imagery that could misrepresent the venue.
- Preferred crops: 16:9 wide hero, 4:3 supporting media, 1:1 detail where
  useful. Keep the subject on the right third for hero overlays if text is
  added later.
- Optimize before upload; no giant originals. Descriptive alt text for
  meaningful images; empty alt for decorative marks.
- Reserve final dimensions to avoid layout shift.
- Placeholders are dashed, labeled, and visually distinct from real content.
  Do not present them as final in a client demo.

## 10. Image and asset inventory

| Asset | Intended use | Status |
| --- | --- | --- |
| Official logo (WebP, 1254×1254) | Global navigation, footer, icon source | **Received 3 Nov 2026** — `public/logo/hidden-pickleball.webp` |
| Logo SVG master | Print, large displays | **Missing** |
| Logo light version | Navy footer/band | **Missing — current mark used as-is** |
| Favicon / app icon | Browser tab, home screen | **Derived** — `app/icon.png`, `app/apple-icon.png` |
| Hero image | Homepage first viewport | **Supplied** — `public/courts/pickleball2.jpg` |
| Court photos | Court details, booking cards | **Supplied** — `public/courts/pickleball1.jpg`, `pickleball2.jpg` |
| Facility/interior photos | About, location | **Missing** |
| Open-play/community photos | Open play section | **Missing** |
| Coach portraits | Deferred with coaching phase | **Not required now** |
| OpenFreeMap style/location data | Location page (Phase 5) | **Not configured** |
| GCash QR image | Phase 12 payments | **Personal stand-in only** — `public/qr/gcash-sample.jpg`; must be replaced |
| Receiving account name | Payment screen | **Missing** |
| Club address, map pin, phone, email | Footer, location section | **Supplied 4 Nov 2026** — `lib/club.ts` |
| Maya QR image | Not confirmed for court bookings | **Not required** |

The two court photographs were supplied on 3 November 2026 and are treated as
club photography by explicit project-owner instruction. The payment QR is **not**
a club asset: it belongs to a personal GCash account used as a stand-in, and it is
rendered behind a band that breaks the code so it cannot be scanned or paid.

Permissions, photographer rights, and identifiable-person consent must be
confirmed before publishing any photography.

## 11. Client decisions still needed

Answered on 30 October 2026 and already applied: two courts, daily 7:00 AM–12:00
AM hours, ₱250/₱300 hourly rates, 60/90/120-minute durations, account required at
review, GCash-only court payment, 24-hour cancellation cutoff, no self-service
cancel/reschedule, group booking without a roster.

Resolved on 4 November 2026 by the project owner: the name is "D-Hidden
Pickleball", the hold is 15 minutes with the payment deadline inside it, the
cancellation outcomes are set, and the address, map pin, phone, and email are
supplied — all recorded in `docs/ux/CLIENT_DECISIONS.md` under *Owner decisions*.
The palette is settled in §9 above.

Still needed:

1. Weekend rate; partial-hour and cross-5:00-PM rounding.
2. Booking window, buffer time, and maximum players per court.
3. Publishable facilities list and holiday closures.
4. Open-play schedule, price, capacity, skill levels, and waitlist rules.
5. Named staff accounts and the permission split.
6. The club's real GCash QR and receiving account name.
7. Any publishable social links.
8. Privacy, terms, and payment-proof retention wording.

## 12. Verification performed

- Token values checked against the blueprint’s proposed palette.
- Contrast spot-checked for body text, muted text, and white text on blue/navy.
  Lime and yellow are restricted from small text use.
- Component states implemented in code: hover, focus-visible, pressed,
  disabled, loading, error, empty, and sample selected/unselected slots.
- Production build reviewed in headless Chrome at 390px, 768px, and 1440px:
  no horizontal overflow, exactly one `<h1>` per route, and no console errors.
- Screenshots inspected for the homepage and design reference at 390px and
  1440px; the homepage was also inspected after the mobile CTA and navigation
  fixes.
- Archivo and Source Sans 3 both loaded and applied (computed font checked).
- Slot-picker selection updated `aria-pressed` and its live summary.
- Dialog opened with focus on the first action and a resolved
  `aria-describedby`; it was closed programmatically.
- First `Tab` on the mockup showed a visible focus ring.
- **Not yet performed:** real-device touch testing, screen-reader passes
  (VoiceOver/TalkBack/NVDA), Safari/Firefox checks, visual reduced-motion
  inspection, full keyboard traversal, Escape-key dismissal, and throttled
  performance profiling. These are required before the design is described as
  polished or production-ready.

## 13. Files

- `app/globals.css` — tokens, base styles, focus/reduced-motion rules, skeleton,
  dialog backdrop/animation, step-entrance animation
- `app/layout.tsx` — fonts, metadata, base body
- `app/page.tsx` — customer-facing homepage presentation (Phase 3 preview)
- `app/design-preview/page.tsx` — phase review index
- `app/design-system/page.tsx` — component and token reference, including the
  Phase 3 booking-flow components
- `app/design-preview/homepage/page.tsx` — redirect to `/`
- `app/design-preview/booking/page.tsx` — Phase 3 booking-flow preview route
- `components/booking/booking-preview.tsx` — local-state booking prototype
- `components/home/*` — homepage composition, hero media, FAQ
- `components/site/*` — marketing header and footer
- `components/motion/reveal.tsx` — shared entrance motion
- `components/ui/*` — button, badge, alert, field, modal preview, slot demo,
  stepper, booking summary, status pair, policy notice, payment instructions,
  icons, theme toggle, toast
- `components/brand/logo.tsx` — official mark; `components/brand/media-placeholder.tsx`
  — image slot that accepts approved photography
- `app/icon.png`, `app/apple-icon.png` — icon sizes derived from the logo
- `public/logo/`, `public/courts/`, `public/qr/` — supplied assets plus the
  labeled payment stand-in
- `lib/cn.ts` — class name helper
- `docs/DESIGN_BRIEF.md`, `docs/PHASE_3_DESIGN.md`,
  `docs/PROJECT_STATUS.md`

## 14. Revision — 3 November 2026

The visual foundation was extended into a presentation-quality homepage and
booking flow without adding product functionality.

- **Homepage structure:** fixed navigation with scroll-aware surface, mobile
  menu, theme toggle, and booking CTA; photography-led hero with confirmed
  hours and rates; court cards; rate panel; three-step explanation; confirmed
  policy details; location band; FAQ; final CTA; footer.
- **Booking structure:** selection, review, and payment steps with a sticky
  summary, grouped availability, animated selection, skeleton and empty states,
  inline validation, a sample hold countdown, proof upload states, and a mobile
  action bar.
- **Surface rhythm:** navy bands, cream canvas, white/dark cards, fine
  hairlines, restrained blue-tinted shadows, and a low-contrast court grid. No
  neon gradients, heavy glass panels, or repeated card grids.
- **Content discipline:** no testimonials, ratings, member counts, facilities,
  schedules, address, map pin, or social links were invented. Unconfirmed
  business rules remain explicit samples in the booking preview.
- **Not adopted:** Lottie (no approved artwork) and a wholesale shadcn/ui
  migration (the existing primitive layer was refreshed instead).
- **Still unverified:** real devices, Safari/Firefox, screen readers, full
  keyboard traversal, reduced-motion visual inspection, and user testing.

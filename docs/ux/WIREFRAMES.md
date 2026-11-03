# Phase 2 — Low-Fidelity Wireframes

**Version:** 1.0
**Date:** 27 October 2026
**Status:** Client-approved as drafted, 27 October 2026. Open business decisions remain deferred.
**Companion:** `docs/ux/UX_PLAN.md`, `docs/ux/CLIENT_DECISIONS.md`.

These are structural wireframes, not visual designs. Phase 1 tokens and
components apply later. Values shown as `[PRICE]`, `[DURATION]`, `[CUTOFF]`,
`[CAPACITY]`, `[HOURS]`, `[ADDRESS]`, and `[SESSION]` must come from the client.

Mobile is treated as the primary layout constraint: the booking flow, payment
proof step, and staff actions are specified to work at 390px first. Frames below
show desktop before mobile only for side-by-side comparison; the mobile
annotations define the constraining behavior, not an afterthought.

## Legend

| Symbol | Meaning |
| --- | --- |
| `[ACTION]` | Button or primary link |
| `(field)` | Input, select, or date control |
| `◻` | Image/media placeholder |
| `▣` | Selected state |
| `•` | Status or metadata |
| `…` | Repeated items |
| `{ }` | Conditional block |
| `D-xx` | Client decision required |

---

## 1. Global shells

### 1.1 Public — desktop

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]   Book   Courts   Open Play   Visit   Club      Sign in  [Book a court] │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   PAGE CONTENT                                                            │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│ CONTACT / HOURS / ADDRESS      QUICK LINKS       POLICIES      SOCIAL     │
│ [Manual QR payments verified by club staff]                               │
└───────────────────────────────────────────────────────────────────────────┘
```

Annotations:

- One primary button in the header: **Book a court**.
- “Sign in” becomes an account menu when signed in: Bookings, Profile, Staff
  area (if role), Sign out.
- No coaching or DUPR links.
- Footer links go only to real, published pages; no dead destinations.

### 1.2 Public — mobile (390px)

```text
┌──────────────────────────────┐
│ [LOGO]           [Book] [☰]  │
├──────────────────────────────┤
│                              │
│  PAGE CONTENT                │
│                              │
├──────────────────────────────┤
│ Contact                      │
│ Hours                        │
│ Quick links                  │
│ Policies                     │
└──────────────────────────────┘
```

Annotations:

- `[☰]` opens a full-screen navigation sheet with public links, account access,
  contact, and hours. Focus is trapped while open.
- `[Book]` is the short mobile label for the primary action. Full accessible
  name: “Book a court”.
- The menu closes on route change and returns focus to the trigger.

### 1.3 Booking wizard shell

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]        Date & time  →  Details & review  →  Confirmation   [Exit]  │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   STEP CONTENT                                          BOOKING SUMMARY   │
│                                                         ┌───────────────┐ │
│                                                         │ Court         │ │
│                                                         │ Date / time   │ │
│                                                         │ Duration      │ │
│                                                         │ [PRICE]       │ │
│                                                         │ Payment note  │ │
│                                                         └───────────────┘ │
│                                                                           │
│   [Back]                                              [Continue / Confirm]│
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ [LOGO]      Step 1 of 3  [×] │
│ ●────────○────────○          │
├──────────────────────────────┤
│ STEP CONTENT                 │
│                              │
│                              │
├──────────────────────────────┤
│ [PRICE]  [Continue]          │ ← sticky action bar
└──────────────────────────────┘
```

Annotations:

- Exit asks for confirmation only if the player has entered data.
- Summary collapses to a disclosure on mobile above the action bar.
- Payment is **not** part of the wizard confirmation claim; full instructions
  follow on the booking page.
- Step changes move focus to the step heading and announce the new step.

### 1.4 Account shell

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]   Book   Courts   Open Play   Visit   Club            [Account ▾]    │
├───────────────────────────────────────────────────────────────────────────┤
│ Overview   Bookings   Profile                         ← Back to site       │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ACCOUNT CONTENT                                                         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: tabs scroll horizontally; content is single column.

### 1.5 Staff shell

Desktop:

```text
┌───────────────┬───────────────────────────────────────────────────────────┐
│ [LOGO] STAFF  │ Tue 27 Oct 2026        [Search booking/customer]  [Role ▾] │
│               ├───────────────────────────────────────────────────────────┤
│ Dashboard     │                                                           │
│ Calendar      │                                                           │
│ Payments  (3) │   PAGE CONTENT                                            │
│ Open Play     │                                                           │
│ Courts        │                                                           │
│ Customers     │                                                           │
│ Reports       │                                                           │
│ Audit         │                                                           │
│ Settings      │                                                           │
└───────────────┴───────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ STAFF   Tue 27 Oct    [☰]    │
├──────────────────────────────┤
│ Today’s schedule / content   │
│                              │
└──────────────────────────────┘
```

Annotations:

- Staff navigation shows a count only when it represents real queued work, e.g.
  “Payments (3)” for awaiting verification.
- Settings, Audit, and role controls are hidden for unauthorized roles, and the
  server must enforce the same restriction.
- No coaching section.

---

## 2. P-01 Home

**Route:** `/` (public)
**Purpose:** establish the club and get a visitor into booking.
**Primary action:** Book a court.
**Secondary:** Open play, view courts, location.

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]  Book  Courts  Open Play  Visit  Club        Sign in  [Book a court]│
├───────────────────────────────────────────────────────────────────────────┤
│  HIDDEN PICKLEBALL COURT & BISTRO                                         │
│  Book the court.                                                          │
│  Find your game.                                     ◻ HERO PHOTO        │
│                                                                           │
│  One short, approved line about the club.            [ASSET]              │
│                                                                           │
│  [Book a court]  [See open play]                                          │
│  • Manual QR payments  • Staff-verified  • [HOURS]                        │
├───────────────────────────────────────────────────────────────────────────┤
│  TWO WAYS TO PLAY                                                         │
│  01 Court reservations                    → Book a court                   │
│     [PRICE] · [DURATION] · [RULES SUMMARY]                                │
│  02 Normal open play                      → View sessions                  │
│     [PRICE] · [SCHEDULE] · [SKILL LEVEL]                                  │
├───────────────────────────────────────────────────────────────────────────┤
│  {REAL UPCOMING SESSIONS ONLY}                                            │
│  Next open play · [DATE] · [TIME] · [CAPACITY REMAINING]  →                │
├───────────────────────────────────────────────────────────────────────────┤
│  FIND THE CLUB                                     ◻ MAP / VENUE PHOTO    │
│  [ADDRESS TEXT] · [HOURS] · [CONTACT]              [Get directions]        │
├───────────────────────────────────────────────────────────────────────────┤
│  Common questions → FAQ        Contact        Policies                    │
├───────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ [LOGO]           [Book] [☰]  │
├──────────────────────────────┤
│ HIDDEN PICKLEBALL            │
│ Book the court.              │
│ Find your game.              │
│                              │
│ Short approved club line.    │
│                              │
│ [Book a court]  (full width) │
│ [See open play] (secondary)  │
│ • Manual QR  • Staff verify  │
│                              │
│ ◻ HERO PHOTO                 │
│                              │
│ 01 Court reservations        │
│ [PRICE] · [DURATION]   →     │
│                              │
│ 02 Normal open play          │
│ [PRICE] · [SCHEDULE]   →     │
│                              │
│ ◻ MAP / VENUE PHOTO          │
│ [ADDRESS] [Get directions]   │
│                              │
│ Contact · Hours · Policies   │
└──────────────────────────────┘
```

Annotations:

- Do not promise “instant confirmation” until `D-01` is answered.
- No testimonials, player counts, ratings, or awards.
- Real sessions appear only when data exists; otherwise the block is omitted.
- Home is not a generic card grid; services are editorial rows.

States: hero image placeholder labeled; no live availability on home.

---

## 3. P-02 Book chooser

**Route:** `/book`
**Purpose:** choose the correct service with enough information to decide.
**Primary action:** choose Court reservation.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]  Book  Courts  Open Play  Visit  Club        Sign in  [Book a court]│
├───────────────────────────────────────────────────────────────────────────┤
│  Book                                                                     │
│  Choose how you want to play.                                             │
│                                                                           │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │ 01  COURT RESERVATION              │  │ 02  NORMAL OPEN PLAY         │ │
│  │                                    │  │                              │ │
│  │ Reserve a court for your group.    │  │ Join a scheduled session.    │ │
│  │ [PRICE] · [DURATION]               │  │ [PRICE] · [SKILL LEVEL]      │ │
│  │ Capacity: [CONFIRMED RULE]         │  │ Capacity: [CAPACITY]         │ │
│  │                                    │  │                              │ │
│  │ [Check availability]               │  │ [View sessions]              │ │
│  └────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                           │
│  ⓘ Booking is unpaid until the club verifies your payment.                │
│    No online payment is taken automatically.                              │
│                                                                           │
│  Payment options: [CONFIRMED METHODS]   ·   Rules: [LINK]                 │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: the two options stack as full-width rows, price/rules visible before
the button. No hidden fine print.

Annotations:

- Only MVP services appear. No greyed-out coaching or DUPR cards.
- If a service is temporarily unavailable, show a reason and contact path.
- Price, duration, capacity, and requirements appear before personal details.

States: loading the service summary; service unavailable; rules link failure.

---

## 4. P-03 Courts index and P-04 Court detail

### Courts index — `/courts`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  Courts                                                                   │
│  Every court, what it offers, and how to book.                            │
│                                                                           │
│  ◻ COURT PHOTO     Court 1                      [PRICE]                   │
│                    [CONFIRMED FACILITIES]       [View court] →            │
│  ─────────────────────────────────────────────────────────────────────    │
│  ◻ COURT PHOTO     Court 2                      [PRICE]                   │
│                    [CONFIRMED FACILITIES]       [View court] →            │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: stacked media + name + price + CTA. Do not hide price.

### Court detail — `/courts/[slug]`

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← All courts                                                              │
│                                                                           │
│  ◻ COURT PHOTO (approved)                  Court 1                       │
│                                             [PRICE] / [DURATION]          │
│                                             [HOURS]                       │
│                                             [Book this court]             │
│                                                                           │
│  About this court                                                         │
│  [CONFIRMED FACILITIES ONLY]                                             │
│                                                                           │
│  Rules                                                                    │
│  [RULES THAT MATCH POLICY]                                               │
│                                                                           │
│  Availability                                                             │
│  Next available: [DATE/TIME] or [Check availability]                     │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: media, name/price, CTA, details, rules. Sticky CTA optional but must not
cover content.

Annotations:

- Do not claim indoor coverage, lighting, or equipment unless confirmed.
- Closed/maintenance notices appear near availability, not buried.
- The availability block shows the next real available time when data exists;
  it must not display a fabricated slot.

States: no approved photo; court closed; no availability; partial content.

---

## 5. P-05 Open play index

**Route:** `/open-play`
**Purpose:** find a session that fits date, level, and capacity.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  Open play                                                                │
│  Join a scheduled session. Normal open play only.                         │
│                                                                           │
│  [Date ▾]  [Skill level ▾]  [Show available only]                        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ THU 29 OCT · 6:00–8:00 PM     Intermediate        [PRICE]           │  │
│  │ [CAPACITY] spots left          ● Open              [View session]   │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ FRI 30 OCT · 6:00–8:00 PM     All levels          [PRICE]           │  │
│  │ Full                            ● Full              [View session]   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  No waitlist unless the club approves one.                                │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: filter button opens a sheet; session rows stack with time, level,
capacity, status, and CTA. Full rows remain readable and non-actionable.

States: no sessions, loading, cancelled, past sessions hidden by default.

---

## 6. P-06 Open-play session detail

**Route:** `/open-play/[slug]`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← All sessions                                                            │
│                                                                           │
│  THU 29 OCT · 6:00–8:00 PM                                                │
│  Intermediate open play                        ● Open · [CAPACITY] left  │
│                                                                           │
│  [PRICE] · [DURATION] · Court [COURT]                                     │
│                                                                           │
│  [Register]                                                               │
│                                                                           │
│  What to expect                                                           │
│  [APPROVED DESCRIPTION]                                                   │
│                                                                           │
│  What to bring                                                            │
│  [CONFIRMED LIST]                                                         │
│                                                                           │
│  Payment                                                                  │
│  [D-09: pay at club or manual QR proof — show one, clearly]               │
│                                                                           │
│  Cancellation                                                             │
│  [CUTOFF + POLICY LINK]                                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: status and CTA above the fold; details below.

States: full, cancelled, past, registration closed, account required.

---

## 7. P-07 Court availability — wizard step 1

**Route:** `/book/court`
**Purpose:** show only valid slots and let the player choose confidently.
**Primary action:** Continue with selected slot.

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]     ● Date & time  →  ○ Details  →  ○ Confirmation        [Exit]   │
├───────────────────────────────────────────────────────────────────────────┤
│  Choose a date and time                    [PRICE] basis: [CONFIRMED]     │
│  Timezone: Asia/Manila · [HOURS]                                          │
│                                                                           │
│  (Date) [◀]  [7-day strip: Mon 26 · Tue 27 · Wed 28 · …]  [▶]  [Month ▾]  │
│  Duration:  [60 min ▾] [90 min ▾] [120 min ▾]   Court: [All ▾]           │
│                                                                           │
│  ┌──────────────────────── AVAILABLE TIMES ──────────────────────────┐   │
│  │  Court 1                                                          │   │
│  │  [7:00 AM] [8:00 AM] [9:00 AM — booked] [10:00 AM] [… ]           │   │
│  │  Court 2                                                          │   │
│  │  [7:00 AM] [8:00 AM — closed] [9:00 AM] [10:00 AM] [… ]           │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Legend: Available · Selected · Unavailable · Closed                      │
│  ⓘ Availability is checked again when you confirm.                        │
│                                                                           │
│  [Back]                                              [Continue →]         │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ [LOGO]     Step 1 of 3   [×] │
│ ●────────○────────○          │
├──────────────────────────────┤
│ Choose date and time         │
│ Asia/Manila · [HOURS]        │
│                              │
│ ‹  Mon Tue Wed Thu Fri Sat › │
│    26  27  28  29  30  31     │
│                              │
│ Duration  [60 min ▾]         │
│ Court     [All ▾]            │
│                              │
│ Court 1                      │
│ [7:00 AM]        [8:00 AM]   │
│ [9:00 AM]  Booked            │
│                              │
│ Court 2                      │
│ [7:00 AM]  [9:00 AM]         │
│                              │
│ Legend …                     │
├──────────────────────────────┤
│ [PRICE]            [Continue]│
└──────────────────────────────┘
```

Annotations:

- Only valid slots are selectable. Unavailable slots remain visible with text so
  the grid does not reflow unpredictably.
- Date strip and month picker share state. Selected date is announced.
- Selecting a slot updates the summary and enables Continue.
- No countdown/hold is shown unless `D-08` approves one.
- Empty day: “No courts available on this date” + next available date action.
- Conflict: inline alert, lost slot marked unavailable, other slots preserved.
- Closed days and past dates are disabled with a reason.

---

## 8. P-08 Details and review — wizard step 2

**Route:** `/book/court/details`
**Purpose:** confirm the exact commitment before creating a booking.
**Primary action:** Confirm booking.

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [LOGO]     ✓ Date & time  →  ● Details & review  →  ○ Confirmation [Exit] │
├───────────────────────────────────────────────────────────────────────────┤
│  Review your booking                          ┌─────────────────────────┐ │
│                                               │ Court 1                 │ │
│  Date        Thu 29 Oct 2026                  │ Thu 29 Oct · 6:00–7:00 PM│ │
│  Time        6:00–7:00 PM                     │ 60 min · Asia/Manila    │ │
│  Duration    60 min                           │ [PRICE]                 │ │
│  Court       Court 1                          │ Payment: [METHOD]       │ │
│  Amount      [PRICE]                          │ ● Booking: —            │ │
│                                               │ ● Payment: Unpaid       │ │
│                                               └─────────────────────────┘ │
│                                                                           │
│  Payment method                                                            │
│  ▣ GCash QR   ○ Maya QR   ○ Bank transfer (if supported)   ○ Pay at club  │
│  {D-07 decides what is shown}                                             │
│  ⓘ Your booking is unpaid until club staff verifies the transfer.          │
│                                                                           │
│  Before you provide your details                                          │
│  • Cancellation cutoff: [CUTOFF]                                          │
│  • No-show: [RULE]                                                        │
│  • Payment deadline: [DEADLINE]                                           │
│  • Capacity / players: [CONFIRMED RULE]                                   │
│                                                                           │
│  {D-02: Sign in / create account, or continue as guest — one path}        │
│                                                                           │
│  Your details                                                             │
│  (Full name)                                                              │
│  (Email)                                                                  │
│  (Mobile)  {prefilled when signed in; per D-11}                           │
│                                                                           │
│  ☐ I agree to the booking and payment terms                               │
│                                                                           │
│  [Back]                                             [Confirm booking]     │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ [LOGO]     Step 2 of 3   [×] │
│ ✓────────●────────○          │
├──────────────────────────────┤
│ Review your booking          │
│ ┌──────────────────────────┐ │
│ │ Court 1                  │ │
│ │ Thu 29 Oct · 6–7 PM      │ │
│ │ 60 min · [PRICE]         │ │
│ └──────────────────────────┘ │
│                              │
│ Payment method               │
│ ▣ GCash  ○ Maya  ○ Bank      │
│ ⓘ Unpaid until staff verify. │
│                              │
│ Before your details          │
│ Cutoff [CUTOFF]              │
│ No-show [RULE]               │
│ Payment by [DEADLINE]        │
│ Capacity [RULE]              │
│                              │
│ {D-02: Sign in or guest}     │
│                              │
│ Your details                 │
│ (Full name)                  │
│ (Email)                      │
│ (Mobile)                     │
│                              │
│ ☐ I agree to terms           │
│                              │
├──────────────────────────────┤
│ [PRICE]         [Confirm]    │
└──────────────────────────────┘
```

Annotations:

- Price, duration, payment method, and rules are visible at the same time before
  the account/personal step.
- Account gate placement follows `D-02`; selection and entered data survive
  authentication.
- Submit enters a pending state, blocks repeat submits, and moves focus to the
  result.
- Slot lost: return to step 1 with the lost court/time marked and an alert.
- Terms and policy links must not hide critical price or payment information.

States: validation errors, auth required, slot conflict, network failure,
pending submit, booking approval required.

---

## 9. P-09 Booking confirmation

**Route:** `/account/bookings/[reference]` (confirmation is the first view after
creation; requires the agreed access model)
**Purpose:** confirm what happened and make the next step obvious.
**Primary action:** Pay / submit proof.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  ✓ Booking confirmed {or “Request received — awaiting approval” (D-01)}   │
│                                                                           │
│  Reference  HP-[REF]                                       [Copy]         │
│  Court 1 · Thu 29 Oct 2026 · 6:00–7:00 PM · 60 min                        │
│  Amount due [PRICE]                                                       │
│                                                                           │
│  ┌── Booking ────────────┐   ┌── Payment ──────────────────────────────┐  │
│  │ ● Confirmed           │   │ ● Unpaid                               │  │
│  └───────────────────────┘   └────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Pay [PRICE] by [DEADLINE]                                            │  │
│  │ [Pay with GCash / Maya / Bank]     [View payment instructions]       │  │
│  │ Proof is reviewed by club staff. Uploading a receipt does not mark   │  │
│  │ the booking as paid.                                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  [Upload payment proof]        [Add to calendar] {if approved}            │
│  [Directions]                  [Cancel booking] {if policy permits}       │
│                                                                           │
│  Cancellation: [CUTOFF] · Full policy [link]                              │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: status pair stacked; amount and payment CTA above description; sticky
actions not required here because the page is short.

Annotations:

- The success claim matches `D-01`. Do not say “paid”.
- Reference is copyable and readable; use tabular numerals.
- If email is pending, say “Confirmation email will arrive shortly” only after
  Phase 9 exists.
- If the policy auto-expires unpaid bookings, show the deadline and consequence
  from `D-08`; never fabricate it.
- Cancellation and reschedule appear only when policy and role permit.

States: pending approval, confirmed/unpaid, awaiting verification, paid,
cancelled, expired, no-show, past.

---

## 10. P-10 Payment instructions and proof upload

**Route:** `/account/bookings/[reference]/payment`
**Purpose:** let the player pay correctly and submit usable proof without
implying automatic verification.
**Primary action:** Submit proof for verification.

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Booking HP-[REF]                                      Payment: Unpaid   │
├───────────────────────────────────────────────────────────────────────────┤
│  Pay [PRICE] by [DEADLINE]                                                │
│  Booking: Thu 29 Oct · 6:00–7:00 PM · Court 1                             │
│                                                                           │
│  ┌── 1. Send payment ─────────────┐  ┌── 2. Submit proof ─────────────┐  │
│  │ ▣ GCash  ○ Maya  ○ Bank        │  │ (Transaction reference)        │  │
│  │                                 │  │                                │  │
│  │ ┌───────────────┐               │  │ ┌────────────────────────────┐ │  │
│  │ │               │               │  │ │  Drop/select receipt image │ │  │
│  │ │  OFFICIAL QR  │               │  │ │  PNG/JPG · max 5 MB        │ │  │
│  │ │  (unmodified) │               │  │ └────────────────────────────┘ │  │
│  │ └───────────────┘               │  │ Preview · Replace · Remove     │  │
│  │                                 │  │ Compression status / warning   │  │
│  │ Account: [ACCOUNT NAME]         │  │                                │  │
│  │ Amount:  [PRICE]                │  │ ☐ I confirm the amount and     │  │
│  │ Ref:     HP-[REF]      [Copy]   │  │   reference are correct        │  │
│  │                                 │  │                                │  │
│  │ ⓘ Do not share passwords, PINs, │  │ [Submit for verification]      │  │
│  │   or OTPs.                      │  │                                │  │
│  └─────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                           │
│  Submitted proof is not payment. Staff verify the incoming transaction.   │
│  [Back to booking]                                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ ← HP-[REF]        Unpaid     │
├──────────────────────────────┤
│ Pay [PRICE] by [DEADLINE]    │
│ Thu 29 Oct · 6–7 PM          │
│                              │
│ ▣ GCash  ○ Maya  ○ Bank      │
│                              │
│ ┌──────────────────────────┐ │
│ │      OFFICIAL QR         │ │
│ └──────────────────────────┘ │
│ Account: [NAME]              │
│ Amount: [PRICE]   [Copy]     │
│ Ref: HP-[REF]     [Copy]     │
│                              │
│ 1. Transfer in your app      │
│ 2. Screenshot the receipt    │
│ 3. Upload it below           │
│                              │
│ (Transaction reference)      │
│ [Choose receipt image]       │
│ Preview / replace / remove   │
│ ☐ Confirm details            │
│ [Submit for verification]    │
│                              │
│ ⓘ Not paid until staff       │
│   verify the transaction.    │
└──────────────────────────────┘
```

Annotations:

- Never alter, recompress, crop, or recolor the official QR source when
  displaying it.
- File limits and compression follow the blueprint (initial 5 MB app limit,
  preview before upload, preserve legibility).
- Upload errors are specific: wrong type, too large, unreadable, duplicate.
- Success replaces the form with “Awaiting staff verification”, submission time,
  and a link back to the booking.
- Rejected proofs show the reason and, if allowed, a resubmission path.

States: no method enabled, deadline passed, uploading, compression failed,
submitted (awaiting), rejected, already paid.

---

## 11. P-11 Account bookings and booking detail

### List — `/account/bookings`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  My bookings                                                              │
│  [Upcoming]  [Past]                                                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Thu 29 Oct · 6:00–7:00 PM · Court 1              HP-[REF]           │  │
│  │ [● Confirmed]  [● Awaiting verification]        [View booking] →    │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ Fri 30 Oct · 6:00–8:00 PM · Open play            HP-[REF]           │  │
│  │ [● Confirmed]  [● Unpaid]                       [View booking] →    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  {Empty: “No upcoming bookings yet.” [Book a court]}                      │
└───────────────────────────────────────────────────────────────────────────┘
```

### Detail — `/account/bookings/[reference]`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← All bookings                                          [Copy reference]   │
│                                                                           │
│  Court 1 · Thu 29 Oct 2026 · 6:00–7:00 PM                                 │
│  Booking ● Confirmed        Payment ● Awaiting verification               │
│  Amount due [PRICE] · Submitted 27 Oct, 7:42 PM                           │
│                                                                           │
│  ┌── Payment history ──────────────────────────────────────────────────┐  │
│  │ 27 Oct 2026 · Proof submitted · GCash · Ref [XXXX]                  │  │
│  │ 27 Oct 2026 · Awaiting staff verification                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  [View payment proof status]   [Cancel booking] {if permitted}            │
│  [Directions]                                                             │
│                                                                           │
│  Policy summary · [CUTOFF] · [NO-SHOW] · [link]                           │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: list becomes stacked cards; detail single column with status pair near
the top and actions in a clear order.

States: no bookings, loading, error, cancelled, no-show, paid, rejected proof,
past, expired session.

---

## 12. P-12 Authentication

### Sign in — `/sign-in`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                              [LOGO]                                       │
│                                                                           │
│                      Sign in                                              │
│                      Book and manage your court time.                     │
│                                                                           │
│                      (Email)                                              │
│                      (Password)              [Show]                       │
│                                                                           │
│                      [Sign in]                                            │
│                                                                           │
│                      Forgot password?                                     │
│                      New here? Create an account                          │
│                                                                           │
│                      {Staff: sign in here and continue to staff area}     │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: full-width fields and buttons; no card inside a card; visible labels.

States: invalid credentials, unverified email, locked/rate-limited, network
error, pending, success redirect. Do not reveal whether an email exists on
recovery.

### Sign up

Name, email, password (with guidance), contact fields per `D-11`, terms/privacy
links, verification notice. No marketing consent pre-checked.

---

## 13. P-13 Location and contact

**Route:** `/visit`

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  Visit                                                                    │
│                                                                           │
│  [ADDRESS LINE 1]                        ◻ MAP (lazy-loaded)              │
│  [ADDRESS LINE 2]                        ● Club marker                    │
│  [HOURS: day-by-day]                     [Get directions]                 │
│  [PHONE] [EMAIL]                                                          │
│  [SOCIAL LINKS if approved]                                               │
│                                                                           │
│  Arrival notes {only if confirmed}                                        │
│  Parking / access {only if confirmed}                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: address and hours first, then map, then directions. Map failure leaves
the text information and a static fallback link.

States: map loading, map error, coordinates missing (no fake pin), closed today.

---

## 14. P-14 Club, rules, FAQ, policies

Template:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  Club rules                                            Last updated [DATE]│
│                                                                           │
│  On this page            Rules                                            │
│  • Arrival               [PLAIN-LANGUAGE RULE]                            │
│  • Court use             [PLAIN-LANGUAGE RULE]                            │
│  • Payment               [PLAIN-LANGUAGE RULE]                            │
│  • Cancellation          [LINK TO POLICY]                                 │
│                                                                           │
│  Booking terms are shown again at checkout.                               │
└───────────────────────────────────────────────────────────────────────────┘
```

FAQ uses real questions; answers link to policies. Desktop may use a sticky
contents list; mobile uses headings and a compact “On this page” disclosure.
Accordions are optional, not required, and must expose content to search and
screen readers.

States: content pending approval; policy effective date missing; broken link
audit before launch.

---

## 15. P-15 Staff dashboard

**Route:** `/staff`

```text
┌───────────────┬───────────────────────────────────────────────────────────┐
│ STAFF NAV     │ Tue 27 Oct 2026                    [Search]      [Role ▾]  │
│               ├───────────────────────────────────────────────────────────┤
│ Dashboard     │ Needs attention                                           │
│ Calendar      │ ┌──────────────────┬──────────────────┬────────────────┐ │
│ Payments (3)  │ │ 3 awaiting proof │ 2 unpaid today   │ 1 pending      │ │
│ Open Play     │ │ [Review]         │ [View]           │ [View]         │ │
│ Courts        │ └──────────────────┴──────────────────┴────────────────┘ │
│ Customers     │                                                           │
│ Reports       │ Today                                                     │
│ Audit         │ 6:00 PM  Court 1  Sample A   Confirmed  Unpaid   [Check in]│
│ Settings      │ 6:00 PM  Court 2  Sample B   Confirmed  Paid     [Checked] │
│               │ 6:00 PM  Open play · 8/12 · 5 checked in        [Manage]   │
│               │                                                           │
│               │ Quick actions: [Create booking] [Record payment]           │
│               │                [Block court]                              │
└───────────────┴───────────────────────────────────────────────────────────┘
```

Mobile: today first, then needs-attention; quick actions as a short menu; no
wide tables.

Annotations:

- Counts reflect real data only; zero states read “Nothing awaiting review”.
- “Pending” in the attention area must specify what it is (approval vs proof).
- No revenue charts above operational content.

States: empty day, loading, permission denied, data refresh error with retry.

---

## 16. P-16 Staff calendar

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Calendar        [Day] [Week]   ‹ Tue 27 Oct ›   [Today]   [Filters ▾]    │
├──────────┬──────────────┬──────────────┬──────────────┬──────────────────┤
│ Time     │ Court 1      │ Court 2      │ Court 3      │ Open play        │
├──────────┼──────────────┼──────────────┼──────────────┼──────────────────┤
│ 6:00 PM  │ [Confirmed]  │ [Confirmed]  │ [Closure]    │ [8/12 · Open]    │
│          │ Sample A     │ Sample B     │ Maintenance  │ Intermediate     │
│ 7:00 PM  │ [Unpaid]     │ [Awaiting]   │ [Closure]    │                  │
│          │ Sample C     │ Sample D     │              │                  │
│ 8:00 PM  │              │ [No-show]    │              │                  │
└──────────┴──────────────┴──────────────┴──────────────┴──────────────────┘
← status is always text, not color alone →
```

Selecting an entry opens a side panel:

```text
┌──────────────────────────────┐
│ Booking HP-[REF]         [×] │
│ Sample Player                │
│ Court 1 · 6:00–7:00 PM       │
│ [● Confirmed] [● Unpaid]     │
│ [Check in] [Record payment]  │
│ [View full booking] →        │
└──────────────────────────────┘
```

Mobile agenda:

```text
┌──────────────────────────────┐
│ Calendar       [Day ▾] [☰]   │
│ ‹ Tue 27 Oct ›               │
├──────────────────────────────┤
│ 6:00 PM · Court 1            │
│ Sample A · Confirmed · Unpaid│
│ [Check in]                   │
│ ──────────────────────────   │
│ 6:00 PM · Open play          │
│ 8/12 · 5 checked in          │
│ [Manage session]             │
└──────────────────────────────┘
```

States: no bookings, closures, filters empty, load error.

---

## 17. P-17 Staff booking detail

**Route:** `/staff/bookings/[id]`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Calendar    Booking HP-[REF]                          [More actions ▾]  │
├───────────────────────────────────────────────────────────────────────────┤
│  Booking                          Payment                                 │
│  ● Confirmed                      ● Awaiting verification                │
│                                                                           │
│  Service       Court 1 · 60 min                                           │
│  Date/time     Thu 29 Oct 2026 · 6:00–7:00 PM · Asia/Manila               │
│  Amount        [PRICE]                                                    │
│  Player        Sample Player · [EMAIL] · [PHONE]                          │
│  Notes         [PLAYER NOTES]                                             │
│  Source        Player booking / Walk-in                                   │
│                                                                           │
│  Payment history                                                          │
│  Proof submitted 27 Oct 7:42 PM · [Open proof]                            │
│  [Review payment]                                                         │
│                                                                           │
│  Actions                                                                  │
│  [Check in]  [Record payment]  [Complete]  [No-show]                      │
│  [Cancel]    [Reschedule]      [Edit note]                                │
│                                                                           │
│  Audit                                                                    │
│  Actor · action · time · reason                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

Annotations:

- Actions are filtered by role and booking state; sensitive actions require a
  confirmation and, where required, a reason.
- “Record payment” opens a small form: method, amount, time, reference, note,
  and a confirmation that the money was actually received.
- Reschedule and cancel show affected policy and any refund consequence.
- Proof opens in a private viewer; link is not public or guessable.

States: pending approval, paid, rejected, cancelled, no-show, completed.

---

## 18. P-18 Staff payment verification

**Route:** `/staff/payments`

Desktop:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Payments     [Awaiting verification (3)] [Paid] [Rejected] [Refunds]      │
├───────────────────────────────┬───────────────────────────────────────────┤
│ HP-[REF] · Sample A           │ Booking HP-[REF]                          │
│ [PRICE] · GCash · 7:42 PM     │ Court 1 · Thu 29 Oct · 6:00–7:00 PM       │
│ HP-[REF] · Sample B           │ Player: Sample A                          │
│ [PRICE] · Maya · 7:50 PM      │ Amount due: [PRICE]                       │
│                               │ Method: GCash · Ref: [XXXX]               │
│                               │ Submitted: 27 Oct 7:42 PM                  │
│                               │                                           │
│                               │ ┌───────────────────────────────────────┐ │
│                               │ │           PROOF IMAGE                 │ │
│                               │ │           (private)                   │ │
│                               │ └───────────────────────────────────────┘ │
│                               │                                           │
│                               │ ⚠ Verify the incoming transfer in the     │
│                               │   receiving account before approving.    │
│                               │                                           │
│                               │ [Approve payment]   [Reject with reason]  │
└───────────────────────────────┴───────────────────────────────────────────┘
```

Mobile: queue and detail are separate screens; proof opens full-screen; review
actions remain reachable after closing the image.

Approve dialog:

```text
┌───────────────────────────────────────────────┐
│ Mark this payment as PAID?                    │
│ HP-[REF] · [PRICE] · GCash                    │
│ Confirm you verified the actual incoming       │
│ transfer in the club account.                 │
│ [Cancel]                 [Yes, record payment]│
└───────────────────────────────────────────────┘
```

Reject dialog: reason required (approved reason list + note), player-safe
wording, explicit “do not change to paid”.

States: empty queue, already reviewed by another staff member, proof unreadable,
network error, insufficient permission.

---

## 19. P-19 Staff open-play session

**Route:** `/staff/open-play/[sessionId]`

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Open play      Thu 29 Oct · 6:00–8:00 PM · Intermediate                 │
│ Capacity 8/12 · [PRICE]                    [Cancel session] {gated}       │
├───────────────────────────────────────────────────────────────────────────┤
│ Player            Booking        Payment          Check-in                │
│ Sample A          Confirmed      Paid             [✓ Checked in 5:58 PM] │
│ Sample B          Confirmed      Unpaid           [Check in]              │
│ Sample C          Confirmed      Awaiting proof   [Check in]              │
│ …                                                                         │
│                                                                           │
│ [Add walk-in] {only if approved}      [Mark no-show] {per row}            │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile: roster cards with name, payment status, check-in action. Capacity and
session status stay visible.

States: full, cancelled, no registrations, waitlist absent unless approved.

---

## 20. P-20 Staff courts, reports, audit, settings (structure)

```text
COURTS
  List of courts · hours · closures
  [Add court] [Edit hours] [Block time]
  Conflict warning before saving; affected bookings listed.

REPORTS
  Date range · Bookings · Occupancy · Open play attendance
  Collected · Outstanding · Cancellations · No-shows
  {Export CSV only if approved (D-21)}

AUDIT
  Filters: actor · action · date · target
  Rows: who · what · when · before → after · reason
  Read-only.

SETTINGS
  Club details · hours · prices · booking window · cancellation rules
  Staff roles/permissions · payment settings
  Manager/admin only; changes audited.
```

No coaching settings or DUPR screens exist.

---

## 21. State pattern gallery

```text
LOADING
┌──────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓░░░░░░              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓                 │
└──────────────────────────────┘
Skeleton matches final dimensions; no layout shift.

EMPTY
┌──────────────────────────────┐
│ No bookings yet              │
│ Your court time will appear  │
│ here after you book.         │
│ [Book a court]               │
└──────────────────────────────┘

ERROR (recoverable)
┌──────────────────────────────┐
│ We couldn’t load availability│
│ Check your connection and    │
│ try again. Your selections   │
│ are still here.              │
│ [Try again]                  │
└──────────────────────────────┘

SUCCESS
┌──────────────────────────────┐
│ Proof submitted              │
│ Awaiting staff verification. │
│ Submitted 27 Oct, 7:42 PM.   │
│ [View booking]               │
└──────────────────────────────┘

DISABLED / UNAVAILABLE
┌──────────────────────────────┐
│ 9:00 AM — Booked             │
│ 10:00 AM — Closed            │
│ 11:00 AM — Past              │
└──────────────────────────────┘
```

Rules: status text is present, recovery is offered, and no state relies on
color alone.

---

## 22. Open questions visible in these wireframes

| Marker | Question | Document |
| --- | --- | --- |
| `D-01` | Instant confirmation or staff approval? | `CLIENT_DECISIONS.md` |
| `D-02` | Guest booking or account required, and at which step? | `CLIENT_DECISIONS.md` |
| `D-07` | Which payment methods are live? | `CLIENT_DECISIONS.md` |
| `D-08` | Payment deadline and unpaid-booking consequence? | `CLIENT_DECISIONS.md` |
| `D-09` | Open-play payment method? | `CLIENT_DECISIONS.md` |
| `D-11` | Which player fields are required? | `CLIENT_DECISIONS.md` |
| `D-13` | Can players self-cancel or reschedule? | `CLIENT_DECISIONS.md` |
| `D-14` | Staff roles and permissions? | `CLIENT_DECISIONS.md` |

Labels, page names, and structure require client confirmation before Phase 3.

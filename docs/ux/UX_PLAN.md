# Phase 2 — UX Plan, Information Architecture, and Journeys

**Version:** 1.0
**Date:** 27 October 2026
**Status:** Client-approved as drafted, 27 October 2026. Open business decisions remain deferred.
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md`, Phase 2 (lines 563–644) and the v2.5 MVP scope gate.
**Companion documents:** `docs/ux/WIREFRAMES.md`, `docs/ux/CLIENT_DECISIONS.md`, `docs/ux/CLIENT_QUESTIONNAIRE.md`, `docs/DESIGN_BRIEF.md`.

---

## 0. How to use this document

This is the experience blueprint for Phases 3–12. It defines what each screen
must accomplish, how the flows connect, and what states must exist. It does
**not** claim that any planned screen or interaction is built.

Conventions used throughout:

| Marker | Meaning |
| --- | --- |
| `[PRICE]`, `[DURATION]`, `[CUTOFF]` | Club-confirmed value not yet supplied. Never invent. |
| `[ASSET]` | Approved logo, photo, QR, or map asset not yet supplied. |
| `D-xx` | Open client decision, tracked in `docs/ux/CLIENT_DECISIONS.md`. |
| **P1**, **P5**, **P7** | Phase in which the behavior is expected to be implemented. |

Decisions marked **blocking** must be answered before the relevant phase can
be finalized. Low-risk working assumptions are listed in §13.

---

## 1. Scope and constraints

### 1.1 In scope for the MVP experience

- Public club site: home, courts, normal open play, location/contact, club
  rules, FAQ, policies.
- Court reservation journey from discovery to confirmation.
- Normal open-play discovery and registration.
- Player account surfaces only as far as the confirmed booking model requires.
- Booking detail, payment instructions, proof submission, and status history.
- Staff operations: dashboard, calendar, booking detail, court/open-play
  management, payment verification, reports, audit, settings.
- Manual QR payments with staff verification. No payment API, no automatic
  “paid” state.
- OpenFreeMap location section with the address available as text.

### 1.2 Out of scope (deferred)

- Coaching/appointment pages, navigation, data, or booking flows.
- DUPR-enabled sessions, identity linking, match submission, or ratings.
- Waitlists unless separately approved.
- Marketing automation, memberships, promo codes, tournaments, gift cards.
- Dark mode, multi-language, native apps.

### 1.3 Non-negotiables that shape the UX

1. Availability is revalidated by the server at booking creation. The UI must
   handle “slot taken while you were deciding” gracefully.
2. Uploading proof never means “paid”. Only staff verification does.
3. Booking status and payment status are always shown separately.
4. Price, duration, payment method, and applicable rules are visible before the
   player commits.
5. No invented prices, hours, capacities, policies, addresses, or social proof.
6. Account creation is not forced before availability is visible unless the
   client requires it (`D-02`).
7. The experience must work at 390px width, on touch, and with keyboard.
8. The club timezone is assumed `Asia/Manila` pending confirmation (`D-25`).

---

## 2. Audiences and jobs to be done

| Audience | Context | Primary job | Design implication |
| --- | --- | --- | --- |
| First-time visitor | Mobile, may arrive from social/maps | “Can I play here, when, and how much?” | Prices, hours, and a single obvious booking action near the top; plain-language rules. |
| Returning player | Knows the club, often on phone | “Book my usual slot in under a minute.” | Persistent sign-in, upcoming booking surfaced, minimal re-entry, availability first. |
| Guest payer | May book for a group | “Who is playing and who pays?” | Clear payer vs player fields once `D-11` is answered. |
| Staff on shift | Busy front desk or phone | “What is happening today and what needs action?” | Dense but scannable schedule, exceptions surfaced, one-tap check-in/payment. |
| Manager/admin | Periodic review | “Did we collect everything, and who changed what?” | Reconciliation, reports, audit trail, permission boundaries. |
| Player with accessibility needs | Keyboard, screen reader, zoom, reduced motion | Complete booking independently | Semantic structure, focus management, visible labels, text statuses, no color-only meaning. |

---

## 3. Information architecture

### 3.1 Sitemap

```text
PUBLIC
/                                   Home — identity, services, next action
/book                               Service chooser (court / open play)
/book/court                         Court reservation — date and time
/book/court/details                 Court reservation — details and review
/book/open-play/[sessionId]         Open-play registration
/courts                             Court index
/courts/[slug]                      Court detail
/open-play                          Open-play session index
/open-play/[slug]                   Open-play session detail
/visit                              Location, hours, contact, map
/club                               About the club
/club/rules                         Court and club rules
/club/faq                           FAQ
/policies/[slug]                    Booking/cancellation, payments, privacy, terms

AUTH
/sign-in                            Player and staff sign-in
/sign-up                            Player registration
/forgot-password                    Request reset
/reset-password                     Complete reset
/verify-email                       Verification landing

PLAYER (signed in)
/account                            Overview: next booking, alerts
/account/bookings                   Upcoming / past list
/account/bookings/[reference]       Booking detail
/account/bookings/[reference]/payment   Instructions + proof submission
/account/profile                    Name, contact, password

STAFF / ADMIN (role-gated)
/staff                              Today’s operations dashboard
/staff/calendar                     Day/week calendar and list
/staff/bookings/[id]                Booking detail and actions
/staff/payments                     Verification queue and reconciliation
/staff/open-play                    Sessions and capacity
/staff/open-play/[sessionId]        Roster, check-in, attendance
/staff/courts                       Courts, hours, closures, blocks
/staff/customers                    Customer search and detail
/staff/reports                      Bookings, occupancy, collections
/staff/audit                        Action history
/staff/settings                     Prices, rules, hours, roles

SYSTEM
/not-found, /unauthorized, /error states (implemented at the appropriate phase)
```

Notes:

- Booking references are shown in URLs only where access is authorized; never
  rely on an unguessable URL alone for private data.
- `/book/open-play/[sessionId]` is the confirmation/registration step reached
  from the session detail page.
- Coaching and DUPR routes are intentionally absent. See §14 for the blueprint
  conflict and the reserved extension points.

### 3.2 Navigation model

**Public header (desktop):** logo → Book → Courts → Open Play → Visit → Club.
Right side: account control (Sign in / Account) and one primary button,
**Book a court**.

**Public header (mobile):** logo, compact **Book** button, menu button. The menu
sheet contains the full public navigation, account access, contact number, and
hours. No hover-only navigation.

**Footer:** concise contact block, hours, address (once approved), quick links
(Book, Courts, Open Play, Policies, FAQ), social links only if supplied, and a
small “Payments are verified manually” trust note.

**Account area:** secondary navigation with Overview, Bookings, Profile, and a
“Back to site” link. On mobile these become a horizontal tab row or menu.

**Booking wizard:** reduced header (logo, step indicator, “Exit booking”).
Progress labels: **Date & time → Details & review → Confirmation**. The payment
proof step lives after confirmation, on the booking detail page, because the
booking exists before payment is submitted.

**Booking steps are routes, not hidden tabs:** `/book/court` and
`/book/court/details` are separate URLs so refresh, back, and browser history
behave predictably. Refresh during review must not create a duplicate booking;
the confirmation result is shown only after a successful server action.

**Staff area:** dedicated operations shell, visually distinct from the public
site. Desktop sidebar: Dashboard, Calendar, Payments, Open Play, Courts,
Customers, Reports, Audit, Settings. Top bar: date, global search, signed-in
role, sign out. On mobile: a compact top bar plus an expandable menu; priority
goes to today’s schedule and search.

### 3.3 Access rules

| Area | Anonymous | Player | Staff | Manager/Admin |
| --- | --- | --- | --- | --- |
| Public pages, availability preview | Yes | Yes | Yes | Yes |
| Create booking | Per `D-02` | Yes | Yes (walk-in) | Yes |
| Own booking + payment proof | No | Own only | Assigned/needed | Yes |
| Staff dashboard/calendar | No | No | Yes | Yes |
| Payment verification | No | No | If granted | Yes |
| Prices/settings/roles | No | No | No | Yes |
| Audit view | No | No | Read if granted | Yes |

Final role names and permissions are pending `D-14`.

### 3.4 Extension points for deferred features

- `/book` is designed as a service chooser with room for additional services;
  no empty “coming soon” cards are shown.
- Staff navigation can accept a Coaching section later without restructuring.
- Account navigation can accept DUPR linkage later.
- No placeholder pages, tables, or links are created for either feature now.

---

## 4. Booking and payment state model

### 4.1 Separate statuses

**Booking status:** `PENDING` (only if approval/hold is used), `CONFIRMED`,
`CANCELLED`, `COMPLETED`, `NO_SHOW`.

**Payment status:** `UNPAID`, `AWAITING_PROOF`, `AWAITING_VERIFICATION`, `PAID`,
`REJECTED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`.

**User-facing labels**

| Internal | Player-facing label | Staff-facing label |
| --- | --- | --- |
| `PENDING` | Awaiting club approval | Pending approval |
| `CONFIRMED` | Confirmed | Confirmed |
| `CANCELLED` | Cancelled | Cancelled |
| `COMPLETED` | Completed | Completed |
| `NO_SHOW` | No-show | No-show |
| `UNPAID` | Awaiting payment | Unpaid |
| `AWAITING_PROOF` | Awaiting payment | Awaiting proof |
| `AWAITING_VERIFICATION` | Awaiting staff verification | Awaiting verification |
| `PAID` | Paid | Paid |
| `REJECTED` | Proof rejected | Rejected |
| `REFUND_PENDING` | Refund pending | Refund pending |
| `PARTIALLY_REFUNDED` | Partially refunded | Partially refunded |
| `REFUNDED` | Refunded | Refunded |

`AWAITING_PROOF` is listed as an example in the blueprint but is not defined
there. It must not become a second player-facing “unpaid” state without a clear
data-model decision; if used, label it “Awaiting payment” as above.

Rules:

- A booking may be `CONFIRMED` while payment is `UNPAID` or
  `AWAITING_VERIFICATION`, depending on the approved policy (`D-01`, `D-08`).
- Status is always text plus color/icon. Never color alone.
- “Awaiting verification” must never be abbreviated to “pending payment” or
  visually confused with “paid”.
- Screenshot upload transitions to `AWAITING_VERIFICATION`, never `PAID`.

### 4.2 Where statuses appear

| Surface | Booking status | Payment status | Amount due | Deadline |
| --- | --- | --- | --- | --- |
| Confirmation | Yes | Yes | Yes | Yes |
| Account list | Yes | Yes | Optional | No |
| Booking detail | Yes | Yes | Yes | Yes |
| Payment screen | Yes | Yes | Yes | Yes |
| Staff list/calendar | Yes | Yes | Yes | Due state only |
| Staff booking detail | Yes | Yes | Yes | Yes |
| Payment verification | Yes | Yes | Yes | Submitted timestamp |

### 4.3 Cross-cutting booking rules

- The browser may show availability, but the server creates the booking.
- The UI must state that the slot is not guaranteed until confirmation.
- Double-submit protection is visible: the primary button enters a loading
  state immediately and cannot be submitted again.
- Preserve user input through recoverable errors (network, transient server
  error). On a slot conflict, preserve the date and filters, clear only the
  lost slot, and ask the player to choose another.
- Price, duration, court, date/time, payment method, and policy links must be
  visible together before confirmation.
- No client-side “hold” countdown exists unless the client approves a hold
  policy (`D-08`).

---

## 5. Core player journeys

**Primary flow at a glance**

```text
Home / social / directions
        │
        ├──► Open play list ──► Session detail ──► Registration
        │                                              │
        │                                              ▼
        │                                   Confirmation (payment per D-09)
        │
        ▼
     /book
        │
        ▼
 Court date + time ──► Details & review ──► [account gate D-02]
        │                     │
        │                     └──► slot conflict → re-pick
        ▼
   Confirmation (booking + payment shown separately)
        │
        ├──► Payment instructions ──► Proof submitted
        │                                   │
        │                                   ▼
        │                          Awaiting staff verification
        │                                   │
        │                     ┌─────────────┴────────────┐
        │                     ▼                          ▼
        │                 Verified → PAID          Rejected → retry/contact
        ▼
 Account bookings → detail → cancel/reschedule (if policy permits)
```

### J1 — First-time visitor books a court

**Goal:** from landing page to a confirmed booking with an honest payment state.

1. Visitor lands on `/` on mobile. First viewport shows club identity, the
   booking action, and enough price/expectation context.
2. “Book a court” → `/book` chooser. Court reservation and open play are the
   only MVP options.
3. Court reservation shows price basis, duration options, court summary, and
   booking rules before personal details.
4. `/book/court`: choose date and duration. Only valid slots are shown. Closed
   days, past dates, and times outside operating hours are visibly disabled
   with a reason.
5. Player selects a slot. A summary shows court, date, start/end, duration,
   `[PRICE]`, buffer note, and next step.
6. Review step shows the full price, payment method, cancellation cutoff,
   no-show rule, and payment timing. Links open policies in a new context
   without losing the selection where practical.
7. Account gate per `D-02`. If sign-in is required, the chosen slot and step are
   preserved through authentication.
8. Submit → server revalidates availability and creates the booking.
9. Confirmation shows reference, **booking confirmed or pending** per `D-01`,
   payment status `UNPAID`, amount, deadline, and the next action.
10. Player chooses a payment method, sees the official QR unchanged, completes
    the transfer in their own app, and submits proof.
11. Payment becomes `AWAITING_VERIFICATION`. The copy explicitly says staff must
    verify the incoming transfer.
12. Staff verifies; the player sees `PAID` and any recorded reference. Rejection
    shows a neutral reason and a retry path if allowed.

**Failure branches**

| Event | Required UX |
| --- | --- |
| Slot taken before submit | Inline alert on the slot area, lost slot marked unavailable, other options remain, no duplicate booking. |
| Duplicate submit / retry | One booking only; the confirmation replaces the form. |
| Network failure | Keep inputs, show retry, do not imply success. |
| Session expired while signed in | Explain, allow re-authentication, restore the step. |
| Payment deadline passes | Show the approved consequence (`D-08`) and contact path; never silently cancel without policy. |
| Proof unreadable or mismatched | Keep booking reserved per policy; ask for a clearer file or wait for staff clarification. |
| Proof rejected | Show safe reason, allow resubmission only if policy permits, keep payment unpaid. |

### J2 — Returning player books quickly

1. Signed-in player opens `/` or `/account`.
2. Upcoming booking and a primary “Book a court” action are immediately visible.
3. If the client approves “book again”, it pre-fills service and court but
   always revalidates the date/time. It never reuses a stale price silently.
4. Account details are pre-filled. The player confirms and submits.
5. Booking detail remains the single place to see status, pay, cancel, or get
   directions.

**Success measure:** a signed-in player reaches an available slot in one
primary action plus date/time selection.

### J3 — Player joins normal open play

1. `/open-play` lists sessions with date, time, `[PRICE]`, skill level, capacity
   remaining, and status (Open / Full / Cancelled).
2. Session detail states what to bring, rules, cancellation terms, and payment
   expectations before registration.
3. Registration requires an account per `D-02`; capacity is revalidated on the
   server.
4. Confirmation shows session details, reference, payment status/method
   (`D-09`), and check-in guidance.
5. Full sessions show **Full** with no waitlist unless approved later.
6. Staff can see the roster, check players in, and mark attendance/no-shows.

**Failure branches:** session fills during registration; session cancelled by
staff; account required; payment not yet collected.

### J4 — Player reviews, cancels, or reschedules

1. `/account/bookings` groups Upcoming and Past with status badges.
2. Booking detail explains what cancellation will do **before** the action:
   refund/credit implications, cutoff, and whether staff approval is required.
3. Allowed actions are shown; disallowed actions are hidden or disabled with a
   plain reason, not a dead control.
4. Cancellation requires deliberate confirmation. Reschedule selects a new slot
   and revalidates availability atomically.
5. Original and new details remain in history. Refund states are recorded by
   staff only where policy applies.

If self-service cancellation is not approved (`D-13`), the detail page shows
“Contact the club to cancel” with the approved contact channel.

### J5 — Player submits payment proof later

1. Booking detail shows an “Awaiting payment” card with amount, deadline, chosen
   method, and a clear **Pay / submit proof** action.
2. Payment page shows instructions, the official QR image (never recompressed
   or cropped), account name, exact amount, copyable reference, and safety note
   (no passwords, PINs, or OTPs).
3. Upload flow: choose image → compression/preview → replace/remove → submit.
4. Validation covers type, size (`5 MB` initial app limit, per blueprint),
   ownership, and booking status.
5. Success state: “Proof submitted — awaiting staff verification,” with the
   submitted time. Not “paid”.
6. The action remains available to view history; duplicate submissions are
   prevented or clearly superseded per server rules.

### J6 — Visitor checks location and policies

1. `/visit` leads with the address, hours, and contact details as text, then the
   map and a directions action.
2. The map is lazy-loaded and must not be the only way to find the club.
3. `/club/faq` answers booking, payment, cancellation, and arrival questions
   with links to the authoritative policy pages.
4. Policy pages show the effective date and match the rules the software
   enforces; unreconciled copy is flagged for client review.

### J7 — Account recovery

Forgot password → email request (neutral confirmation regardless of account
existence) → reset link → new password → sign in. Expired/invalid tokens show a
clear recovery path. No account existence leakage.

---

## 6. Staff journeys

### S1 — Start of shift dashboard

The dashboard answers four questions without scrolling on a laptop:

1. What is happening today?
2. What needs action right now?
3. What is unpaid or awaiting verification?
4. What is an exception (pending approval, nearing capacity, no-show, closure)?

Layout priority: date + role, needs-attention queue, today’s schedule, quick
actions, then secondary links. No decorative charts above operational content.

### S2 — Check in a player and record payment

1. Find the booking by calendar, search, or reference.
2. Confirm customer, service, court/session, and time.
3. Check in.
4. Record payment only when money was actually collected: method, amount,
   time, staff member, optional reference.
5. Confirm the action; booking/payment statuses update; audit event recorded.
6. Undo/correction path is role-gated and audited, never a silent edit.

### S3 — Verify a QR payment proof

1. Open `/staff/payments` queue; filter by awaiting verification, paid, rejected,
   refunds.
2. Open a submission: booking reference, player, service, date/time, amount due,
   method, transaction reference, submitted time, and private proof preview.
3. Staff independently checks the receiving account. The UI repeats this rule
   and never auto-approves.
4. Approve requires a deliberate confirmation and records reviewer, time,
   method, amount, reference, and note.
5. Reject requires a reason from an approved set or free text; the player sees a
   safe message.
6. Duplicate review actions are prevented; the final state and audit entry are
   visible.

### S4 — Create a walk-in booking

Staff chooses service, date/time, customer details, and payment at club. The
server validates availability exactly as it does for players. The created
booking records the staff member and source (`walk-in`) for audit.

### S5 — Block a court or close a session

1. Select court(s), date range, and reason (maintenance, private event, etc.).
2. The UI shows any affected bookings before saving.
3. Saving requires confirmation and is audited. If affected bookings exist, the
   approved handling (notify, move, refund) is shown as a task, not silently
   applied.
4. Blocked times appear as unavailable to players with a neutral reason when
   appropriate.

### S6 — Run an open-play session

Roster shows registrations, payment state, check-in state, and capacity. Staff
can check in players, mark no-shows, and add walk-ins only if policy allows.
Cancelling a session follows the approved player-communication process.

### S7 — End-of-day reconciliation

`/staff/payments` and `/staff/reports` show collected today, outstanding
bookings, awaiting verification, rejected proofs, cancellations, no-shows, and
any refunds. Export is deferred unless approved (`D-21`).

### S8 — Permissions

Every sensitive action is checked server-side and reflected in the UI:

- Staff cannot change prices, roles, or audit history without permission.
- Players can never see another player’s booking or proof.
- Administrative role assignment is manager/admin only.
- Overrides require a reason and produce an audit entry.

---

## 7. Screen-by-screen requirements

Layouts are in `docs/ux/WIREFRAMES.md`. This section defines purpose, content,
actions, and states.

### 7.0 Content hierarchy rules

- Each page has one purpose and one visually dominant action. Secondary actions
  never compete with booking or payment verification.
- Public pages lead with what the club is, where it is, what it costs, and how to
  act. Supporting story and FAQs follow.
- Booking screens lead with the current choice, then the commitment summary
  (court, date/time, duration, price), then rules, then personal details.
- Payment screens lead with amount, deadline, method, and instructions before
  the upload form. The “not yet paid” status stays visible.
- Staff screens lead with today’s exceptions and actions, then schedules, then
  historical reporting.
- On transactional screens, critical price, rule, and status information is never
  placed only in a tooltip, accordion, modal, or image. Progressive disclosure is
  reserved for secondary detail.

### 7.1 Public

| Screen | Primary action | Must contain | Key states |
| --- | --- | --- | --- |
| Home | Book a court | Club identity, approved hero, two MVP services, price/expectation guidance, location preview, FAQ/contact, footer | Placeholder assets labeled; no fake sessions/testimonials |
| Book chooser | Choose court reservation | Two service options with `[PRICE]`, `[DURATION]`, rules summary, pay-later explanation | No unavailable services shown; no coaching/DUPR cards |
| Courts index | View court | Court name/number, approved photo, summary, `[PRICE]`, booking CTA | Missing photo placeholder; no unconfirmed facility claims |
| Court detail | Book this court | Facilities confirmed by client, hours, price, rules, next available times, availability entry | Closed/maintenance states |
| Open play index | View session | Date, time, skill, `[PRICE]`, capacity, status, filters | Empty, full, cancelled, loading |
| Open play detail | Register | Schedule, capacity, rules, what to bring, payment basis | Full, cancelled, past, registration closed |
| Visit | Get directions | Address text, hours, contact, map, directions, arrival notes | Map loading/error with text fallback |
| Club/about | Understand the club | Approved story, facilities, community information | Missing content flagged, never invented |
| Rules/FAQ/policies | Resolve a question | Plain-language rules, effective date, related links | Content pending approval |

### 7.2 Booking

| Screen | Primary action | Must contain | Key states |
| --- | --- | --- | --- |
| Availability | Continue with a slot | Date, duration, court filter, valid slots, prices, timezone, legend | Loading, no availability, closed day, conflict, unavailable |
| Details & review | Confirm booking | Summary, price, payment method, rules/cutoff, account step, details, terms, policy links | Validation, auth required, slot lost, submit error, double-submit |
| Confirmation | View booking / pay | Reference, booking status, payment status, amount, deadline, next step | Instant vs approval (`D-01`), payment pending, email pending |
| Payment instructions | Submit proof | QR, amount, reference, account name, deadline, safety copy | Deadline passed, method disabled |
| Proof upload | Submit for verification | File picker, preview, compression status, size/type errors, transaction ref | Invalid file, too large, unreadable, success, duplicate |
| Booking detail | Manage booking | Full details, status pair, payment history, actions, policies | Upcoming, past, cancelled, no-show, rejected proof |
| Account list | Open booking | Upcoming/past tabs, status pair, empty state | Empty, loading, error |
| Profile | Save contact details | Name, email, phone per `D-11`, password entry point | Validation, save success/error |

### 7.3 Staff

| Screen | Primary action | Must contain | Key states |
| --- | --- | --- | --- |
| Dashboard | Act on today’s exceptions | Today’s bookings/sessions, unpaid, awaiting verification, quick actions | Empty day, loading, permission-denied |
| Calendar | Open a booking | Day/week, court columns, open play, status labels, filters | Closures, conflicts, mobile agenda |
| Booking detail | Take the next action | Customer, service, time, price, notes, status pair, payments, audit | Role-gated actions, confirmation |
| Payment queue | Verify or reject | Queue, proof preview, match fields, reasons, audit | Awaiting, paid, rejected, refunds |
| Open play management | Run the session | Sessions, capacity, roster, check-in, attendance | Full, cancelled, walk-in per policy |
| Courts | Manage availability | Courts, hours, closures, blocks | Conflict warning, affected bookings |
| Customers | Find a player | Search, contact, booking history (role-scoped) | Privacy, empty |
| Reports | Review operations | Bookings, occupancy, attendance, collections, cancellations | Date range, empty, export if approved |
| Audit | Investigate changes | Actor, action, target, before/after, timestamp | Read-only, filters |
| Settings | Configure club | Prices, hours, rules, contacts, roles | Permission-gated, confirmation |

---

## 8. Responsive behaviour

Breakpoints follow the Phase 1 tokens: base (mobile-first), `sm` 640, `md` 768,
`lg` 1024, `xl` 1280. Review widths: 390, 768, 1024, 1440.

| Area | Mobile (390) | Tablet (768) | Desktop (≥1024) |
| --- | --- | --- | --- |
| Header | Logo + Book + menu sheet | Logo + CTA + menu | Full inline nav + CTA |
| Home hero | Stacked, image after copy | Stacked, wider media | Two-column editorial |
| Book chooser | Stacked service rows | Two rows | Two-column or editorial rows |
| Availability | Date strip (horizontal), duration chips, court chips, time list | Two columns where space allows | Court/time grid + sticky summary |
| Review | Single column, sticky bottom action bar | Single column, wider summary | Two columns with sticky summary |
| Payment | Instructions first, QR, then upload | Two sections | Instructions/QR left, upload right |
| Account | Tabs, cards | Cards | Table/list + sub-nav |
| Staff calendar | Agenda list by time | List + day summary | Court columns grid + side panel |
| Staff tables | Card rows or horizontal scroll | Table with fewer columns | Full table |
| Footer | Stacked accordion sections | Two columns | Four columns |

Mobile-specific rules:

- Primary action stays reachable: sticky bottom bar for booking steps, with
  `env(safe-area-inset-bottom)` spacing; never covering the last field or terms.
- No hover-only information. All slots and statuses readable without hover.
- Date strip scrolls horizontally but remains keyboard/touch operable; selected
  date is announced.
- Modals become full-screen sheets when content would overflow.
- Time slots are at least 44px tall with visible court/time and status text.
- Long prices, court names, and references wrap or truncate with an accessible
  full value (no clipped critical data).
- Staff can complete check-in and payment review on a phone; proof images can be
  opened full-screen without losing the review form.

---

## 9. State requirements

### 9.1 Global patterns

| State | Behaviour |
| --- | --- |
| Loading | Skeleton blocks matching final layout; no spinner-only blank pages; button-level pending states. |
| Empty | Explain why and offer the next valid action; never a blank panel. |
| Error | Plain-language cause and recovery. Keep safe user input. Provide support path. |
| Success | Confirm exactly what happened and what happens next; do not overclaim. |
| Disabled | Visible reason where it matters (past date, full session, missing permission). |
| Unavailable | Explicit labels (“Full”, “Closed”, “No longer available”), not just grey. |
| Offline/network | Retry affordance; no fake success. |

### 9.2 Required state matrix

| Flow | Loading | Empty | Error | Success | Disabled/unavailable |
| --- | --- | --- | --- | --- | --- |
| Availability | Calendar/slots skeleton | No slots for filters; suggest next date | Fetch failed; retry | Slot selected | Past/closed/full slots labeled |
| Review/submit | Submit pending | — | Validation, slot lost, server/network | Booking created | Submit disabled until valid |
| Payment | Instructions loading | No payment method enabled | Upload/validation failure | Proof awaiting verification | Deadline passed, method unavailable |
| Account | List skeleton | No bookings yet | Load failure | Profile saved | Actions disallowed by policy |
| Open play | Session skeleton | No sessions scheduled | Load failure | Registration confirmed | Full/cancelled/past |
| Staff queue | Queue skeleton | Nothing awaiting review | Load failure | Verified/rejected | Already reviewed, permission denied |
| Map | Map placeholder | Coordinates unavailable | Map load failure | Directions available | — |

### 9.3 Copy rules

- Never say “Payment received”, “Paid”, or “Verified” before staff confirms.
- Say “Booking confirmed” only if policy confirms instantly; otherwise “Request
  received — awaiting club approval”.
- Explain the amount, deadline, and what happens if payment is late in the
  player’s own terms.
- Rejection messages are factual and non-accusatory, with the next step.
- Avoid technical jargon: “We couldn’t check availability. Try again.” not
  “409 conflict”.

---

## 10. Components and interaction requirements

### 10.1 Continuity with the Phase 1 visual direction

Phase 1 is provisional and awaiting approval, but it is the current baseline:
Archivo display type, Source Sans 3 body type, the navy/blue/lime/yellow token
set, warm off-white page surface, squared editorial image treatment, and the
existing button/field/badge/alert primitives. Phase 2 introduces no new palette,
font family, or competing component style.

Wireframes intentionally show structure rather than final colour. Status colours
will use the semantic tokens, always paired with text, and lime/yellow will not
carry small text. White on the current court blue (≈4.68:1) remains acceptable
for normal text but must be rechecked if the brand blue changes.

### 10.2 Planned additions

Reuse Phase 1 primitives (`Button`, `Field`, `Badge`, `Alert`, modal patterns,
media placeholders, tokens). Planned additions:

| Component | Purpose | Key requirements |
| --- | --- | --- |
| `Stepper` | Wizard progress | Current step announced; completed/upcoming distinct; not interactive unless safe. |
| `AvailabilityCalendar` | Date selection | Month grid + 7-day strip; keyboard support; closed days labeled; timezone shown. |
| `TimeSlotPicker` | Slot selection | 44px targets; court/time/price/status; selected announced; unavailable reason. |
| `BookingSummary` | Price/selection review | Sticky desktop, bottom bar mobile; all commitment data together. |
| `StatusPair` | Booking + payment | Two labeled statuses; text + color; history link. |
| `PaymentMethodPicker` | Method choice | Only enabled/approved methods; pay-later explanation inline. |
| `QrInstructions` | Manual payment | Official QR unmodified; account name, amount, reference, deadline, safety note. |
| `ProofUploader` | Receipt submission | Client compression with readable preview; 5 MB limit; replace/remove; progress; error mapping. |
| `PolicyNotice` | Rules near action | Cutoff, no-show, refund summary with link to full policy. |
| `ConfirmDialog` | Sensitive actions | Focus trap, escape/cancel, explicit consequence; irreversible wording. |
| `Toast` / inline notice | Feedback | Announced to assistive tech; not the only error location. |
| `FilterBar` / `Tabs` | Lists and queues | URL-reflectable where useful; clear reset; mobile sheet. |
| `DataTable` / `AgendaList` | Staff schedules | Sortable where meaningful; no hidden critical columns; mobile alternative. |
| `SidePanel` | Booking detail | Desktop only where appropriate; full page on mobile; focus management. |
| `EmptyState` | Zero data | Next action and support path. |
| `MobileNavSheet` | Public/staff nav | Focus trap, body scroll lock, close on route change. |
| `MapEmbed` | Location | Lazy load, attribution, text fallback, keyboard limitations documented. |

Interaction rules:

- Every async action has idle, pending, success, and error states.
- Buttons disable while pending; submission is idempotent from the UI.
- Validation appears after blur/submit, not on every keystroke; errors are
  summarized at the top of long forms and linked inline.
- Step changes move focus to the new heading and announce the step.
- Modals and sheets trap focus, close with Escape where safe, and return focus
  to the trigger.
- Filters update results without page-level flashing; preserve state in the URL
  where the screen is shareable.
- Do not add animation that delays booking or hides state.

---

## 11. Accessibility and usability requirements

Target: **WCAG 2.1 AA**, with the blueprint’s “don’t sacrifice accessibility for
visual appearance” rule.

- Semantic landmarks, one `<h1>` per page, ordered headings, skip link.
- All controls have persistent visible labels; placeholders are not labels.
- Keyboard access to calendar, time slots, filters, dialogs, uploads, and staff
  tables. Visible focus on every interactive element.
- Screen-reader announcements for: availability refresh, step change, booking
  result, proof submission, payment verification, and errors.
- Status is text plus color/icon; badges include accessible names.
- Errors identify the field, the problem, and how to fix it; an error summary
  links to each invalid field.
- 44px minimum touch targets for primary booking and staff actions; 24px absolute
  minimum for incidental links.
- Text contrast meets AA on actual surfaces; lime/yellow never carry small text.
- Zoom to 200% without loss of function; no horizontal scrolling for page
  content at 390px.
- `prefers-reduced-motion` respected; no motion required to understand state.
- QR instructions repeat the amount and reference in text; QR has descriptive
  alt/context, but the text alone is sufficient to pay.
- Map has a text address, directions link, and error fallback.
- Timezone and currency are explicit: `Asia/Manila`, `₱` (pending `D-25`).
- Auth forms support password managers (`autocomplete`), show/hide password,
  and do not leak whether an email exists.
- Proof upload uses real buttons and file dialogs, not drag-only interactions.
- Staff screens are operable without a mouse; destructive actions require
  confirmations that name the consequence.

**Planned verification:** manual keyboard and screen-reader passes, responsive
inspection at 390/768/1024/1440, reduced-motion check, and automated Playwright
coverage once the test stack exists. None of these have been run in Phase 2.

---

## 12. Content, asset, and data requirements

| Need | Used by | Status |
| --- | --- | --- |
| Logo (SVG/PNG) + favicon source | Global | Missing |
| Approved photography | Home, courts, open play, location | Missing |
| Court count, names, indoor/outdoor, facilities | Courts, booking | Missing |
| Operating hours, closures, buffer | Availability, staff | Missing |
| Court prices, durations, min/max | Book, review | Missing |
| Booking approval model | Confirmation, staff | Missing (`D-01`) |
| Account requirement and fields | Auth, booking | Missing (`D-02`, `D-11`) |
| Cancellation/no-show/refund policy | Review, account, policies | Missing (`D-06`) |
| Payment methods, account names, QR files | Payment, staff | Missing (`D-07`) |
| Payment deadline/expiry rule | Confirmation, reminders | Missing (`D-08`) |
| Open-play schedule, price, capacity, level | Open play | Missing (`D-10`) |
| Open-play payment method | Open play confirmation | Missing (`D-09`) |
| Address, coordinates, contact, social | Visit, footer, map | Missing (`D-18`) |
| Club story/facilities copy | About | Missing |
| FAQ and policy copy | FAQ/policies | Missing |
| Staff roles/permissions | Staff area | Missing (`D-14`) |
| Email provider/sender | Notifications | Phase 9 |
| Privacy/retention rules | Policies, proofs | Missing (`D-20`) |

Content rules:

- No testimonials, player counts, awards, ratings, fake schedules, or invented
  venue claims.
- Placeholder values are visibly marked in development and removed before
  launch.
- Policy copy must match what the software enforces; if the rule is not decided,
  the page must not publish a definitive claim.

---

## 13. Working assumptions (low-risk, confirm if wrong)

1. Currency is PHP and timezone is `Asia/Manila` (Philippines club context).
2. The MVP supports one booking per checkout. Multi-booking checkout is not
   assumed.
3. Court selection is by named/numbered court, with a single court per booking.
4. Normal open play has a fixed capacity and no waitlist in the MVP.
5. Manual QR methods are GCash and Maya, with bank transfer only if the payer’s
   bank supports the GCash route. Pay-at-club remains optional.
6. Bookings can be created by players and by staff for walk-ins.
7. Booking references are human-readable and unique; the exact format is a
   backend detail.
8. No automated refunds; refund states are recorded only when staff acts under
   the approved policy.
9. Email is the primary notification channel if Phase 9 is approved.
10. Coaching and DUPR are not part of the MVP.

These are planning assumptions, not business rules. Any that the client does not
accept must be corrected before implementation.

---

## 14. Blueprint conflicts and deferrals

| Blueprint text | Conflict | Resolution in this plan |
| --- | --- | --- |
| Phase 2 lists Court, Normal Open Play, DUPR Open Play, Coaching on `/book`. | v2.5 scope gate defers DUPR/coaching and forbids building them. | Only court + open play appear. Layout supports future additions without empty placeholders. |
| Phase 2 home includes “featured court/open-play/coaching options”. | Coaching deferred. | Home features courts and open play only. |
| Phase 2 staff pages include coaching management. | Coaching deferred. | Omitted from navigation and routes. |
| Phase 2 player pages include DUPR ID/link status. | DUPR deferred and conditional. | Omitted; extension point documented only. |
| Phase 2 says “clearly label normal vs DUPR open play”. | No DUPR sessions exist. | Normal open play is labeled plainly; no DUPR comparison is shown. |
| Final definition of done expects all four service types represented. | Conflicts with MVP-first gate. | Deferred features remain excluded until explicitly approved; this must be revisited at final launch scoping. |
| Phase 7 open-play confirmation says payment due at the club; Phase 12 describes QR proof for payments. | Ambiguous which applies to open play. | `D-09` requires the client to choose; the UI supports either, but only one is shown. |
| Phase 2 requires prices before personal info. | Prices not supplied. | Layout and copy slots are defined; no price is invented. |
| Account requirement is not fixed. | Blueprint says not to force account creation before availability unless required. | `D-02`; the flow preserves selection through any auth gate. |

Deferred features are documented as out of scope, not silently omitted.

---

## 15. Acceptance criteria for planned journeys

These are criteria for later implementation phases, not evidence that anything
has been built.

### AC-1 Court booking (first-time, signed out)

- [ ] The player can see price, duration, payment method, and rules before
      entering personal details, using only client-confirmed values.
- [ ] Past dates, closed hours, and unavailable slots are disabled with a
      reason; the timezone is visible.
- [ ] Selection survives the account gate per `D-02`.
- [ ] A taken slot produces a recoverable error without duplicate booking.
- [ ] Confirmation states booking and payment status separately and never
      claims payment was received.
- [ ] The reference can be copied, and the next action is obvious on mobile.

### AC-2 Payment proof

- [ ] Uploads validate type and size; oversized/invalid files show actionable
      errors.
- [ ] A submitted proof produces `AWAITING_VERIFICATION`, not `PAID`.
- [ ] The official QR is displayed unmodified; amount and reference are readable
      as text.
- [ ] Duplicate submission and unauthorized access are blocked at the trusted
      boundary.
- [ ] Rejection shows a safe reason and a policy-appropriate next step.
- [ ] Staff approval requires independent verification, a confirmation step,
      and records an audit event.

### AC-3 Open play

- [ ] Sessions show date/time, price, level, capacity, and status.
- [ ] Full sessions are labeled “Full” and cannot be booked.
- [ ] Capacity is revalidated server-side; the last-place race is handled.
- [ ] Confirmation clarifies payment method and check-in expectations.
- [ ] Staff can see the roster, check in, and mark attendance.

### AC-4 Account and booking management

- [ ] Players see only their own bookings and proofs.
- [ ] Empty, loading, and error states exist for lists and details.
- [ ] Cancellation/reschedule controls appear only when policy permits, and
      explain consequences before acting.
- [ ] Disallowed actions show a reason or an approved contact path.
- [ ] Session expiry is explained without losing safe context.

### AC-5 Staff operations

- [ ] A staff member can run a normal day without editing the database.
- [ ] Dashboard surfaces today’s bookings, open play, unpaid, awaiting
      verification, and exceptions.
- [ ] Payment can be recorded only with method, amount, time, staff, and
      confirmation; changes are audited.
- [ ] Sensitive actions are permission-gated in both UI and server logic.
- [ ] Calendar/list views are usable at 768px and above; key actions are usable
      on a phone.

### AC-6 Public content and location

- [ ] Address, hours, and contact are available as text; the map is not the only
      path.
- [ ] The map loads lazily, shows the correct marker, and includes attribution.
- [ ] No dead links, fake content, or unapproved venue claims remain.
- [ ] Policies shown at booking match published policy pages.

### AC-7 Cross-cutting

- [ ] 390px, 768px, 1024px, and 1440px layouts inspected with no page overflow.
- [ ] Keyboard-only completion of the booking and payment-review flows.
- [ ] Focus is visible and managed across steps, dialogs, and sheets.
- [ ] Status never depends on color alone.
- [ ] Loading/empty/error/success/disabled states exist for every major flow.
- [ ] Reduced motion preserves understanding.
- [ ] No screen implies automatic payment verification.

### Phase 2 exit criteria (planning)

Phase 2 can be formally exited only when every box below is checked. The
structure is client-approved; the remaining items are deferred business inputs.

- [x] Primary player journeys mapped.
- [x] Staff workflow mapped.
- [x] Mobile layouts specified before desktop for booking interactions.
- [x] Login placement identified and flagged as `D-02`.
- [ ] Login placement actually decided by the client (deferred on `D-02`).
- [x] Labels and page structure approved by the client as drafted
      (27 October 2026).
- [ ] Full price, duration, payment method, and rules specified before
      confirmation with client-approved values (structure approved; values
      deferred).
- [x] Loading, empty, error, unavailable, success, and disabled states
      specified.
- [ ] Business rules, prices, and policies supplied (deferred).

---

## 16. Recommended phase sequencing for this experience

1. **Phase 2 review:** client confirms sitemap, journeys, labels, and the
   blocking decisions.
2. **Phase 3:** refine the component system for the specified screens, including
   stepper, availability, summary, status pair, and staff surfaces.
3. **Phase 4:** data model, RLS, atomic booking, capacity, permissions.
4. **Phase 5:** public site with approved content and OpenFreeMap.
5. **Phase 6:** accounts at the confirmed gate.
6. **Phase 7:** court + normal open-play booking.
7. **Phase 8:** staff operations.
8. **Phase 9:** notifications if approved.
9. **Phase 10–11:** QA, security, launch, handover.
10. **Phase 12:** QR proof flow and staff verification.
11. **Phase 13–14:** only if explicitly approved; otherwise remain deferred.

Do not implement later phases before their prerequisites and client decisions
are resolved.

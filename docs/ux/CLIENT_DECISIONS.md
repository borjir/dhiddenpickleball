# Phase 2 — Client Decision Register

**Version:** 2.4
**Date:** 6 November 2026
**Status:** Partly answered. Response 2 is authoritative. On 4 November 2026
the project owner answered the three flow blockers (D-01, D-06, D-08), the
location, contact, and name questions (D-18, D-19), and the Phase 4 role and
authentication decisions (D-14, D-16). On 5 November 2026 the owner approved the
public copy, delegated the privacy notice and terms of use to the
implementation, and confirmed the timezone and currency. On 6 November 2026 the
owner supplied open-play defaults and approved the grouped multi-date court
reservation model. The decisions listed as open or partly answered below are
still outstanding.
**Source of truth:** the client's exported questionnaire response dated
30 October 2026 (`Hidden Pickleball Court & Bistro — Client Decisions
Questionnaire (Responses).xlsx`, row 2, answered by "Management").
**Purpose:** record the business rules that materially change the UX before they
are implemented.

## Reconciliation note

The export contains two rows that disagree on pricing structure, hours,
durations, confirmation model, account requirement, cancellation outcomes, and
staff ownership.

- **Response 1** — Edna Doster, Owner, 28 October 2026. Detailed, but not adopted.
- **Response 2** — "Management", 30 October 2026. **Adopted as authoritative on
  3 November 2026 by explicit project-owner instruction.**

Where Response 2 is blank, the item is **open**. Response 1's answer is *not*
used to fill the gap, because Response 1 is not authoritative. Blanks must go
back to the client.

Two answers inside Response 2 contradict each other and are flagged below:
D-01 (a temporary hold with no duration) and D-08 (no payment deadline, but
unpaid bookings are automatically cancelled). Both were resolved on 4 November
2026 — see *Owner decisions* below.

## Status key

- **Answered** — the client gave a usable answer.
- **Partly answered** — some of the decision is settled; the listed parts are not.
- **Open** — no usable answer. Do not invent one.
- **Deferred** — confirmed out of scope for the MVP.

## Summary

| ID | Decision | Priority | Status |
| --- | --- | --- | --- |
| D-01 | Confirmation model / temporary hold | P0 | Resolved by owner 4 Nov — **15-minute hold** |
| D-02 | Guest booking vs account required | P0 | Answered — account required |
| D-03 | Pricing, durations, buffer, booking window | P0 | Partly answered — rate and durations settled |
| D-04 | Court inventory and facilities | P0 | Partly answered — 2 courts settled, facilities open |
| D-05 | Operating hours and closures | P0 | Partly answered — hours settled, closures open |
| D-06 | Cancellation, reschedule, no-show, refund | P0 | Resolved by owner 4 Nov — outcomes set |
| D-07 | Payment methods and receiving details | P0 | Partly answered — GCash only; owner test QR published; client QR coming soon; account name on hold |
| D-08 | Payment deadline and unpaid consequence | P0 | Resolved by owner 4 Nov — deadline equals the 15-minute hold |
| D-09 | Open-play payment method | P0 | Answered 6 Nov — GCash QR only; client QR soon |
| D-10 | Open-play schedule, capacity, levels | P0 | **Answered for implementation** — owner supplied ₱75, Saturdays, three levels, 12 places; staff-editable |
| D-11 | Required player fields | P0 | Partly answered — max players open |
| D-12 | Multiple bookings per checkout | P1 | Resolved for implementation 6 Nov — one grouped reservation, up to 8 ranges across dates |
| D-13 | Self-service cancel/reschedule | P0 | Answered — not allowed |
| D-14 | Staff roles and permissions | P0 | Resolved for Phase 4 — **player and staff only**; named staff accounts remain Phase 8 |
| D-15 | Staff overrides and manual edits | P1 | **Open** |
| D-16 | Authentication rules | P1 | Resolved for Phase 4 — email verification, email/password, and Google OAuth; staff MFA open |
| D-17 | Notifications and reminders | P1 | **Open** |
| D-18 | Address, map, contact, social | P1 | Resolved by owner 4 Nov — pin, address, phone, and email supplied; no social links |
| D-19 | Brand, photography, content rights | P1 | Answered — name confirmed as "D-Hidden Pickleball" |
| D-20 | Privacy, terms, data retention | P1 | Resolved for Phase 5 — privacy notice and terms published; legal review recommended |
| D-21 | Reports and exports | P2 | **Open** |
| D-22 | Waitlist for open play | P2 | Partly answered — wanted, rules blank |
| D-23 | Receipts and tax | P2 | **Open** |
| D-24 | Booking reference format | P2 | **Open** |
| D-25 | Timezone and currency | P1 | Answered — `Asia/Manila`, PHP, confirmed 5 Nov 2026 |
| D-26 | Staff-created walk-in bookings | P1 | Answered — allowed |
| D-27 | Group booking model | P0 | Partly answered — max players open |
| D-28 | Coaching / DUPR | P0 | Deferred — coaching "later", DUPR silent |

---

## Owner decisions — 4 November 2026

The project owner supplied these answers directly and delegated the three flow
blockers to the implementation. They are recorded as project decisions, not as
client answers, and the client can still override any of them before launch.

| Item | Decision |
| --- | --- |
| Hold (`D-01`) | 15 minutes, starting when the booking request is confirmed; the slot is released on expiry |
| Payment deadline (`D-08`) | The same 15 minutes; hold expiry is what triggers automatic cancellation |
| Cancellation (`D-06`) | 24 hours or more: full refund or one free move. Inside 24 hours: fee forfeited and slot released. No-shows and late arrivals: no refund, no extension. Club closure: refund or free move |
| Address (`D-18`) | "Bung-aw, Pondol, Balamban, Cebu" |
| Map pin (`D-18`) | 10°30'05.5"N 123°42'58.2"E — 10.5015278, 123.7161667 |
| Public contact (`D-18`) | 0956 167 0905 and gracemilan87@gmail.com |
| Name (`D-19`) | "D-Hidden Pickleball Court & Bistro" |
| Palette | Keep the shipped tokens; the logo is to be redrawn in `#123B78` (see `docs/DESIGN_BRIEF.md` §9) |
| Payment testing (`D-07`) | A labelled test-mode control reaches the paid states without a real transfer; the club QR is still not supplied |

Implementation: `lib/club.ts` holds the address, map link, phone, and email;
`components/booking/booking-preview.tsx` holds the internal preview's hold,
deadline, cancellation copy, and test-mode control. The live flow is
`app/book/page.tsx` and `components/booking/court-booking.tsx`.

## Owner decisions — 5 November 2026

The project owner approved the public copy and delegated the privacy and terms
pages to the implementation.

| Item | Decision |
| --- | --- |
| Public copy | Approved for publication on 5 November 2026. Facilities, holiday closures, and the official GCash QR remain open and must stay omitted or labelled as open. Open-play defaults were supplied by the owner on 6 November. |
| Privacy and terms (`D-20`) | Implement a privacy notice and terms of use. Payment proof stays private. Booking and account records are kept only as long as needed for the service, refunds, disputes, accounting, and legal requirements. Legal review is recommended before launch. |
| Timezone and currency (`D-25`) | `Asia/Manila`; Philippine pesos (`₱`, PHP). |
| GCash (`D-07`) | The official QR and receiving account name remain on hold. The live confirmation now uses the project owner's test QR under the 6 November decision below; it stays clearly labelled as a test account. Do not present it as the club's code. |
| Facilities (`D-04`) and closures (`D-05`) | Still unanswered. Keep both omitted or labelled as not yet published. |
| Open play (`D-10`) | The client wants open play. The owner supplied implementation defaults on 6 November; see the entry below. Keep sessions database-driven so staff can edit them. |
| Indexing | Public pages stay `noindex` while the official QR is on hold and booking is still awaiting live verification. Removing `noindex` is a launch decision, not part of the copy approval. |

## Owner decisions — 6 November 2026

| Item | Decision |
| --- | --- |
| Test GCash QR (`D-07`) | The owner approved publishing their personal GCash QR in the live booking confirmation for testing. It is labelled **Test** and named as the project owner's account, not the club's receiving account. The client's official QR and account name remain on hold. |
| Payment scope | The QR is downloadable. Private GCash screenshot upload is now an early Phase 8 slice: proof is stored in the private bucket and moves payment to **Awaiting verification**, never **Paid**. Staff review, rejection, and the verification queue remain Phase 8 work. |
| Open-play defaults (`D-10`) | Normal open play starts at **₱75 per player**, on **Saturdays**, with **beginner**, **intermediate**, and **advanced** sessions. Default sessions are 120 minutes, capacity 12, at 8:00 AM, 10:00 AM, and 4:00 PM. The owner explicitly delegated the defaults and said staff may edit anything about their open play. The implementation seeds 52 Saturdays into editable `open_play_sessions` rows; staff management UI remains Phase 8. |

---

## A. Booking rules

### D-01 — Confirmation model and temporary hold

**Client answer (30 Oct):** "Temporary hold before completion."

**Resolved 4 Nov 2026 — project owner decision:**

- The hold lasts **15 minutes**.
- It starts when the player confirms the request, i.e. when the held request is
  created and the payment screen opens. Choosing a slot holds nothing.
- On expiry the slot returns to the schedule, and the player is told the slot is
  available again and that no booking or payment exists.

The preview now states this as policy instead of a sample value.

**Blocks:** Phase 7 booking, Phase 8 dashboard, Phase 9 reminders.

---

### D-02 — Account required to book

**Client answer (30 Oct):** No guest booking. An account is required **at
review, after availability and price are shown**. Required fields: full name,
email, mobile number. Email verification: **yes**.

**Consequence:** this matches the blueprint's preference not to force account
creation before the player sees availability. The guest-with-reference path is
now out of scope.

**Still open:** none for the flow itself; password policy and MFA are tracked in
D-16.

**Blocks:** Phase 6 auth, Phase 7 booking.

---

### D-03 — Pricing, durations, buffer, booking window

**Client answer (30 Oct):**

- Per court-hour.
- ₱250/hour from 7:00 AM to 5:00 PM.
- ₱300/hour from 5:00 PM to 12:00 AM.
- Durations: 60, 90, or 120 minutes.

**Implementation change (6 Nov 2026):** the project owner asked for a start-hour
and end-hour picker instead of the fixed duration buttons. The online flow now
offers any contiguous whole-hour range inside the free block, up to the next
reservation or closing time, and sums the hourly rates across the range. The
original 60/90/120 values remain valid for existing rows. Minimum/maximum
booking length, buffer, and partial-hour rules are still open.

**Still open:**

- Whether weekends carry a different rate. Response 1 said the evening rate
  applies all day at weekends; Response 2 is silent, so **do not assume it**.
- Minimum and maximum booking length (blank).
- Buffer or cleanup time between bookings (blank).
- How far ahead a player may book (blank).
- Same-day booking cutoff (blank).
- Partial-hour and rounding rules, which matter for 90-minute bookings and for
  any booking that crosses 5:00 PM.
- Whether the displayed price is the total or excludes fees.

**Blocks:** public price copy, Phase 7 availability and totals, reports.

---

### D-04 — Court inventory and facilities

**Client answer (30 Oct):** 2 bookable courts, named "Court1" and "Court2".

**Still open:** the publishable facilities list was left blank. Response 1
described outdoor covered courts, lighting, silica surface, concrete driveway
parking, street-level access, a bistro, and a sundries shop — but Response 1 is
not authoritative, so none of that may be published yet.

**5 November 2026:** still open. The courts pages keep the facilities list
omitted.

**Blocks:** Phase 5 courts page, Phase 7 labels, Phase 8 calendar.

---

### D-05 — Operating hours and closures

**Client answer (30 Oct):** Monday to Sunday, 7:00 AM to 12:00 AM.

**Still open:** regular closures, holidays, and maintenance days (blank). No
holiday calendar exists, so availability must not silently claim every day is
open forever.

**5 November 2026:** still open. The visit and rules pages keep the caveat that
holiday and maintenance closures are not published.

**Blocks:** Phase 4 constraints, Phase 5 visit page, Phase 7 availability.

---

### D-06 — Cancellation, reschedule, no-show, refund

**Client answer (30 Oct):**

- Cancellation cutoff: 24 hours.
- Rescheduling: allowed.
- Self-service cancel or reschedule: **not allowed** — the player must contact
  the club.

**Resolved 4 Nov 2026 — project owner decision:**

| Situation | Outcome |
| --- | --- |
| Cancel 24 hours or more before court time | Full refund to the paying GCash number, or one free move to another slot |
| Cancel inside 24 hours | The court fee is not refunded and the slot is released to other players |
| Reschedule | One free move per booking when requested at least 24 hours ahead, subject to availability |
| No-show | No refund and no extension |
| Late arrival | The booking still ends at its scheduled time — no extension, no partial refund |
| Club closes the court (weather, maintenance) | Full refund or a free move, player's choice |
| Self-service | Still not available; the player contacts the club |

Refund timing is deliberately not stated in the UI, because the club has not set
a service level for returning money.

**Blocks:** Phase 6 account actions, Phase 7 copy, Phase 8 tools, policies.

---

### D-07 — Payment methods and receiving details

**Client answer (30 Oct):**

- GCash QR is the launch method for court bookings.
- The club will provide official QR images (answer "yes"), but **no file or
  account name was supplied**.
- Maya appears only in the open-play answer.

**Repository state:** `public/qr/gcash-sample.jpg` is a **personal stand-in** QR
(Joel Jay P. Arcipe, the project developer), not the club's. It is rendered with
a "Sample · do not pay" band that breaks the code, and it must be replaced
before any deployment. The name shown to payers is still unknown.

**Test mode (4 Nov 2026):** the booking preview carries a *Simulate a successful
payment* control, labelled test only, so the paid and awaiting-verification
states can be walked with no real transfer and without holding a club account.
It does not replace the requirement for the club's real QR.

**5 November 2026:** the QR and receiving account name remain on hold. Keep the
labelled test/sample code, take no real payment, and do not present the sample
as the club's code.

**6 November 2026:** the owner approved using their personal test QR in the live
booking confirmation. `public/qr/gcash-test-qr.png` is a square crop of the
stand-in QR; the code itself is unchanged and still decodes. The confirmation
labels it **Test**, identifies it as the project owner's account, and keeps the
client's official QR and account name open. This is a temporary test
destination, not the club's receiving account, and it does not add payment-proof
upload or staff verification.

**Still open:** the club's receiving account name and the official GCash QR
image. The owner said on 6 November that the client's QR is coming soon; Maya
is not part of the current flow.

**Blocks:** Phase 12, booking confirmation, staff verification.

---

### D-08 — Payment deadline and unpaid-booking consequence

**Client answer (30 Oct):**

- "How long does the player have to pay?" — **N/A**.
- "What happens if payment is not made by the deadline?" — booking is
  **automatically cancelled**.
- Proof rejected: no resubmission — contact the club.

**Resolved 4 Nov 2026 — project owner decision:** the payment deadline is the
same 15 minutes as the hold in D-01, so the client's "N/A" is read as "no
separate deadline". The hold expiry is the trigger for automatic cancellation:
when it passes with no payment proof submitted, the request is cancelled and the
slot returns to the schedule. Staff extension is not offered in the MVP.

**6 Nov 2026 implementation:** a proof uploaded before the hold expires confirms
the slot and moves payment to **Awaiting verification**. The upload is available
on the booking confirmation as well as the booking detail page, so the player can
finish without an extra navigation step. It does not mark the payment **Paid**;
staff verification is still required.

**Blocks:** Phase 7–9, Phase 12.

---

### D-09 — Open-play payment method

**Client answer (30 Oct):** "GCash/Maya proof before the session."

**Owner direction (6 Nov 2026):** use **GCash QR only**. Maya is not part of the
current flow. The client's official GCash QR is still to be supplied; the test
QR remains labelled until then. The QR-proof model applies to open play.

**Blocks:** open-play confirmation, staff roster, Phase 12.

---

### D-10 — Open-play schedule, capacity, and levels

**Client answer (30 Oct):** every field blank — schedule, price per player,
capacity, skill levels, and who creates or cancels sessions.

**Status:** answered for implementation on 6 November 2026. The project owner
delegated the defaults so open play could proceed:

- **Price:** ₱75 per player.
- **Schedule:** Saturdays.
- **Levels:** beginner, intermediate, and advanced.
- **Default sessions:** 8:00 AM beginner, 10:00 AM intermediate, 4:00 PM
  advanced; 120 minutes each; capacity 12.
- **Ownership:** staff can edit any open-play session detail.

The defaults live in `open_play_sessions` rows, not in the UI. The migration
seeds 52 Saturdays. Staff can edit the date/time, level, price, capacity, and
status directly now; the staff management screen is Phase 8. A waitlist is still
not approved (`D-22`), and DUPR/coaching are not part of this implementation.

**Blocks:** Phase 5 open-play page, Phase 7 registration, Phase 8 staff tools.

---

### D-11 — Required player details and group model

**Client answer (30 Oct):**

- One person may book for a group.
- Only the booking player's name is required; no player roster.
- Mobile number is required for day-of contact.

**Still open:** maximum number of players per court (blank). This affects court
copy and check-in.

**Blocks:** Phase 6 profile, Phase 7 form, privacy policy.

---

### D-12 — Multiple bookings per checkout

**Client answer (30 Oct):** not asked; no answer given.

**Resolved for implementation 6 Nov 2026 — project owner decision:** one grouped
reservation may contain multiple contiguous ranges, including ranges on different
dates. The group has one reference, one total, one 15-minute hold, and one GCash
proof; each range is still stored as its own booking tied to the group. The cart
accepts up to 8 ranges as an implementation guard, not a confirmed business
maximum.

**Blocks:** Phase 7.

---

### D-13 — Self-service cancel or reschedule

**Client answer (30 Oct):** **No** — the player must contact the club.

**Consequence:** no cancel or reschedule buttons in the player account. The
account screen must show the contact channel prominently instead. The contact
channel itself is complete for phone and email, but see D-18.

**Blocks:** Phase 6 account detail, Phase 7.

---

## B. Operations, security, and notifications

### D-14 — Staff roles and permissions

**Client answer (30 Oct):** generic only — "Staff" may verify payments, edit
prices, cancel bookings, issue refunds, and block courts. "Who needs staff
access?" was answered "N/A".

**Phase 4 decision (4 Nov 2026, project owner):**

- Use the smallest role set: **player** and **staff** only. No manager/admin role.
- Every new account starts as `player`.
- `staff` is granted manually in Supabase SQL. There is no promotion control in
  the app and no way for a player or staff member to change a role through the
  Data API.
- A database trigger blocks authenticated role changes and writes role changes
  to `audit_logs`; the column grant excludes `role`.
- Staff may perform the actions in the client's generic answer, but the
  per-action permission split and named accounts are still Phase 8 work.

**Status:** Resolved for Phase 4 database and RLS. Named staff accounts,
per-action permissions, and the staff UI remain Phase 8.

**Blocks:** no longer Phase 4 RLS; still Phase 8 navigation and actions.

---

### D-15 — Staff overrides and manual edits

**Client answer (30 Oct):** not asked; no answer given.

**Working recommendation:** require a recorded reason for price changes,
cancellations, refunds, and backdated payments.

**Blocks:** Phase 8.

---

### D-16 — Authentication rules

**Client answer (30 Oct):** email verification is required before booking.

**Phase 4 decision (4 Nov 2026, project owner):**

- Support **email/password** and **Google OAuth**. Google is the preferred
  convenience path because it is free for this project.
- Email confirmation stays enabled. The callback route exchanges the Supabase
  code and also accepts a `token_hash` link if an email template points directly
  at the app.
- Password rule is a working minimum of **8–72 characters**. It is not a
  client-approved password policy.
- Sessions use Supabase's cookie-based SSR flow. The Next.js 16 proxy refreshes
  them with `getClaims()`; server code never trusts `getSession()`.
- Password recovery uses a single-use emailed link and a dedicated reset screen.
- Staff MFA is not implemented. The privacy notice and terms pages now exist;
  moving Google OAuth out of testing remains a launch step.

**Status:** Resolved for Phase 4 sign-in, sign-up, confirmation, recovery, and
session refresh. Final password policy and staff MFA remain open and belong to
Phase 8 unless the client asks for them earlier.

**Blocks:** no longer Phase 4/6 authentication; staff MFA remains a Phase 8
security question.

---

### D-17 — Notifications and reminders

**Client answer (30 Oct):** blank.

**Working recommendation:** essential transactional email only, in Phase 9. Do
not promise email delivery earlier.

**Blocks:** Phase 9.

---

## C. Content, location, and legal

### D-18 — Location and contact information

**Client answer (30 Oct):**

- Address: "Bung aw Pondol Balamban Cebu".
- Phone: 0956 167 0905. Email: gracemilan87@gmail.com.
- No social links supplied.

**Resolved 4 Nov 2026 — supplied by the project owner:**

- **Map pin:** 10°30'05.5"N 123°42'58.2"E (10.5015278, 123.7161667), published as
  a Google Maps link with the coordinates also written in text.
- **Address spelling:** **"Bung-aw, Pondol, Balamban, Cebu"** — "Bung-aw" with a
  hyphen.
- **Email:** `gracemilan87@gmail.com` is the publishable contact address.
- **Phone:** 0956 167 0905 is publishable and is linked as a `tel:` link.

**Still open:** social links. None were supplied, so none are shown.

**Blocks:** Phase 5 visit page, footer.

---

### D-19 — Brand, photography, and content rights

**Client answer (30 Oct):** logo will be supplied (received 3 November);
photography answer was "No — use clearly labeled placeholders for now";
permission to publish supplied images and copy: **yes**.

**Repository state:**

- `public/logo/hidden-pickleball.webp` — official mark, supplied 3 Nov.
- `public/courts/pickleball1.jpg`, `public/courts/pickleball2.jpg` — supplied
  3 Nov and **treated as club photography by explicit project-owner
  instruction**, overriding the questionnaire's placeholder answer.

**Caveat — the name does not match.** On 3 November 2026 the project owner chose
"match the logo". The logo wordmark reads **"HIDDEN PICKLEBALL COURT & BISTRO"**
with a large leading *D*, so the working written name is
**"D-Hidden Pickleball Court & Bistro"**. Response 2 wrote
"D' Hidden Pickle Court & Bistro". The differences are:

| Element | Response 2 | Logo |
| --- | --- | --- |
| Leading D | `D'` | large `D` mark |
| Court word | `Pickle` | `Pickleball` |

**Resolved 4 Nov 2026:** the name is **"D-Hidden"** (hyphen) and the sport is
**Pickleball**. The site already used that form everywhere, so no copy changed;
the confirmation closes the question for the domain, invoices, and policy pages.

**Blocks:** Phase 5 launch, Phase 3 polish.

---

### D-20 — Privacy, terms, and data retention

**Client answer (30 Oct):** blank.

**Project-owner instruction (5 Nov 2026):** implement the privacy notice and terms
of use; the public copy is approved. The published pages cover account and
booking data, payment proof, sharing, retention, security, Data Privacy Act
rights, cookies, and the map, plus account, booking, payment, conduct, liability,
and governing-law terms.

**Implementation decision:** payment proof is private and visible only to the
booking owner and authorized staff. Account and booking records are kept while
the account is active and for a reasonable period afterwards; payment proof is
kept only as long as needed to verify payment, handle a refund or dispute, and
meet accounting or legal requirements, then deleted or anonymized.

**Recommended:** have the privacy notice and terms reviewed by the client and
counsel before launch. They are plain-language policy, not legal advice.

**Blocks:** Phase 4 storage, Phase 10–11 launch review.

---

### D-21 — Reports and exports

**Client answer (30 Oct):** blank.

**Blocks:** Phase 8.

---

### D-22 — Waitlist

**Client answer (30 Oct):** "Yes" — but the rules field is blank.

**Conflict:** the blueprint and this register recommend no waitlist in the MVP.
A waitlist without promotion and payment rules is not buildable.

**Blocks:** open-play capacity UX.

---

### D-23 — Receipts and tax

**Client answer (30 Oct):** blank.

**Blocks:** Phase 12 / handover.

---

## D. Minor or confirmations

### D-24 — Booking reference format

**Client answer (30 Oct):** not asked.

**Working recommendation:** human-readable reference such as `HP-1042`, unique,
and never the only access control.

**Blocks:** display only.

---

### D-25 — Timezone and currency

**Client answer (30 Oct):** not asked explicitly. The address is in Cebu and all
prices are quoted in pesos.

**Confirmed 5 November 2026:** use `Asia/Manila` and Philippine pesos (`₱`, PHP).
No longer an inference.

**Blocks:** Phase 4 onward.

---

### D-26 — Staff-created walk-in bookings

**Client answer (30 Oct):** **Yes**, staff may create walk-in or phone bookings.

**Blocks:** Phase 8.

---

### D-27 — Group booking model

**Client answer (30 Oct):** one person may book for a group; only the booker's
name is required.

**Still open:** maximum players per court.

**Blocks:** Phase 7 form.

---

### D-28 — Coaching and DUPR status

**Client answer (30 Oct):** "Discuss coaching later." DUPR was not mentioned.

**Project-owner direction (5 Nov 2026):** neither coaching nor DUPR is expected to
be part of the system for now, because the client has not answered. Treat both as
out of scope until the client explicitly asks for them. Do not build pages,
tables, endpoints, navigation, or integrations speculatively.

**Status:** deferred. No pages, tables, endpoints, or navigation may be created.

**Blocks:** scope gate; no MVP blocker.

---

## Decisions already fixed by the blueprint

These are not open:

- Manual QR payments only; no payment API or automated verification.
- Staff must verify the actual incoming transaction before `PAID`.
- Uploading proof alone never marks a payment as paid.
- Booking status and payment status are separate.
- Server/database validation is required for availability and capacity.
- RLS and server-side role checks are mandatory.
- Secret/service-role keys stay server-side.
- OpenFreeMap with a text address fallback.
- Coaching and DUPR are deferred/conditional.
- Open play, coaching, and DUPR are not planned for the current build unless the
  client supplies the missing rules and explicitly asks for them.
- No invented prices, schedules, policies, addresses, or social proof.

## Asset register

| Asset | Status | Location |
| --- | --- | --- |
| Official logo | Received 3 Nov 2026 (WebP, 1254×1254, transparent) | `public/logo/hidden-pickleball.webp` |
| Favicon / app icon | Derived from the logo, no recolour | `app/icon.png`, `app/apple-icon.png` |
| Court photography | Received 3 Nov 2026; treated as club photography by owner instruction | `public/courts/pickleball1.jpg`, `public/courts/pickleball2.jpg` |
| Payment QR | **On hold — personal stand-in, test/sample only** | `public/qr/gcash-sample.jpg` |
| Receiving account name | Not supplied — on hold | — |
| Address, map pin, phone, email | Supplied 4 Nov 2026 | `lib/club.ts` |
| Social links | None supplied; publish phone and email only | — |
| SVG logo master | Not supplied; current mark is raster | — |

## Response format for the remaining answers

```text
D-03: weekend rate ___ ; buffer ___ ; booking window ___ days ; rounding ___
D-04: publishable facilities ___
D-05: closures/holidays ___
D-07: receiving account name ___ ; GCash QR file ___ ; Maya for courts? ___
D-10: sessions ___
D-22: waitlist rules ___
```

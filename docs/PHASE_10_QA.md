# Phase 10 — QA, Security, and Pre-Launch Review

**Date:** 7 November 2026  
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md` (v2.5)  
**Scope:** Verify the implemented MVP against the Phase 10 QA, security, and
pre-launch requirements. No Phase 11 work, no coaching, and no DUPR
functionality was added.

## Verdict

The available-scope QA pass **passed**. The application builds, serves public and
authenticated routes, enforces player/staff boundaries, rejects conflicting
bookings and over-capacity open-play registrations, and has no known
service-role key leak in the client bundle.

**It is not ready for public launch yet.** Real player email, the public site
URL, the reminder scheduler, the official GCash QR, client acceptance, and
backup/monitoring arrangements remain open. Section 5 lists the blockers.

## 1. Environment and method

- Production build served locally at `http://localhost:3100` with
  `npm run build` / `next start`.
- Database: production Supabase project `ybgcktpyntpcragegwec`, read-only except
  for role tests and booking/capacity tests that ran inside transactions and
  were rolled back.
- Browser: Chrome headless with CDP, viewports 390, 768, 1024, and 1440 px.
- Authenticated UI: short-lived admin-generated magic-link sessions for one test
  player and one staff account. No passwords were changed and no email was sent.
- The dev server was stopped for the production build, then restored on port
  3000 after the pass.

## 2. Checks and results

### Static, build, and dependency checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **Passed**, no output |
| `npx eslint . --max-warnings=0` | **Passed**, no output |
| `npm run build` | **Passed**; 47 routes, exit 0 |
| `npm audit --omit=dev` | **Passed**; 0 vulnerabilities |
| `git diff --check` | **Passed**; no whitespace errors (CRLF notices only) |
| Tracked environment files | Only `.env.example` is tracked; `.env.local` is ignored |
| Client-bundle secret scan | **Passed**; no actual service-role key in `.next/static`. The one `sb_secret_` match is the Supabase client's key-prefix check, not a credential. |
| Service-role references in client code | None found |

### Production response and header checks

| Check | Result |
| --- | --- |
| Public routes (`/`, `/courts`, `/book`, `/open-play`, `/visit`, `/club`, policies) | **200** |
| Auth routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`) | **200** |
| `/staff` while signed out | **307** redirect to sign-in |
| `/api/cron/email` without the bearer secret | **401** |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, and geolocation disabled |
| `X-Powered-By` | Removed |

### Database access control and constraints

| Check | Result |
| --- | --- |
| RLS enabled on all public tables | **Passed** |
| Player A sees own data | 1 profile, 4 bookings, 4 groups, 4 payments |
| Player B sees own data | 1 profile, 2 bookings, 2 groups, 2 payments |
| Staff sees club data | 3 profiles, 20 bookings, 9 groups, 9 payments |
| Anonymous read of `bookings` | **Denied** |
| Player read of `email_outbox` | **Denied** |
| Player self-promotion to staff | **Denied** |
| Player update of another profile | **0 rows affected** |
| Player call to `staff_review_payment` | **Denied**: “Staff access is required.” |
| Staff call to `staff_review_payment` with an unknown payment | Reached “Payment not found.”, confirming staff access |
| Payment-proof storage visibility | Player A sees 4 own files; Player B sees 2; staff sees all 9 |
| Overlapping court reservation | **Rejected** with `23P01`: “That court and time are no longer available.” |
| Open-play capacity race | **Rejected** the second player with `23P01`: “This open-play session is full.” |
| Over-capacity scheduled sessions in existing data | 0 found |

The booking and capacity tests created references `HP-F86C1115` and
`HP-531E33B5` inside rolled-back transactions; neither record persists.

### Authenticated UI and role routing

| Role | Route | Result |
| --- | --- | --- |
| Player | `/account` | Renders “Your account” |
| Player | `/staff` | Redirects to `/account?notice=staff-only` |
| Player | `/staff/payments` | Redirects to `/account?notice=staff-only` |
| Staff | `/staff` | Renders “Today at D-Hidden” |
| Staff | `/account` | Redirects to `/staff` |
| Staff | `/staff/bookings` | Renders “Bookings” |
| Staff | `/staff/payments` | Renders “Payment verification” |
| Staff | `/staff/open-play` | Renders “Open-play desk” |
| Staff | `/staff/courts` | Renders “Court blocks” |
| Staff | `/staff/reports` | Renders “Operations report” |

All authenticated pages above were checked at **1440 px** and **390 px**. Each
had one `h1`, zero horizontal overflow, and zero console errors. Player
redirects were also checked at both widths.

### Public and auth browser matrix

- 18 routes checked across 390, 768, 1024, and 1440 px (36 production views).
- One `h1` per page; no horizontal overflow.
- Inputs have persistent labels, not placeholder-only labels.
- No real broken images or console errors.
- The only “broken image” report is the auth-page court photo at 390 px. It is
  intentionally hidden with `hidden lg:block`, so the browser does not load it
  on mobile; the logo loads normally. This is a test false positive, not a
  product defect.

### Map

- MapLibre canvas rendered at 555 × 416 px.
- Marker and club-name popup are present.
- Attribution is visible: “OpenFreeMap © OpenMapTiles Data from OpenStreetMap”.
- No failure overlay, no loading overlay left behind, no console errors.

### Basic mobile performance

Measured on the production build at 390 × 844, with cache disabled and a
1.6 Mbps / 150 ms latency profile:

| Metric | Result |
| --- | --- |
| Largest Contentful Paint | 1,084 ms |
| Cumulative Layout Shift | 0 |
| DOMContentLoaded | 712 ms |
| Load event | 3,139 ms |
| Navigation transfer | 20,624 bytes |
| Resources | 23 |

This is a local lab measurement, not field data or a Lighthouse score. It is
consistent with a lightweight page, but it does not replace testing on real
mobile networks and devices.

## 3. Fixes made during Phase 10

- Added baseline security headers and disabled `X-Powered-By` in
  `next.config.ts`.
- Updated `eslint.config.mjs` to ignore `.tmp-ui/**` and generated
  `public/vendor/**`, so `npm run lint` no longer scans temporary QA artifacts or
  vendor output.
- Phase 9’s service-role read migration
  (`supabase/migrations/20261107000300_phase9_service_role_reads.sql`) was
  applied before this pass so the email processor can read booking data. This
  was a Phase 9 fix, not new Phase 10 product behavior.
- No booking, pricing, payment, or staff workflow was changed for Phase 10.

## 4. Checks not run or not fully run

| Item | Status | Reason |
| --- | --- | --- |
| Real guest email delivery | **Blocked** | No verified Resend sender yet; the app is ready once `RESEND_API_KEY` and a verified `EMAIL_FROM` are set. The processor caps delivery at 100/day and 3,000/month by default. |
| Email logo and links in a real inbox | **Partially unverified** | `NEXT_PUBLIC_SITE_URL` points at the Workers origin; logo and links still need a real-inbox check, and a client-facing custom domain is pending |
| 24-hour reminder and retry scheduler | **Not configured** | No platform cron or external scheduler is calling `/api/cron/email` |
| Password recovery end-to-end | **Not run** | Requires a real inbox and verified sender; the route and form exist |
| Staff write actions (approve/reject payment, block court, walk-in, cancel) | **Not repeated in this pass** | Read access and database permissions were verified; destructive production writes were intentionally avoided |
| Two simultaneous live browser requests | **Not run** | Database exclusion and capacity constraints were tested transactionally instead |
| Full keyboard and focus-trap audit | **Not run** | Basic semantics and labels checked only |
| Full WCAG audit | **Not run** | No automated axe/Lighthouse accessibility audit was performed |
| Cross-browser testing | **Not run** | Chrome only |
| Real-device testing | **Not run** | Desktop Chrome with emulated viewports only |
| Backup, restore, uptime, and error monitoring | **Not verified** | External Supabase/host configuration not inspected |
| Automated regression suite | **Not present** | The project has no test suite; verification is manual |

## 5. Launch blockers and required actions

1. **Domain and real email.** Buy/verify a sending domain, configure Resend DNS,
   set `EMAIL_FROM` and `EMAIL_REPLY_TO` to the verified domain, and send a real
   guest booking email. The current sandbox sender cannot reach guests.
2. **Public site URL.** Keep `NEXT_PUBLIC_SITE_URL` on the deployed HTTPS origin
   for testing, then switch it to the client's custom domain so email logo URLs
   and lookup links match the public site.
3. **Scheduler.** Set `EMAIL_CRON_SECRET` and schedule
   `GET /api/cron/email` every 15 minutes. Verify reminders, retries, and
   idempotency with a real provider.
4. **Official payment details.** Replace the test GCash QR and test account name
   with the club's official payment artwork and confirmed account details.
5. **Client acceptance and staff training.** Have the owner accept the booking,
   hold, cancellation, no-show, group, and payment rules, then walk staff through
   the payment and court-block flows.
6. **Production data decision.** The production project contains QA accounts and
   test bookings/payments. Decide whether to keep them as demo data or purge
   them before opening to players.
7. **Operations.** Confirm database backup retention and a restore procedure,
   plus uptime/error monitoring and who receives alerts.
8. **Deployment hardening.** Serve over HTTPS and re-check headers there. A CSP
   and HSTS were not added in this pass; evaluate them with the final host and
   MapLibre setup.

## 6. Residual risks

- **No application-level rate limiting** was found for auth or booking actions;
  the project currently relies on platform limits. Add rate limiting if abuse
  becomes a realistic risk.
- **Email is best-effort until configured.** Queued outbox rows are retained
  rather than lost, and the UI tells players the account page is the source of
  truth, but players will not receive confirmations until the domain and
  scheduler are live.
- **No automated tests.** Future changes can regress booking, RLS, or email
  behavior without a failing check.
- **No CSP/HSTS yet.** The baseline headers are present, but the final host
  should add these after validating MapLibre and Next.js asset needs.
- **Test data remains in production.** It is useful for demos but must not be
  mistaken for real player activity.

## 7. Phase 10 exit assessment

Phase 10 is complete for the scope that can be verified without a public domain,
a real inbox, and client acceptance. The core MVP behaviour is working and the
available security checks passed. The items in Section 5 are launch-gated work,
not reasons to start Phase 11.

No Phase 11, coaching, DUPR, waitlist, or other deferred feature was started.

# Production Readiness — D-Hidden Pickleball Booking System

Audit date: 15 November 2026
Environment reviewed: production Worker `bookings` at `https://bookings.dhiddenpickleball.workers.dev`, Supabase project behind it (Free plan), repository state on branch `borjir`.
Method: source review, deployment configuration review, live endpoint checks, `wrangler` deployment/secret inspection (names only), `npm audit`. No writes to production data.

## Verdict

**Technically deployable, not yet fully operationally ready.**

The application's core booking flow is well engineered: the double-booking constraint, 15-minute holds, capacity guards, payment verification, staff authorization, and database access controls were all verified as implemented and enforced. It is serving real traffic today.

What blocks a confident public launch is not the booking code — it is **operations**: the scheduled email/cleanup endpoint is not actually configured, there are no automated tests or CI, there is no verified backup/restore path, and there is no error/uptime monitoring. Those are exactly the gaps already listed as blockers in `docs/PHASE_10_QA.md`, and they remain open in production.

| Area | State | Evidence |
| --- | --- | --- |
| Core booking correctness | **Good** | Exclusion constraint, hold expiry, capacity triggers, atomic RPCs |
| Access control | **Good** | Anonymous table access denied (401), staff RPC denied, staff routes gated |
| Payment workflow | **Good, manual** | Upload → pending → staff verify; proofs private, signed URLs 600 s |
| Deployment | **Good** | Cloudflare versions, rollback available, Worker size gate in deploy script |
| Scheduled jobs | **Broken** | `/api/cron/email` and `/api/cron/storage` return 503 |
| Backup / restore | **Unverified, likely absent** | Supabase Free plan; no restore drill documented |
| Monitoring / alerting | **Absent** | Cloudflare observability logs only |
| Automated testing | **Absent** | 0 test files, no CI workflow except keep-awake |
| Capacity headroom | **Tight** | Worker at 88.8% of the free gzip limit |

---

## R1 — Email and cleanup scheduler is not functioning in production

- **Severity:** HIGH
- **Affected:** `app/api/cron/email/route.ts`, `app/api/cron/storage/route.ts`, `wrangler.jsonc`, Worker secrets
- **Status:** Confirmed live

**Evidence**

```
GET /api/cron/email   -> 503 {"error":"EMAIL_CRON_SECRET is not configured."}
GET /api/cron/storage -> 503 {"error":"EMAIL_CRON_SECRET is not configured."}
GET /api/cron/email (x-cron-secret: wrong) -> 503
```

`wrangler secret list --name bookings` shows an `EMAIL_CRON_SECRET` **name** exists, but the application reads it as empty/whitespace, so both routes refuse to run. `wrangler.jsonc` also has **no `triggers.crons` block**, so nothing on the Cloudflare side is invoking these routes. `docs/DEPLOYMENT_CLOUDFLARE.md` documents the endpoint as requiring an external scheduler, and `docs/PROJECT_STATUS.md` already records the 503 as a known issue.

**Impact**

- 24-hour reminder emails are never enqueued (`enqueue_due_booking_reminders` only runs from this route).
- Failed email sends are never retried; the outbox only drains opportunistically through `after()` on booking requests, which is best-effort and tied to the life of the request.
- Cancelled/rejected payment proofs are never purged by the automated job; the only remaining path is the manual staff button, and proofs are otherwise retained forever.
- Because the routes 503 rather than 401, an operator who wires a scheduler now will get no signal that the secret is empty until they read the response body.

**Recommended action**

Set a real secret value (`npx wrangler secret put EMAIL_CRON_SECRET`, paste a 32+ byte random value) and either point an external cron service at `/api/cron/email` every 15 minutes and `/api/cron/storage` daily, or add a Cloudflare Cron Trigger that fetches those routes with the secret. Then verify: one queued row moves to `sent`, a reminder is delivered to a real inbox, and `/api/cron/storage` returns 200.

**Complexity:** Low.

---

## R2 — No verified database backup or restore path

- **Severity:** HIGH
- **Affected:** Supabase project (Free plan), operational process
- **Status:** Unverified — no dashboard access; documented as open in `docs/PHASE_10_QA.md`

**Evidence**

The project runs on Supabase Free, which does not provide the automated daily backups or point-in-time recovery of the paid tiers. The repository contains migrations (good — schema is reproducible) but no data export job, no restore runbook, and no scheduled `pg_dump`. `docs/PHASE_10_QA.md` lists "Backup, restore, uptime, and error monitoring" as **Not verified**.

**Impact**

Bookings, customers, payment records, and payment-proof objects are the club's revenue records. A bad migration, accidental delete, or storage corruption currently has no tested recovery. Migrations alone reconstruct the schema, not the bookings or the payment proofs in Supabase Storage.

**Recommended action**

1. Confirm in the Supabase dashboard what retention the plan actually provides.
2. Add a scheduled logical export of the business tables (daily, retained 30 days) to storage outside Supabase.
3. Write and rehearse a restore runbook: schema via migrations, data via the latest export, storage objects via the bucket export.
4. Record the result in `docs/DEPLOYMENT_CLOUDFLARE.md`.

**Complexity:** Medium.

---

## R3 — No error monitoring, uptime monitoring, or alert routing

- **Severity:** MEDIUM
- **Affected:** Deployment configuration, `wrangler.jsonc` (`observability.enabled: true`)
- **Status:** Confirmed absent from the repository

Cloudflare Workers logs are enabled, but nothing aggregates errors, no alert is sent anywhere, and there is no uptime check on `/` or on the booking flow. Server errors are visible only if someone opens the Cloudflare dashboard. The GitHub workflow that keeps Supabase awake is not a monitor — it fails silently unless someone looks at Actions.

**Impact**

A broken deploy, an exhausted Mailjet quota, a Supabase pause, or a spike in payment-upload failures would be discovered by guests calling the club, not by the team. For a booking business, that is the difference between minutes and hours of lost reservations.

**Recommended action**

Add an uptime check on the homepage and `/lookup` (any free monitor), route Worker exceptions to an error tracker, and alert on: 5xx rate, cron endpoint non-200, Supabase availability, and outbox backlog. Decide who receives alerts.

**Complexity:** Low.

---

## R4 — No automated tests and no CI verification

- **Severity:** MEDIUM
- **Affected:** Repository-wide; `.github/workflows/` contains only `keep-supabase-awake.yml`
- **Status:** Confirmed (0 detected test files)

There is no unit, integration, or end-to-end test suite. Deployment is a manual `npm run deploy`, and nothing runs `tsc`, `eslint`, or the Worker size check before a deploy except the deploy script itself (size check only). Verification has been manual throughout, as recorded in `docs/PHASE_10_QA.md`.

**Impact**

The highest-risk logic — pricing by day/time, hold expiry, group booking atomicity, capacity, cancellation cutoff, payment state transitions — has no regression protection. A future change to the pricing SQL or the booking RPC can silently break revenue calculations.

**Recommended action**

Start with a small number of high-value tests rather than a broad suite: pricing boundaries (5:00 PM weekday, weekend all day), hold expiry release, double-booking rejection (`23P01`), capacity on restore, and cancellation cutoff. Add a CI workflow running `tsc --noEmit`, `eslint`, `npm run build`, and the Worker size check on pull requests. Database logic can be tested against a local Supabase instance.

**Complexity:** Medium.

---

## R5 — Email delivery is best-effort and quota-bound

- **Severity:** MEDIUM
- **Affected:** `lib/email/process.ts`, `lib/email/events.ts`, Mailjet configuration
- **Status:** Partially verified; deliverability not tested

Confirmation emails are triggered from server actions through `after(() => processEmailOutbox(...))`. Claiming uses a `FOR UPDATE SKIP LOCKED`-style RPC, which is correct for concurrency. But `after()` work is tied to the request lifecycle; if the isolate is recycled or the send times out, the row stays queued until some other request or the (currently broken) cron drains it. Mailjet Free allows 200 sends/day and 6,000/month; the app tracks daily/monthly counters.

**Impact**

Guests may book successfully but receive no confirmation, which is the club's main channel for the QR pass and payment instructions. The failure is silent to the guest and to staff unless they check the outbox.

**Recommended action**

Fix R1 so the cron retries the queue; add a staff-visible "emails waiting" indicator or alert when the oldest queued row is older than 15 minutes; verify the sender domain (SPF/DKIM) and send a real booking email to a Gmail and an Outlook address.

**Complexity:** Low–Medium.

---

## R6 — Payment-proof storage grows without bound

- **Severity:** MEDIUM
- **Affected:** `lib/storage/proofs.ts`, `supabase/migrations/20261107000200_phase9_email_outbox.sql`
- **Status:** Confirmed by code and policy comment

The club decided that proofs are kept permanently except for cancelled/rejected/voided records. The Supabase Free plan provides 1 GB of Storage, separate from the 500 MB database. At roughly 108 KB per screenshot, the bucket fills at on the order of 9,000 proofs. The only automatic deletion path is the cron endpoint that currently returns 503 (R1).

**Impact**

Storage exhaustion is a slow-motion outage: uploads start failing and guests cannot submit payment proof. Because the purge job is not running, cancelled-booking proofs accumulate too.

**Recommended action**

Fix the cron (R1) so discarding proofs actually runs; add a storage-usage threshold alert at 70/85/95%; decide on an archival policy for completed bookings; report current usage on the staff reports page (already implemented) and make it visible to the owner monthly.

**Complexity:** Low.

---

## R7 — Free-plan platform limits create two availability risks

- **Severity:** MEDIUM
- **Affected:** Supabase Free (pause after inactivity), Cloudflare Workers Free (100k requests/day, 10 ms CPU per invocation)
- **Status:** Mitigated by design, but fragile

- Supabase pauses a Free project after about a week of low database activity. `.github/workflows/keep-supabase-awake.yml` pings the Data API four times a day with the public key. That workflow depends on GitHub Actions remaining enabled: GitHub disables scheduled workflows on public repositories after 60 days without repository activity.
- Workers Free gives 10 ms CPU per invocation. The codebase already reflects this (prerendered pages served from the asset cache, the proxy deliberately skipping public routes, `cacheComponents` disabled). One comment records that a previous attempt to enable Cache Components caused every request to return 500.

**Impact**

A paused database takes the booking site down until manually resumed; a CPU overrun appears as a 500 to a guest. The system is tuned for these limits, but the margin is thin and the mitigations are external.

**Recommended action**

Replace or duplicate the keep-awake ping with an external uptime monitor that also alerts; document the resume procedure; keep the prerender-first architecture intact when adding pages.

**Complexity:** Low.

---

## R8 — Concurrency and duplicate-submission handling is solid

- **Severity:** INFORMATIONAL (positive)
- **Status:** Confirmed by design review

- `court_reservations` uses a GiST exclusion constraint on `(court_id, tstzrange)`; the guest API maps `23P01` to "that time was just taken", so a race becomes a clear message instead of a double booking.
- `create_guest_court_booking_group` creates the group and items inside one plpgsql transaction with an `exception` block, so a partial group cannot commit.
- Open-play capacity is checked under `SELECT … FOR UPDATE` on the session row, and a trigger re-checks capacity when a registration is restored.
- Expired holds are released lazily on availability reads and on booking creation, so slots do not stay stuck when no scheduler is running.
- Payment confirmation refuses when the hold has expired (`prevent_expired_hold_confirmation`).
- Turnstile tokens are single-use and validated for action and hostname.

The remaining duplicate-submission surface is application-level (double-click on a server action), mitigated by a single active hold per customer and by the redirect/refresh after success.

---

## R9 — Deployment and rollback

- **Severity:** INFORMATIONAL (positive)
- **Status:** Confirmed

`wrangler deployments list` shows a versioned history; `17cfea5b` is at 100% of traffic. Rolling back to a previous version is a single `wrangler rollback` and does not require a rebuild. Migrations are additive and idempotent in most places (`create table if not exists`, `on conflict do nothing`), and the latest schema change (`sync_open_play_session_times`) was applied without downtime.

Caveat: there is no staging environment. Every deploy is production, and there is no smoke test after deploy beyond manual checks.

**Recommended action**

Add a post-deploy smoke script: `/`, `/book`, `/lookup`, `/open-play`, `/staff` redirect, `/api/version`, and one Supabase read. Run it automatically after `wrangler deploy`.

**Complexity:** Low.

---

## Operational checklist before opening to the public

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| 1 | Set a real `EMAIL_CRON_SECRET` and schedule `/api/cron/email` (15 min) + `/api/cron/storage` (daily) | Dev | Open (R1) |
| 2 | Send a real booking email to Gmail/Outlook; confirm SPF/DKIM on the sender domain | Dev + client | Open (R5) |
| 3 | Decide and document backup retention; rehearse a restore | Dev | Open (R2) |
| 4 | Add uptime + error alerting, name the alert recipient | Dev | Open (R3) |
| 5 | Add CI (typecheck, lint, build, worker size) | Dev | Open (R4) |
| 6 | Close the direct anon-RPC bypass (Security S1) | Dev | Open |
| 7 | HSTS + report-only CSP (Security S3) | Dev | Open |
| 8 | Disable public signup, raise password policy, consider MFA (Security S4) | Dev | Open |
| 9 | Remove test bookings/accounts or accept them as demo data | Client | Open |
| 10 | Staff training on payment review, voids, and closures | Client | Open |

## Remaining risks after the checklist

- Single region, single Worker, no queue: a Supabase outage or a Cloudflare incident takes the site down; the business needs a phone fallback.
- Manual GCash verification means payment confirmation depends on staff availability.
- Free-plan limits (storage, Worker CPU, DB size) will be reached as the club grows; the trigger points are known but not monitored.
- The absence of automated tests will keep regression risk elevated until the small high-value suite exists.

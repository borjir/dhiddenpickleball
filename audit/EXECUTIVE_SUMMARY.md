# Executive Summary — Production Audit

**Application:** D-Hidden Pickleball Court & Bistro booking system
**Live at:** https://bookings.dhiddenpickleball.workers.dev
**Audit date:** 15 November 2026
**Scope:** security, performance, reliability, and production readiness of the deployed system and its source. Audit only — no application code was changed.

## Overall assessment

The booking engine itself is in good shape. Access control is correctly layered, the database enforces the rules that matter, and the deployment is fast. The risks that matter are operational: the scheduled email/cleanup job does not run in production, there is no verified backup or restore path, there is no monitoring, and there is no automated testing. On top of that, one genuine authorization gap lets anyone with the public website key call the guest booking functions directly, bypassing the bot check and every rate limit the app has.

**Security:** reasonable posture with one high-severity abuse vector. Passwords, sessions, staff gating, storage privacy, and row-level security were all verified working; the missing piece is a server-side trust boundary around anonymous database functions.
**Performance:** strong server response times (85–130 ms TTFB on public pages) and correct caching/compression. The homepage pays ~437 KB of extra JavaScript for a map that most visitors never see, and the Worker bundle is at 89% of the Cloudflare free size limit.
**Reliability:** the hard parts (double-booking, capacity, holds, payment state) are handled correctly. The soft parts (scheduler, backups, alerts, tests) are not.

## Severity summary

| Severity | Security | Performance | Reliability / readiness |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 1 | 1 | 2 |
| Medium | 4 | 3 | 4 |
| Low | 5 | 3 | 0 |

## Critical and high-priority findings

1. **Anonymous callers can bypass Turnstile and all rate limits (HIGH, security).**
   The guest RPCs — create booking group, create open-play registration, lookup record — are granted to the anonymous role, and the public key needed to call them ships in the browser bundle. A live probe confirmed the lookup RPC executes directly against Supabase. Someone can hold every court slot indefinitely, fill open play, or brute-force lookups without ever loading the website. This is the top priority.

2. **The scheduled email and cleanup job is not running (HIGH, reliability).**
   `/api/cron/email` and `/api/cron/storage` both return 503 "EMAIL_CRON_SECRET is not configured" in production, and the Worker has no cron trigger. Booking confirmation emails rely on best-effort background work; 24-hour reminders are never queued; cancelled-booking payment proofs are never purged. Booking core still works — this is a communication and cleanup failure, not a lost-booking failure.

3. **No verified backup or restore path (HIGH, reliability).**
   The project is on Supabase Free, which does not include the paid tiers' automated backups. The schema is reproducible from migrations; the bookings, customers, payments, and uploaded proof images are not. A bad migration or accidental deletion currently has no tested recovery.

4. **Worker bundle is at 88.8% of the free plan limit (HIGH, release risk).**
   `2,727.98 KiB` gzip against a `3,072 KiB` ceiling. Roughly 344 KiB of headroom means one ordinary dependency can block the next deploy. Not a user-facing problem today; a delivery problem soon.

5. **Homepage loads a map library it doesn't need yet (MEDIUM–HIGH, performance).**
   ~301 KB Brotli of MapLibre plus ~147 KB of map worker code is fetched during hydration for a map far below the fold. Initial JS doubles from ~256 KB to ~690 KB Brotli. Gating the map on visibility is a small change with the largest real user-facing gain.

## Most important recommended improvements

| Priority | Change | Effort |
| --- | --- | --- |
| 1 | Revoke anonymous execution of the guest RPCs; call them from Turnstile-protected server code with the service role | Medium |
| 2 | Set a real cron secret and schedule the two endpoints (or add a Cloudflare Cron Trigger) | Low |
| 3 | Decide backup retention, add a daily export, rehearse a restore | Medium |
| 4 | Add uptime monitoring, error alerting, and a named alert recipient | Low |
| 5 | Gate the homepage map behind visibility | Low |
| 6 | Add HSTS now and a report-only CSP; disable public signup and raise the staff password policy | Low–Medium |
| 7 | Add a small high-value test suite and CI (typecheck, lint, build, Worker size) | Medium |
| 8 | Align the 5 MB upload limit with the 2 MB bucket limit; remove unused 1.2 MB logo and dev assets | Low |

## Suggested remediation order

1. **This week — security and availability:** close the anon-RPC bypass, add durable rate limiting, set up the cron.
2. **Next — operational safety:** backups and restore drill, uptime/error alerts, post-deploy smoke check.
3. **Then — hardening and speed:** HSTS + CSP, staff auth policy/MFA, map lazy-loading, Worker size budget in CI.
4. **Ongoing — confidence:** test suite for pricing/holds/capacity, dependency refresh, storage-usage review.

## What is working well (verified, not assumed)

- Anonymous access to every business table is denied at the grant level (**401** on all nine sensitive tables).
- Staff RPCs reject the anonymous role (**401 / permission denied**); `/staff` redirects to sign-in (**307**) and is re-checked server-side.
- The payment-proof bucket is private; staff see files through 600-second signed URLs only.
- Double booking is prevented by a database exclusion constraint, not application logic; open-play capacity is checked under a lock and re-checked by a trigger.
- Turnstile is validated correctly (action + hostname, test keys refused in production), and the auth callback is protected against open redirects.
- Production dependencies have **no known vulnerabilities**; source maps are not served; `.env.local` is ignored and no secrets are tracked.
- Brotli, immutable static caching, and prerendered page caching are all configured properly; TTFB on public pages is 85–130 ms.

## Production readiness verdict

**Ready to keep serving the club's current, small volume; not yet ready to expand the user base.**

The booking mechanics and the data-access boundaries are trustworthy. Launching more aggressively without fixing the scheduler, backups, monitoring, and the anonymous-RPC gap would mean discovering problems through guest complaints and having no recovery path when one becomes serious.

## Audit limitations

- No staff session was used, so authenticated UI and cookie attributes were not exercised.
- No Supabase dashboard access: hosted Auth settings, plan features, backups, and storage usage were inferred from repository configuration and public plan terms, and are marked unverified where relevant.
- No browser performance tracing, Lighthouse run, load test, or penetration test was performed; findings are from source review, measured asset/transfer sizes, deployed response headers, and read-only API probes.
- Payment-proof upload and other write flows were deliberately not exercised against production.

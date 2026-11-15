# Security Audit — D-Hidden Pickleball Booking System

Audit date: 15 November 2026
Deployed target: `https://bookings.dhiddenpickleball.workers.dev` (Worker `bookings`, version `17cfea5b-e11a-49a3-9323-1dd7455bf8e3`)
Method: source review, migration review, read-only HTTP probes against the deployed site and the Supabase Data API, `npm audit`. No destructive testing, no load testing, no exploitation beyond a benign invalid-credential lookup.

## Scope and architecture

| Layer | Technology |
| --- | --- |
| Frontend/SSR | Next.js 16.4 (App Router, RSC, server actions), React 19.3, Tailwind 4 |
| Hosting | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare` 1.20), static assets served from the Cloudflare asset layer |
| Auth | Supabase Auth, `@supabase/ssr` cookies, staff-only sign-in |
| Database | Supabase Postgres (Free plan), 17 tables, RLS + ~58 SQL functions, 21 RPC entry points |
| Storage | Supabase Storage, private `payment-proofs` bucket, staff-only signed URLs |
| Email | Mailjet (Resend still configured), outbox table processed by `after()` and `/api/cron/email` |
| Bot protection | Cloudflare Turnstile on booking, lookup, and payment-proof upload |
| Payments | Manual GCash transfer + staff verification (no payment gateway) |

Public surface: `/`, `/courts`, `/courts/[slug]`, `/club/*`, `/policies/*`, `/book`, `/lookup`, `/open-play`, `/open-play/[id]`, `/visit`, `/api/payment-proof`, `/api/version`.
Authenticated surface: `/staff/**`, `/notifications`, `/api/cron/*` (shared secret), `/staff/reports/export`.

## Summary

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 1 |
| Medium | 4 |
| Low | 5 |
| Informational | 4 |

The core authorization design is sound and was verified live: anonymous callers are denied at the grant level on every business table, staff RPCs reject the anonymous role, the proof bucket is private, and Turnstile results are validated for action *and* hostname. The material weaknesses are around **edge rate limiting of the public guest RPCs** and **production account/transport hardening**, not around broken access control.

---

## S1 — Public guest RPCs are callable directly with the shipped key, bypassing Turnstile and application throttles

- **Severity:** HIGH
- **Affected:** `supabase/migrations/20261108000100_guest_booking_no_player_accounts.sql` (grants to `anon`), `app/lookup/actions.ts`, `app/book/actions.ts`, `app/open-play/actions.ts`, `app/api/payment-proof/route.ts`
- **Status:** Confirmed (code + live probe)

**Evidence**

The guest entry points are explicitly granted to `anon`:

```sql
grant execute on function public.create_guest_court_booking_group(jsonb, text, text, text) to anon, authenticated;
grant execute on function public.create_guest_open_play_registration(uuid, text, text, text) to anon, authenticated;
grant execute on function public.lookup_guest_record(text, text) to anon, authenticated;
```

Turnstile is enforced only inside the Next.js server actions and the upload route (`verifyTurnstile(...)`), and the lookup throttle lives in module memory:

```ts
const attempts = new Map<string, { count: number; resetAt: number }>();
```

A read-only probe against the production Supabase Data API, using only the publishable key that ships in the browser bundle, executed the lookup RPC and returned the function's own validation error:

```
POST /rest/v1/rpc/lookup_guest_record  ->  400 {"code":"22023","message":"That reference and mobile number do not match a booking."}
```

That response proves the RPC ran. The same path exists for the booking and open-play RPCs, which are reachable by any script that reads the publishable key out of the JS bundle (`NEXT_PUBLIC_*` is public by design).

**Impact**

- Unauthenticated booking/hold spam: each call to `create_guest_court_booking_group` inserts a customer row, a booking group and up to 8 bookings that reserve the courts for the 15-minute hold window. Continuing this keeps every court slot unavailable — a cheap availability denial of service against real guests, plus unbounded row growth on a 500 MB free database.
- Open-play capacity can be filled the same way.
- Lookup brute force: references are `HP-` + 8 hex characters (~32 bits) and the second factor is the mobile number. Without any server-side throttle, a script can attempt far more than the 12-per-10-minutes the app intends.
- Storage/cost abuse through repeated proof uploads is partly limited by Turnstile on the route, but the booking and lookup paths are not.

**Recommended solution**

1. Move guest entry points behind a server-only boundary and revoke `anon` execution: keep the RPCs but grant them to `service_role`, then call them from server actions/route handlers that have already passed Turnstile and a durable rate limiter. The publishable key can no longer reach them directly.
2. If RPCs must stay anon-callable, add server-side limits inside Postgres (per-IP/per-mobile counters table, or Cloudflare edge rate-limiting rules on `/rest/v1/rpc/*` via a Worker in front) — not module memory.
3. Add a Cloudflare rate-limiting rule on the Supabase hostname at the edge, or front the Supabase API with a Worker that enforces Turnstile and per-IP quotas.
4. Reject guesses earlier: increase reference entropy and/or require a short-lived signed lookup token instead of raw reference+mobile.

**Complexity:** Medium.

---

## S2 — Rate limiting is per-isolate and therefore ineffective in production

- **Severity:** MEDIUM
- **Affected:** `app/lookup/actions.ts` (`attempts`, `refreshAttempts` maps)
- **Status:** Confirmed by code; effect is inherent to Cloudflare Workers

**Evidence**

```ts
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_LOOKUP_ATTEMPTS = 12;
```

Workers run many isolates, each with its own memory, and isolates are evicted at will. A caller distributed across isolates, or simply hitting a fresh isolate, gets a fresh budget. The `refreshGuestRecord` path (used by the 30-second status poll) has no Turnstile at all — only this map (60 attempts/10 min) — so it is a direct lookup oracle once a reference is known.

**Impact**

Brute-force and enumeration limits are weaker than the code implies; the practical protection is only the 32-bit reference plus mobile number.

**Recommended solution**

Replace both maps with a durable limiter: a Postgres table (`lookup_attempts`) or Cloudflare's rate-limiting binding (Durable Object / KV), keyed by IP and by reference. Keep the existing maps only as a first-pass local shortcut.

**Complexity:** Medium.

---

## S3 — Missing Content-Security-Policy and HSTS headers

- **Severity:** MEDIUM
- **Affected:** `next.config.ts` (`headers()`), deployed responses
- **Status:** Confirmed (live headers)

**Evidence**

Deployed response for `/`:

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

No `Content-Security-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, or `X-Permitted-Cross-Domain-Policies`. `docs/PHASE_10_QA.md` records CSP/HSTS as deliberately deferred.

**Impact**

Without CSP, any injected script (a future XSS, a compromised third-party asset, or an unsafe-inline sink) runs with full privileges, including access to Supabase session cookies. Without HSTS, a custom domain added later would be downgrade-attackable on first visit. `*.workers.dev` is HSTS-preloaded by browsers, which currently masks the missing header — that protection disappears the moment the club's own domain is connected.

The app renders one inline script (theme bootstrap in `app/layout.tsx`, `dangerouslySetInnerHTML`), so a CSP will need a nonce or hash for that script; MapLibre also needs `worker-src`/`blob:` allowances.

**Recommended solution**

Add to `next.config.ts` headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains` for the production host, and a report-only CSP first (`default-src 'self'; script-src 'self' 'nonce-…'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`). Move the theme script to a nonce or external file. Roll to enforcing once violations are clear.

**Complexity:** Medium.

---

## S4 — Staff authentication hardening depends on dashboard settings that are not verifiable from the repository

- **Severity:** MEDIUM
- **Affected:** `supabase/config.toml`, staff accounts in Supabase Auth
- **Status:** Potential — configuration is under version control but the deployed project's Auth settings were not inspected (no dashboard access during this audit)

**Evidence**

The committed config allows weak credentials and no second factor:

```toml
enable_signup = true
minimum_password_length = 6
password_requirements = ""
[auth.mfa.totp]
enroll_enabled = false
```

Sign-in is a browser call to `supabase.auth.signInWithPassword` with no captcha, no lockout, and no MFA challenge (`components/auth/sign-in-form.tsx`). The app does correctly sign non-staff accounts straight back out and gates `/staff` in the proxy and in `requireStaff()`.

**Impact**

These accounts approve payments and can void bookings, so a single reused or weak staff password is a direct financial-control risk. If the hosted project mirrors this config, there is no lockout, no complexity rule, and no MFA.

**Recommended solution**

In the Supabase dashboard (and in `config.toml` so it stays consistent): disable public signup, raise the minimum password length to 12, require `lower_upper_letters_digits_symbols`, and enable TOTP MFA for staff (Pro plan feature). Add the Turnstile captcha to the Auth sign-in flow (`[auth.captcha]`) or front sign-in with the Worker. Verify the hosted values before changing code.

**Complexity:** Low (configuration), Medium for MFA rollout.

---

## S5 — Payment-proof upload trusts the client-declared MIME type

- **Severity:** LOW
- **Affected:** `app/api/payment-proof/route.ts`
- **Status:** Confirmed by code

**Evidence**

```ts
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
};
const extension = MIME_EXT[file.type];
```

The extension and stored `Content-Type` come from the multipart part header. There is no magic-byte check. Mitigations already in place: the bucket is private, uploads go through the service role, staff view via 600-second signed URLs, and the SQL function verifies the object path belongs to the booking.

**Impact**

A renamed HTML/SVG/polyglot file could be stored and later served from the Supabase Storage origin with an attacker-chosen content type. Because the bucket is private and the path is not guessable, the practical XSS/download risk is low, but staff do open these files.

**Recommended solution**

Sniff the first bytes (`ff d8 ff`, `89 50 4e 47`, `52 49 46 46…57 45 42 50`, `25 50 44 46`) before upload and reject mismatches. Serve proofs with `Content-Disposition: attachment` where the viewer allows it.

**Complexity:** Low.

---

## S6 — Upload limit mismatch (5 MB route vs 2 MB bucket)

- **Severity:** LOW (functional, with a small support burden)
- **Affected:** `app/api/payment-proof/route.ts` (`MAX_BYTES = 5 * 1024 * 1024`) vs `supabase/migrations/20261107000100_payment_proof_storage_limit.sql` (`file_size_limit = 2097152`)
- **Status:** Confirmed by code

**Evidence**

The route accepts files up to 5 MB and validates only that ceiling; the bucket enforces 2 MB. A 2–5 MB PDF or photo passes the route check and fails at the storage call, which is reported to the guest as "The file could not be uploaded. Try again." — a retry loop that cannot succeed.

**Impact**

Guests with larger screenshots or PDFs cannot submit proof; they must contact the club. Not a security exposure.

**Recommended solution**

Align the constant to the bucket limit and state the real limit in the UI ("under 2 MB"), or raise the bucket limit if storage budget allows. Client-side compression already exists for images; PDFs bypass it.

**Complexity:** Low.

---

## S7 — Cron endpoints are protected by a shared secret but the secret compares with `===`

- **Severity:** INFORMATIONAL
- **Affected:** `app/api/cron/email/route.ts`, `app/api/cron/storage/route.ts`
- **Status:** Confirmed by code

Both routes require a bearer/`x-cron-secret` value equal to `EMAIL_CRON_SECRET`, return 503 when it is unset, and 401 otherwise. The comparison is not constant-time, but the value is high-entropy, compared over the network, and the endpoints are cheap to deny — timing leakage is not practically exploitable here. No action required beyond keeping the secret rotated if it is ever shared with a third-party scheduler.

---

## S8 — Publicly readable reference tables expose operational detail

- **Severity:** LOW
- **Affected:** RLS policies `court_closures_public_read` and `court_hours_public_read` (using `true`)
- **Status:** Confirmed by code and live probes (`/rest/v1/court_closures` returns 200 for anon)

**Impact**

Closure reasons ("Private event", "Maintenance — owner") and full operating hours are anonymously readable. This is business-operational information, not customer PII, and it is arguably appropriate for a public booking site. Listed only so the decision is explicit.

**Recommended solution**

If the club prefers not to publish closure reasons, restrict the anon policy to the time range and omit `reason` via a public view.

**Complexity:** Low.

---

## S9 — Unused/temporary artifacts are publicly reachable and one is tracked in git

- **Severity:** LOW
- **Affected:** `public/courts/pickleball2.jpg` (945 KB), `public/logo/hidden-pickleball.png` (1.19 MB), `.open-next/assets/_next/static/media/maplibre-gl-dev*.mjs` (3.6 MB of dev bundles), `.cf-tmp.json`
- **Status:** Confirmed (HTTP 200 for the images; `git ls-files` shows `.cf-tmp.json`)

`.cf-tmp.json` contains only Cloudflare Workers analytics (hourly request counts) and no credentials, so it is a housekeeping issue rather than a leak.

**Recommended solution**

Delete the unused public files and the tracked temp file, and ensure dev-only MapLibre artifacts are excluded from the deployed asset directory. Re-check `run_worker_first` exact paths in `wrangler.jsonc` when files are removed.

**Complexity:** Low.

---

## S10 — Build-time dependency advisories (dev only)

- **Severity:** LOW
- **Affected:** `@opennextjs/cloudflare` → `@node-minify/core` → `glob`; `eslint-config-next` → `typescript-eslint` → `minimatch`
- **Status:** Confirmed via `npm audit`

```
@opennextjs/cloudflare | high | direct | @opennextjs/aws ; glob
glob                   | high | transitive | CLI command injection via -c/--cmd (dev tooling)
minimatch              | moderate | transitive | globparts amplification DoS (lint tooling)
```

Production dependencies are clean: `npm audit --omit=dev` reports **0** vulnerabilities. The advisories affect build/lint tooling where the attacker would have to control CLI arguments or lint input.

**Recommended solution**

Track an `@opennextjs/cloudflare` release that bumps `glob`, and update `eslint-config-next` when convenient. Do not force-upgrade mid-release cycle.

**Complexity:** Low.

---

## S11 — Informational observations

1. **No source maps served** — `/_next/static/chunks/*.js.map` returns 404. Good.
2. **`/api/version` reveals the build id** (`{"buildId":"bmwhnmhqk"}`). Harmless; it is the feature's purpose.
3. **The public homepage is `noindex`** (`app/page.tsx` sets `robots: { index: false }`), and there is no `robots.txt` or sitemap. This is an SEO/marketing issue, not security, but it is surprising for the club's primary landing page.
4. **`.env` hygiene is correct** — `.env.local` is ignored, only `.env.example` is tracked, and it contains no service-role key. The publishable key in it is public by design.

---

## Controls verified as working (evidence)

| Control | Evidence |
| --- | --- |
| Anonymous access to business tables denied | `GET /rest/v1/{customers,bookings,payments,notifications,email_outbox,audit_logs,booking_groups,open_play_registrations,profiles}` all return **401 / 42501** with the publishable key |
| Anonymous writes to settings denied | `PATCH /rest/v1/club_settings` → **401 / 42501** |
| Anonymous staff RPC denied | `POST /rest/v1/rpc/staff_void_payment` → **401 / permission denied for function** |
| Role escalation blocked | `profiles_prevent_role_escalation` trigger + column-level grants (`full_name`, `phone` only) |
| Staff route gate | `/staff` → **307** to `/staff-access?notice=session-expired`; `requireStaff()` re-checks the profile role server-side |
| Staff-only export | `app/staff/reports/export/route.ts` calls `requireStaff()` before generating the workbook |
| Proof bucket private | `public = false`; staff read via `createSignedUrl(path, 600)`; owner policies dropped |
| Turnstile validated properly | action and hostname both checked; test secrets rejected in production; 10 s timeout |
| Open-redirect protection | `safeNextPath()` rejects absolute, protocol-relative, backslash, and auth-page targets |
| Double-booking prevented | Postgres GiST exclusion constraint on active reservations (`23P01` surfaced to guests) |
| Service-role key never client-side | `lib/supabase/admin.ts` is the only importer, server-only; no `NEXT_PUBLIC_` prefix |
| No dependency CVEs in runtime deps | `npm audit --omit=dev` → 0 |

## Could not be verified

- Hosted Supabase Auth settings (signup, password policy, MFA, JWT lifetime) — no dashboard access. Only the committed `config.toml` was reviewed.
- Session cookie attributes (`HttpOnly`/`Secure`/`SameSite`) on a real staff session — no staff credentials were used, and no test account was created.
- Cloudflare WAF/rate-limiting rules at the zone level — not inspectable with the available token.
- Real payment-proof upload end-to-end (would write production data).
- Email deliverability and sender authentication (SPF/DKIM) — depends on the Mailjet/Resend domain configuration, not the repository.

## Suggested remediation order

1. S1 — close the direct-RPC bypass (highest real-world risk).
2. S2 — durable rate limiting.
3. S3 — HSTS now, CSP report-only next.
4. S4 — disable signup, raise password policy, enable MFA.
5. S6, S5, S9 — small correctness/hygiene fixes.
6. S10 — routine dependency refresh.

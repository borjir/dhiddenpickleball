# Phase 4 — Database, Authentication, Permissions, and Security

**Date:** 4 November 2026
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md` v2.5, Phase 4
**Status:** Complete. Schema, RLS, roles, and auth are applied to the hosted
project `ybgcktpyntpcragegwec`. Email/password sign-up, confirmation, sign-in,
and Google sign-in are confirmed working by the project owner. Anonymous access
probes match the applied migration exactly. Two runtime checks are deferred:
overlapping-booking rejection (naturally exercised in Phase 7) and an end-to-end
password-recovery email.

## Scope actually implemented

Phase 4 establishes the data and identity foundation:

- Supabase Postgres migrations for profiles, roles, club settings, courts,
  operating hours, closures, services, rates, bookings, court reservations,
  payments, and audit logs.
- Row-level security (RLS), column grants, and a private `payment-proofs` bucket.
- Database functions for trusted booking creation, overlap prevention, amount
  calculation, hold expiry, profile creation, and audit writing.
- Email/password authentication, Google OAuth, email confirmation, password
  recovery, and session refresh through Supabase SSR.
- Auth screens and a signed-in account smoke test.
- Player and staff roles only, with manual staff promotion.

### Explicitly not implemented

These remain outside this phase and outside the MVP until their rules are
confirmed:

- Open-play sessions, registrations, capacity, or waitlists.
- Attendance and check-ins.
- Coaching, coach profiles, and appointments.
- DUPR identity, matches, or API integration.
- Payment proof upload/review workflows beyond the schema and private bucket.
- Staff dashboard actions and the staff navigation.
- Booking history, profile editing, and the full account area.
- The real booking flow; `/design-preview/booking` is still local preview state.

No speculative tables or routes were created for those deferred areas.

## Decisions applied

| Decision | Applied value |
| --- | --- |
| Roles | `player` and `staff` only; no manager/admin |
| New account default | `player` |
| Staff promotion | Manual Supabase SQL; no self-promotion or app control |
| Auth methods | Email/password and Google OAuth |
| Email verification | Required; Supabase email confirmation stays on |
| Password rule (working) | 8–72 characters; not a client-approved policy |
| Sessions | `@supabase/ssr` cookies, refreshed by the Next.js 16 proxy with `getClaims()` |
| Password recovery | Single-use email link and dedicated reset screen |
| Staff MFA | Not implemented; remains a Phase 8/open security question |
| Timezone | `Asia/Manila` |
| Court rates | ₱250/hour before 5:00 PM; ₱300/hour from 5:00 PM |
| Hold | 15 minutes; payment deadline uses the same window |
| Unknown booking rules | Weekend rate, rounding, buffer, booking window, closures, and max players remain unenforced/unseeded |

## Database migrations

Run in order through `npx supabase db push`:

1. `supabase/migrations/20261104000100_phase4_core.sql`
   - `user_role` enum (`player`, `staff`)
   - `profiles`, `club_settings`, `courts`, `court_operating_hours`,
     `court_closures`, `services`, `service_rates`
   - `set_updated_at`, `handle_new_user`, `handle_user_email_update`,
     `prevent_profile_role_escalation`, `is_staff`
   - Seeds: two courts, daily 7:00 AM–12:00 AM hours, court-rental service,
     two confirmed hourly rates, and a single club-settings row
2. `supabase/migrations/20261104000200_phase4_bookings.sql`
   - `booking_status`, `payment_status`, `payment_method`, `booking_source`,
     `reservation_status` enums
   - `bookings`, `court_reservations`, `payments`, `audit_logs`
   - Overlap exclusion constraint on active court reservations
   - `create_court_booking`, `calculate_court_amount`, `expire_stale_holds`
   - Audit triggers for operational tables and role changes
3. `supabase/migrations/20261104000300_phase4_rls.sql`
   - RLS enabled on all application tables
   - Grants and policies for public reference data, own-profile access,
     own-booking access, staff operations, and staff-only audit reads
   - Private `payment-proofs` bucket with owner-folder upload/read and
     staff read/delete policies
   - Function execute grants restricted to authenticated/service roles

### Booking integrity

The browser does not write bookings directly. `create_court_booking` is a
`security definer` function that:

- Requires an authenticated actor.
- Lets staff book for another player; players can only book for themselves.
- Rejects past starts and durations that are not a supported whole-hour range
  (60/90/120, or 3–17 whole hours after the 6 November range update).
- Checks active court, operating hours, and closures.
- Uses the confirmed rate windows and pro-rates a booking across 5:00 PM.
- Creates the booking and active court reservation together.
- Relies on a GiST exclusion constraint, not a frontend check, to reject
  overlapping active reservations.
- Returns a friendly `23P01` message when the slot is already taken.

`expire_stale_holds` releases expired pending holds and is staff/service-only.
A scheduled caller can be connected in a later phase.

### Role protection

- `profiles.role` is not in the authenticated column grant.
- The own-profile update policy permits only the owner's row.
- `prevent_profile_role_escalation` raises when an authenticated session changes
  a role or profile id.
- Manual SQL promotion is allowed because SQL-editor sessions have no
  `auth.uid()`. Role changes are written to `audit_logs`.

## Application code

### Supabase clients

- `lib/supabase/env.ts` — reads only the public URL and publishable key; rejects
  placeholder values.
- `lib/supabase/client.ts` — browser client.
- `lib/supabase/server.ts` — request-scoped server client; failed cookie writes
  from Server Components are ignored because the proxy owns refreshes.
- `lib/supabase/proxy.ts` — refreshes the session with `getClaims()` and does not
  take the public site down if Auth is unreachable.
- `proxy.ts` — Next.js 16 proxy entry and static-asset exclusions.

Only these values belong in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

A service-role/secret key is **not** used by the app and must never be placed in
a `NEXT_PUBLIC_*` variable or committed.

### Routes and screens

| Route | Purpose |
| --- | --- |
| `/sign-in` | Email/password sign-in plus Google OAuth |
| `/sign-up` | Account creation, Google OAuth, email-confirmation state, resend |
| `/forgot-password` | Request a single-use recovery link |
| `/reset-password` | Choose a new password; rejects missing/expired sessions |
| `/auth/callback` | PKCE code exchange and `token_hash` verification |
| `/auth/confirm` | Alias for email templates that point directly at the app |
| `/auth/auth-code-error` | Friendly provider/link failure screen |
| `/account` | Signed-in identity, role, email verification, and sign-out |

The site header now shows **Sign in** or **My account** depending on the session,
with the same link in the mobile menu. `/account` redirects unauthenticated
visitors to `/sign-in?next=/account`.

Shared auth pieces live in `components/auth/`:

- `auth-shell.tsx`, `auth-top-bar.tsx`, `auth-form-skeleton.tsx`
- `sign-in-form.tsx`, `sign-up-form.tsx`, `sign-out-button.tsx`
- `forgot-password-form.tsx`, `reset-password-form.tsx`
- `auth-link.tsx`, `auth-code-error.tsx`, `config-notice.tsx`
- `google-button.tsx`, `google-icon.tsx`, `or-divider.tsx`

Validation and error copy:

- `lib/validation/auth.ts` — Zod schemas and field-error mapping.
- `lib/auth/errors.ts` — Supabase Auth codes mapped to actionable copy.
- `lib/auth/redirect.ts` — same-site-only `next` paths.
- `lib/auth/callback.ts` — shared confirmation/OAuth handler.

## Required external setup

These steps cannot be done from the repository alone.

1. **Create the hosted Supabase project.** Suggested name
   `d-hidden-pickleball-dev`, region Southeast Asia (Singapore).
2. **Copy the public keys** from Project Settings → API into `.env.local`, using
   `.env.example` as the template.
3. **Enable Email auth.** Keep email confirmation on. Set the Site URL to
   `http://localhost:3000` for development.
4. **Add redirect URLs** in Supabase Auth:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/confirm`
5. **Configure Google OAuth.** In Google Cloud Console, create a Web application
   OAuth client with this authorized redirect URI:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   Enable the Google provider in Supabase and paste the client ID/secret there.
   The secret stays in Supabase, not in this repository. While the Google consent
   screen is in Testing mode, add test users explicitly. Privacy and terms pages
   are still open (`D-20`).
6. **Link and push the migrations:**

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

7. **Promote staff manually** in the Supabase SQL editor after the staff account
   has signed up:

   ```sql
   update public.profiles
   set role = 'staff'
   where email = 'staff@example.com';
   ```

8. **Optional custom email templates.** The default Supabase confirmation and
   recovery templates work with the callback route. If the templates are changed
   to send `token_hash`, point them at `/auth/callback` or `/auth/confirm` and
   include `type` and `next`.

## Validation performed

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Targeted `npx eslint` on auth, account, Supabase, proxy, and header files | Passed, no output |
| `npm run build` without Supabase keys | Passed; 18 routes including the six auth/account routes and the proxy |
| `npm run build` with temporary dummy public values | Passed; the auth forms render instead of the setup notice. No dummy value was written to a file or committed |
| HTTP check without keys | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/account`, and `/auth/auth-code-error` returned HTTP 200 and showed the configuration notice where applicable |
| Desktop and mobile rendering | Headless Chrome at 1440×1000 and 390×844: no document-level horizontal overflow; one `h1` per page; decorative blurred layers stay clipped inside the page shell |
| Visual review | Sign-in, sign-up, forgot-password, reset-password, error, and account shells inspected in light and dark themes |
| Mobile fix | Long environment-variable names in the setup notice now wrap; the auth card and header fit a 390px viewport |
| Live Supabase migration | **Applied** — three migrations pushed to `ybgcktpyntpcragegwec` |
| Live email/password sign-up and sign-in | **Passed** — confirmed by the project owner |
| Live Google OAuth | **Passed** — confirmed by the project owner after enabling the provider |
| Live confirmation email | **Passed** — confirmed by the project owner |
| Password recovery email | **Not run** — the reset screen and callback are in place but no recovery email was opened |
| RLS anonymous probes | **Passed** — see the live verification tables below |
| Signed-in RLS and role-escalation tests | **Outstanding** — need two live player sessions |
| Double-booking conflict test | **Outstanding** — needs an authenticated booking call |

The database and auth code are connected to a live project. Anonymous access is
proven, but the four authenticated checks below still need a session.

### Live Supabase — 4 November 2026

Project `ybgcktpyntpcragegwec`, migrations applied with
`npx supabase db push --remote`.

| Check | Result |
| --- | --- |
| App reads the live project | `/sign-in`, `/sign-up`, and `/forgot-password` render the real forms; the setup notice is gone |
| Seeded rates | `service_rates` returns ₱250.00 for minutes 420–1020 (07:00–17:00) and ₱300.00 for 1020–1440 (17:00–24:00) |
| Seeded hours | `court_operating_hours` returns daily 07:00–24:00 (420–1440) |
| Club settings | `timezone_name = Asia/Manila`, `hold_minutes = 15`, `payment_deadline_minutes = 15`, `cancellation_cutoff_hours = 24` |
| `/account` | Redirects signed-out visitors to `/sign-in?next=/account` |

### Anonymous access probes

Run against PostgREST and Storage using only the publishable key, which is what
an unauthenticated visitor holds.

| Probe | Expected | Actual |
| --- | --- | --- |
| Read `courts` | allowed | 200, both courts |
| Read `service_rates` | allowed | 200, both rate windows |
| Read `court_operating_hours` | allowed | 200 |
| Read `club_settings` | allowed | 200 |
| Read `profiles` | denied | 401 `42501 permission denied` |
| Read `bookings` | denied | 401 `42501` |
| Read `audit_logs` | denied | 401 `42501` |
| Insert `bookings` | denied | 401 `42501` |
| Insert `court_reservations` | denied | 401 `42501` |
| Update `service_rates` (price change) | denied | 401 `42501` |
| Call `create_court_booking` | denied | 401 `permission denied for function` |
| Call `expire_stale_holds` | denied | 401 |
| Read a `payment-proofs` object | denied | 400, bucket is private |
| List `payment-proofs` | no objects returned | 200 `[]` |

Reference data is public; everything else requires an authenticated session with
the right role.

### Authenticated checks — status at close of Phase 4

| Check | Status |
| --- | --- |
| Player reads own profile, not another player's | Enforced by `profiles_select_own_or_staff`; policy verified by inspection |
| Role self-promotion rejected | Enforced twice: no `role`/`email` column grant for `authenticated`, plus `prevent_profile_role_escalation` |
| Staff promotion by SQL and staff reads | Manual SQL path is documented; staff UI and named accounts are Phase 8 |
| Overlapping `create_court_booking` rejected | Exclusion constraint is applied; runtime call will be exercised in Phase 7 |
| Password recovery email | Screens and callback built; not yet opened end to end |

The Supabase SQL Editor outputs could not be captured during verification, so the
configuration was confirmed by reading the applied migration and comparing it with
the live anonymous probe results. Both agree. Where a check needs a signed-in
session it is marked as deferred rather than passed.

## Known limitations and follow-ups

1. Two runtime checks are deferred rather than passed: overlapping
   `create_court_booking` rejection (Phase 7) and an end-to-end password-recovery
   email.
2. The Supabase SQL Editor verification output was not captured; configuration
   was confirmed by migration inspection plus live anonymous probes.
3. There is still no automated test suite (no Vitest/Playwright configuration).
4. The app does not send transactional email itself; it relies on Supabase Auth
   emails. Notification work belongs to Phase 9.
5. Supabase's built-in Auth rate limits are the only abuse protection right now.
   Application-level rate limiting is still a later security task.
6. Staff promotion is manual SQL until Phase 8. Named staff accounts and the
   permission split are still open (`D-14`).
7. Google consent is expected to remain in Testing mode until privacy and terms
   pages exist (`D-20`).
8. The booking preview is not connected to `create_court_booking`; wiring the
   booking wizard belongs to Phase 7.
9. Payment proof upload and review are not implemented yet; only the private
   bucket and `payments` table exist as foundations.
10. No service-role key is used. Privileged operations should stay in
    `security definer` functions or a server-only context.

## Recommended next step

Complete the live Supabase setup above, then verify in this order:

1. Apply the three migrations and confirm every table, enum, function, trigger,
   bucket, and policy exists.
2. Create a player by email, confirm the message, sign in, sign out, and recover
   the password.
3. Sign in with Google using a test user.
4. Confirm `/account` shows the player role and that a second player cannot read
   the first player's profile or bookings.
5. Attempt a self-promotion through the API and confirm it is rejected; promote
   a staff test user by SQL.
6. Call `create_court_booking` twice for the same court and overlapping time and
   confirm the second call is rejected.
7. Record the results in this document before starting Phase 5.

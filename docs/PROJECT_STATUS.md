# Project Status

## Payment-proof retention: the one limit that can actually fill (13 November 2026)

Database growth is not the risk. It sits at 14 MB of 500 MB, is dominated by
~1.2 kB audit rows, and every table that grows is trimmed by a scheduled job.
Storage is the risk: 1 GB, ~108 kB per proof, and nothing ever deleted them, so
the bucket had a hard lifetime of about 9,000 bookings.

Deleting proof rows with SQL does nothing useful. Supabase's own documentation is
unambiguous: removing rows from `storage.objects` leaves the physical file behind,
so the object is orphaned and **keeps consuming the plan's storage**. Deletion has
to go through the Storage API. That is why this is an HTTP endpoint and a staff
action, not part of `run_data_hygiene()`, which is plain SQL inside `pg_cron`.

### The rule (client decision, 13 November 2026)

`lib/storage/proofs.ts` decides, `lib/storage/purge-proofs.ts` executes:

**Proofs are kept permanently.** A screenshot is deleted only when the booking
or open-play registration it belongs to was cancelled, when the payment was
rejected, or when staff voided the record. Verified, completed, and no-show
screenshots are never deleted, however old they are.

So the deletion set is: `bookings.status = 'cancelled'` (which includes expired
unpaid holds and cancelled open-play registrations, since cancelling a session
moves its bookings to `cancelled`), `bookings.voided_at` or `payments.voided_at`
set, or `payments.status = 'rejected'`.

Each run deletes at most 300 objects, oldest first. There is no age window and
no size cap any more — an earlier 90-day window plus a 700 MB soft cap was built
and then removed on the client's instruction to keep proofs indefinitely. **The
one behaviour that is now unbounded by design is storage growth itself:** at
~108 kB per proof, the 1 GB plan still arrives at about 9,000 screenshots, so the
Free-plan headroom panel stays as the early-warning signal rather than a safety
net.

### How it runs

- `GET /api/cron/storage` with `Authorization: Bearer <EMAIL_CRON_SECRET>` — same
  secret as the email cron so one scheduler drives both. Returns what it deleted.
- **Delete cancelled proofs** button in the Free-plan headroom panel on
  `/staff/reports`, so the club can clean up today even though **no scheduler is
  configured yet** (that checklist item is still open).

Both paths run the same function, are safe to repeat, and report the message
through the usual staff flash.

### Checks

- `lib/storage/proofs.ts` selection rules exercised directly (7/7): an old
  verified proof survives, an old completed-booking proof survives, a no-show
  proof survives, a cancelled booking's proof is selected, a rejected payment's
  proof is selected, a selected proof needs no minimum age, and one run caps at
  300 oldest-first.
- `npx tsc --noEmit` and `npx eslint lib/storage app/api/cron/storage
  app/staff/actions.ts app/staff/reports/page.tsx` — passed, no output.
- `npm run cf:build` + `node scripts/check-worker-size.mjs` — Worker
  **2,719.61 KiB (88.5%, 352 KiB headroom)**, `/api/cron/storage` present as a
  dynamic route.
- Live project check: `profiles.can_manage_accounts`, `payments.voided_at`, and
  `bookings.voided_at` all return 200, so the phase 11 migration is applied.
- The flag itself is **not set yet.** The project's only staff account
  (`joeljayponcearcipe@gmail.com`) is `role = 'staff'` with
  `can_manage_accounts = false`. It cannot be set from the service-role key: that
  role has no UPDATE grant on `profiles` (PostgREST returns 42501 and asks for
  `GRANT UPDATE ON public.profiles TO service_role`), which is deliberate — the
  column is SQL-only. Run this in the Supabase SQL editor, then reload the desk:

  ```sql
  update public.profiles
  set can_manage_accounts = true
  where email = 'joeljayponcearcipe@gmail.com' and role = 'staff';
  ```

  Until then `/staff/accounts` stays out of the sidebar.

### Deployed (13 November 2026)

`npm run deploy` succeeded — Worker version `ce991386-6e0d-4efa-a1d9-eb765fe08745`,
2,719.57 KiB gzip, 22 ms startup. Live checks: `/` 200, `/visit` 200 (map mounts
with 8 tile requests), `/staff/reports` 307 to sign-in, `/api/cron/storage` 503,
and no `href="/open-play"` on the home page.

Redeployed the same day with permanent proof retention — Worker version
`6fb30971-567b-4164-af08-8ca42830e2f5`, 2,719.17 KiB gzip (88.5%, 352.83 KiB
headroom). `/` 200, `/staff/reports` and `/staff/accounts` 307 to sign-in,
`/api/cron/storage` still 503 (see below).

**`/api/cron/storage` returns 503, not 401, which means `EMAIL_CRON_SECRET` is not
visible to the Worker at runtime even though `wrangler secret list` shows it.**
`/api/cron/email` does the same, and did before this change — so it is an existing
environment issue, not this feature. Either the secret was stored empty, or
`process.env` is not being populated for the bundle. Re-set it with
`npx wrangler secret put EMAIL_CRON_SECRET` and re-check; until then the staff
button is the only working path, and it depends on `SUPABASE_SERVICE_ROLE_KEY`
(also present in the secret list) rather than on the cron secret.

### Not verified / open

- The Storage API deletion path has not run against the live bucket. The rules are
  tested, but the first real run (button or cron) is the one that proves the
  service-role key can list and remove objects, and it should be watched once.
- Total bucket size is read from the `storage` schema through PostgREST. If that
  schema is not exposed, the size comes back unknown and only the age rule runs;
  the response reports that rather than pretending the cap was applied.
- No scheduler exists, so nothing runs unattended yet. Either point the existing
  cron service at `/api/cron/storage` daily, or click the button.

## Worker was over the free-plan limit; map moved client-only (13 November 2026)

`npm run cf:build` + `npm run check:worker-size` measured **3,072.36 KiB gzip** against the
Cloudflare Free limit of 3,072 KiB — 0.36 KiB over, so `npm run deploy` stopped at the size gate.

The cause was not new code: `maplibre-gl` (1.2 MB uncompressed) was in the Worker's server bundle
because `app/visit/page.tsx` and the home page imported the map component statically, and SSR
pulled its module graph in.

Fixed with `components/home/club-map-lazy.tsx`: a client component that loads the map through
`next/dynamic` with `ssr: false`, reusing the `.club-map-frame` box (22rem / 26rem from
`globals.css`) as the placeholder so nothing shifts. Both pages now import `ClubMapLazy`.

- `npm run check:worker-size` — **2,714.53 KiB gzip (88.4%, 357.47 KiB headroom)**.
- `maplibre` no longer appears in `.open-next/server-functions/default/handler.mjs` or its SSR
  chunks (grep count 0).
- `npx tsc --noEmit` and `npx eslint` on the three touched files — passed, no output.
- In headless Chrome, `/` and `/visit` both mount the map (`.maplibregl-canvas` present, 8
  OpenFreeMap tile requests) after scrolling it into view, which is when the existing
  IntersectionObserver starts it.

## Account management, staff rate/hours editing, soft void, free-tier trims (13 November 2026)

**Scope approved by the client:** account management for one or two owners,
staff-editable prices and operating hours, removal of mistaken bookings and
payments, and keeping the Supabase Free plan from filling up.

### Account management is a flag, not a new role

`profiles.can_manage_accounts` marks the owners who may invite, disable, and
reset staff accounts. It is a column on the existing `staff` role, so decision
D-14 (player and staff only, no manager/admin role) still holds. The app can
never grant the flag to itself: the column is not in the authenticated update
grant and the profile trigger rejects any in-app change to it.

**Set it once in SQL:**

```sql
update public.profiles
set can_manage_accounts = true
where email = 'owner@example.com' and role = 'staff';
```

Then `/staff/accounts` appears in the desk sidebar for that account only. It
lists staff accounts, shows who is an account manager and whose sign-in is
disabled, sends invitations, disables/enables sign-in (via an auth ban, so
history stays attached), and sends password resets. Invitations and resets are
sent by Supabase auth email, so its Free-plan send rate applies; the page states
the SQL fallback.

**Order matters:** apply the migration before deploying, because `requireStaff()`
now selects `can_manage_accounts` and will send staff back to sign-in if the
column does not exist yet.

### Prices and hours are staff-editable

`/staff/courts` gained two panels:

- **Prices** edits `service_rates.amount_php` per window (currently the 7:00 AM
  and 5:00 PM hourly windows). Availability and `calculate_court_amount()` read
  this table at call time, so new bookings use the new price immediately while
  existing bookings keep their quoted amount.
- **Operating hours** edits `court_operating_hours` per court and weekday, with
  a per-day closed switch. Availability, the booking-time checks, and the
  price-window checks all read this table, so the change applies without a
  deploy or a function change. The court cards now show the configured hours
  instead of the old hardcoded "7:00 AM – 12:00 AM" caption.

### Wrong records are voided, not deleted

The client asked for staff to be able to delete mistaken bookings and payments.
Deleting a paid booking would destroy the club's accounting and dispute record,
so this is implemented as a **soft void** (`voided_at`, `voided_reason`,
`voided_by` on `bookings` and `payments`):

- `staff_void_payment` accepts any payment, and when it voids a `paid` row it
  puts the booking back to `unpaid` unless another live paid payment covers it.
- `staff_void_booking` only accepts closed, unpaid bookings; a paid booking has
  to go through cancel/refund, and a live hold has to expire or be cancelled.
- Voided rows are excluded from the operations report, the dashboard totals, the
  queues, and the booking list. The detail page and payment card keep showing
  them with a Voided badge and the reason.

### Free-tier trims

The daily `public.run_data_hygiene()` job keeps its existing windows
(`email_outbox` 30 days, read notifications 90 days, `audit_logs` 1 year) and now
also deletes:

- court holds whose window lapsed, that were never confirmed, and that never
  received a payment row (a hold with a proof attached is evidence and stays);
- open-play registrations still `registered` more than 24 hours after the
  session ended, together with their unpaid booking, so attendance marking and
  the session itself are untouched;
- reservation groups left empty by those deletes.

Completed, no-show, and staff-cancelled bookings are never touched by the job.
Payment-proof screenshots are **not** deleted by it: they are the only row type
that grows with volume, and a retention window is still a client decision. New
`staff_quota_usage()` feeds a **Free-plan headroom** panel on `/staff/reports`
showing database size against 500 MB, proof storage against 1 GB, and the row
counts behind each.

### Files

- `supabase/migrations/20261113000100_phase11_staff_admin.sql` (new)
- `lib/staff/auth.ts` (`canManageAccounts`, `requireAccountManager`)
- `app/staff/accounts/page.tsx` (new), `app/staff/actions.ts`
- `app/staff/courts/page.tsx`, `app/staff/payments/page.tsx`,
  `app/staff/bookings/page.tsx`, `app/staff/bookings/[reference]/page.tsx`,
  `app/staff/page.tsx`, `app/staff/reports/page.tsx`
- `components/staff/staff-nav.tsx`, `lib/staff/types.ts`,
  `lib/staff/reports.ts`
- `docs/ux/CLIENT_DECISIONS.md` (new decision D-29)

### Checks

- `npm run build` — passed (42 routes, including `/staff/accounts`).
- `npx tsc --noEmit` — passed, no output.
- `npx eslint app/staff lib/staff components/staff` — passed, no output.
- **Migration executed against a real Postgres engine (PGlite) with stand-ins for
  the Supabase-managed objects** (`auth.uid()`, `is_staff()`, `storage.objects`,
  the `anon`/`authenticated`/`service_role` roles, and the tables the phase 11
  migration touches). 31 of 31 checks passed:
  - the migration applies cleanly and creates the flag, the six columns, and all
    six functions;
  - both void RPCs refuse without staff access and refuse a missing reason;
  - a live hold and a paid booking are both rejected by `staff_void_booking`, a
    closed unpaid booking voids once and releases its reservation, and a second
    void is refused;
  - voiding the only paid payment reverts the booking to `unpaid`, while another
    live paid payment keeps it `paid`;
  - hygiene deletes the expired unpaid hold and the expired-released hold, keeps
    a hold with a proof attached, keeps completed and staff-cancelled bookings,
    deletes the abandoned open-play booking with no orphan registration left,
    and keeps recent, attended, and paid registrations;
  - the older hygiene windows still clear `email_outbox`, `notifications`, and
    `audit_logs`;
  - `staff_quota_usage()` returns database bytes, proof bytes, and row counts;
  - the role trigger lets an account manager change a role and blocks a
    non-manager, and blocks any in-app change to the manager flag itself.

### Not verified / open

- **The migration has not been applied to the Supabase project.** The project is
  linked (`supabase/.temp/project-ref`), but no database password or access
  token is available in this environment, so the change could only be executed
  against the local Postgres engine above, not the real project. Apply it with
  `npx supabase db push` (or paste the file into the SQL editor), then set the
  manager flag.
- The screens were not opened in a browser: staff routes need a session and no
  staff credentials were available. After the migration, sign in, set the flag,
  and check `/staff/accounts`, `/staff/courts`, a voided payment and booking, and
  the reports panel.
- Invitation and reset emails depend on the Supabase auth SMTP settings in the
  project; the Free plan limits sends per hour.
- Proof-image retention is still undecided, so storage only grows and is
  monitored from the new panel.
- Nothing was deployed.

## Open play hidden pending client clarification, public-page payload cut (13 November 2026)

**Scope completed:** hide every open-play entry point until the client confirms
the programme, and reduce the JavaScript the public pages download. No booking,
payment, permission, database, or open-play data rule changed.

### Open play is hidden behind one flag

`lib/features.ts` exports `OPEN_PLAY_ENABLED = false`. Every entry point reads
that value, so restoring the feature is a one-line change plus a redeploy:

- Public header, desktop and mobile menus, and the footer **Play** column.
- The homepage hero's **See open play** action.
- Staff sidebar **Open play** item, the mobile tab bar item (the bar now sizes
  itself to the remaining tabs), the dashboard **Open-play players** tile, the
  **Open-play desk** quick action, and the **Sessions filling up** alert.

The `/open-play` and `/staff/open-play` routes, their server actions, the
database functions, and the open-play tables are untouched. They are simply
unlinked, so an existing booking or a direct URL still resolves.

**Reminder: turn open play back on** when the client answers the open-play
questions (schedule, price, capacity, skill levels, and whether it is normal or
DUPR-enabled). Flip `OPEN_PLAY_ENABLED` to `true`, rebuild, and redeploy.

### Measured payload change

Measured with a real headless Chrome session against a local production build
(`next start`), mobile viewport 390×844, cache disabled, cold navigation to `/`:

| Metric | Before | After |
| --- | --- | --- |
| Requests | 29 | 25 |
| Transferred | 814 KiB | 708 KiB |
| Script transferred | 316 KiB | 214 KiB |
| Supabase client chunk on `/` | 67 KiB | not requested |

Two causes were removed:

- **Staff notifications provider moved off public pages.** `app/layout.tsx` no
  longer mounts `NotificationsProvider`; it now wraps only `app/staff/layout.tsx`
  and the new `app/notifications/layout.tsx`. That keeps the Supabase client and
  its Realtime channel (a 67 KiB gzip chunk) off every public page.
- **Booking flow deferred.** `components/booking/booking-modal-provider.tsx`
  loads `CourtBooking`, `OpenPlayRegistration`, and `OpenPlayBrowser` through
  `next/dynamic` with a skeleton fallback, instead of importing them into the
  root-layout bundle. That also removes the Turnstile widget bundles from pages
  that never open a booking.

To keep the first **Book a court** click fast despite the deferred chunk,
`BookingTrigger` and the header button prewarm the court module on hover, focus,
or touch start. Dialog-ready timing on the new build measured 474, 478, and
494 ms after a hover, against 517, 931, and 1,223 ms when the button is clicked
with no hover (the chunk then races the server action). The previous build
measured 387 ms once. These are same-machine local readings with high variance,
so the interaction numbers are indicative only; the payload numbers are the
reliable result.

### Files

- `lib/features.ts` (new)
- `app/notifications/layout.tsx` (new)
- `app/layout.tsx`, `app/staff/layout.tsx`, `app/staff/page.tsx`
- `components/booking/booking-modal-provider.tsx`,
  `components/booking/booking-trigger.tsx`
- `components/home/home-page.tsx`, `components/site/site-header.tsx`,
  `components/site/site-footer.tsx`, `components/staff/staff-nav.tsx`

### Checks

- `npm run build` — passed (41 routes).
- `npx tsc --noEmit` — passed, no output.
- Scoped `npx eslint --max-warnings=0` on the ten changed files — passed.
- Public pages crawled after the change (`/`, `/courts`, `/club`, `/visit`,
  `/book`, `/lookup`, `/club/faq`): zero `href="/open-play"` links remain.
- Page-weight measurement as in the table above.

### Not verified / open

- Staff pages were not opened in a browser: they need a staff session and no
  credentials were available. The sidebar, mobile tab bar, and dashboard gating
  are checked by type-check and build only. Sign in once and confirm the mobile
  bar shows four tabs and the Open-play tile is gone.
- Lighthouse, field data, and a phone-on-mobile-network test were not run; the
  numbers above are a single local machine.
- Nothing was deployed. Run `npm run deploy` to publish.
- **Super admin role is not implemented.** Adding one changes the auth and RLS
  model that `D-14` settled (player and staff only), so it is waiting on the
  client's answers about who may grant roles and manage prices, staff accounts,
  and audit history.

## Cloudflare CPU failures and Worker hangs (10 November 2026)

**Problem:** the live Worker returned Cloudflare `error code: 1102` ("Worker
exceeded CPU time limit") on a large share of page views, and other requests
hung for about 40 seconds with no response before recovering later. The daily
100,000-request limit was not involved: `wrangler tail` showed successful page
renders using **20–65 ms of CPU** against the Free plan's 10 ms budget, and hung
invocations ending as `canceled` after ~42 s with only ~6 ms of CPU and a
pending `waitUntil()` task.

### Root cause

- Every request re-rendered its page because the adapter used its dummy
  incremental cache (`x-nextjs-cache: MISS` even on prerendered routes), so the
  static public pages paid a full React render each time.
- The proxy ran the Supabase session client on every public page, adding
  middleware and auth work to pages that never read a session.
- React server renders retain per-isolate state, the known OpenNext failure mode
  behind intermittent 1102s and dying isolates
  (opennextjs/opennextjs-cloudflare#1381). Serving prerendered pages from a
  cache avoids the render path that leaks.

### Implemented

- **Static-assets page cache:** `open-next.config.ts` uses the read-only
  Workers static-assets incremental cache with `enableCacheInterception: true`.
  `cf:build` now runs `opennextjs-cloudflare populateCache local`, which copies
  the 25 prerendered route-cache entries into
  `.open-next/assets/cdn-cgi/_next_cache` before upload. A cached page (HTML or
  RSC navigation) is returned before the Next render runs.
- **Proxy scope:** `proxy.ts` now matches only `/staff`, `/staff-access`,
  `/notifications`, `/auth/*`, the retired-player redirects, and a root URL that
  actually carries an auth result (`code`, `token_hash`, `error`,
  `error_description`). Public pages skip the middleware bundle and Supabase
  client entirely.

### Files

- `open-next.config.ts`, `package.json` (`cf:build`),
  `proxy.ts`

### Checks

- `npm run cf:build` — passed (Next build, Worker bundle, cache population).
- `npx tsc --noEmit` — passed, no output.
- `npx eslint proxy.ts open-next.config.ts` — passed, no output.
- `npm run check:worker-size` — passed at 2,931.52 KiB / 3,072 KiB gzip
  (95.4%, 140.48 KiB headroom).
- Local `wrangler dev`: `/`, `/?resume=cart`, `/courts`, `/courts/court-1`,
  `/club`, `/club/faq`, `/visit`, `/policies/booking`, `/book`, `/lookup`, and
  `/open-play` returned 200. Homepage HTML and RSC navigations came from the
  cache interceptor; `/staff` and `/notifications` redirected to staff sign-in;
  `/?code=abc` redirected to `/auth/callback`; `/sign-in` redirected to
  `/lookup`. Repeated homepage requests took ~20–35 ms wall locally, down from
  a ~1.5 s cold render.
- No cache-write errors appeared in the local Worker log.

### Deployed and load-tested

- Deployed on 10 November 2026 as version
  `f87b85c6-d773-44d2-9419-73a7ac14152a` (deployment created 14:15 UTC).
- CPU is now measurable on the live Worker. `wrangler tail` sampled 144
  invocations during the test below; cached pages typically used **3–10 ms
  CPU** (`/`, `/club`, `/courts`, `/policies/*`, `/visit`), while dynamic pages
  used roughly 15–100 ms with cold-render spikes up to 526 ms (`/book`), 275 ms
  (`/open-play`), and 255 ms (`/lookup`). Every sampled invocation returned
  `outcome: ok`; there were no exceptions and no `exceededCpu`/`canceled`
  outcomes.
- Load model: **300 users/day at six page views each = 1,800 views**, 65% on
  cached marketing pages and 35% on `/book`, `/lookup`, and `/open-play`,
  compressed into 38 seconds, plus a 200-request homepage burst at 20 concurrent.
  All **2,000 requests returned HTTP 200** (p50 47 ms, p95 201 ms, max 1.35 s
  end-to-end from the test client). That rate is roughly 1,350x the average
  request rate implied by 500 users/day (3,000 views/day), so a normal day is
  far lighter; the test instead exercises a short traffic spike.
- Tail samples under load, so the CPU figures cover 144 of the 2,000 requests;
  the pass/fail result covers all 2,000.

### Remaining risk

- Dynamic pages still render per request, so a sustained flood aimed at
  `/book`, `/lookup`, or `/open-play` (bots, a large campaign) could still
  accumulate isolate retention. Options if that appears: the Cache API wrapper
  from opennextjs/opennextjs-cloudflare#1381, Workers Paid (30 s CPU), or
  explicitly caching those responses.
- Client-side prefetch behaviour after enabling cache interception was not
  exercised in a browser.

## Staff filters, Excel export, pagination, and edge caching (10 November 2026)

**Scope completed:** make every staff list filter easy to read and operate for
non-technical front-desk staff, add a real search to each list, replace the plain
CSV report with a branded Excel workbook, paginate lists that grow over time,
cache hashed build assets correctly, cut the homepage photo download, and add a
deploy-time Worker-size budget. No booking, payment, permission, or database
rule changed.

### Implemented

- **Shared filter bar** (`components/staff/staff-filters.tsx`): visible labels on
  every field, a named submit button instead of a generic Apply, a persistent
  **Clear filters** action, and a short instruction line. Added labelled search,
  date, and select controls.
- **Bookings:** search now resolves guest name, mobile, email, booking reference,
  and group reference on the server. Previously only the reference was queried,
  so a player-name search returned nothing. A search covers every date and every
  status by default and says so on-screen; choosing a status still narrows it.
  Status labels now read "Active bookings", "Waiting for payment", "Everything".
- **Payments:** new search across player name/mobile/email, booking reference,
  group reference, and GCash transaction reference, scoped to the selected tab.
  The tabs got a "Show payments" label and status-specific empty states.
- **Open play:** new filters for player/roster search, a single date, skill
  level, and session status, with an explicit "every date" search note.
- **Court blocks:** new search by reason or court name plus a court filter that
  keeps whole-club blocks visible.
- **Reports:** clearly labelled From/To dates, a "Show report" submit button, and
  quick ranges for Today, Last 7 days, Last 30 days, and This month.
- **Dashboard:** the date button now reads **Show** instead of **Go**.

### Excel export

The reports export is now a styled `.xlsx` workbook, not a CSV. The **Operations
report** sheet uses the club palette: a navy title band, lime accent rail, blue
section bars, warm off-white data rows, Georgia display headings, Calibri body
text, and peso number formatting. It contains an **At a glance** block of eight
metrics, a daily activity table with alternating rows and a **TOTAL** row, notes
that explain how collected/outstanding/occupancy are counted, and the club
contact footer. The table has an AutoFilter and a repeating print-title row; the
sheet is set up to print on A4 landscape, fit to one page wide.

The button reads **Export Excel**, and the download is named
`D-Hidden-Operations-<from>-to-<to>.xlsx`. `lib/staff/xlsx.ts` writes the ZIP and
OOXML parts directly instead of adding a spreadsheet dependency, because the
Worker gzip bundle is close to the Cloudflare free-plan limit. A generated sample
was parsed with Python `zipfile`, `ElementTree`, and `openpyxl`: all XML parts
were well-formed, the workbook opened with 26 rows and 8 columns, the currency
format was `₱#,##0.00`, and the merged summary, AutoFilter, styles, and footer
were present.

### Staff pagination

Pagination is limited to lists whose history actually grows:

- **Payments:** every tab is now 25 payments per page with a total count. Only the
  current page's proof URLs are signed, so older history no longer forces 80–150
  signed links on each load.
- **Bookings:** search results are 40 per page, which also keeps a fully booked
  day on one page. Date, status, and search filters are preserved in the page
  links.
- An out-of-range page redirects to the last real page instead of showing a
  misleading empty list.
- Open play and court blocks remain bounded to upcoming/active records, so they
  were left compact rather than adding controls that would never appear.

### Cloudflare performance and capacity

- `public/_headers` marks `/_next/static/*` as `public, max-age=31536000,
  immutable`. These filenames are content-hashed, so repeat visits no longer
  revalidate every script and stylesheet. Verified live: `Cache-Control` is
  immutable and the asset layer reports `CF-Cache-Status: HIT`.
- Static assets already bypass the Worker through the negative `run_worker_first`
  rules in `wrangler.jsonc`, so they do not consume Worker requests or CPU.
- HTML is Brotli-compressed. Live TTFB from the test network was roughly
  0.09–0.19 s for `/`, `/book`, and `/courts/court-1`. This is a single-location
  check, not field data.
- The Worker upload is 2,926.96 KiB gzip against the 3,072 KiB free-plan limit
  (about 145 KiB headroom). No new dependency was added for Excel. Treat heavy
  server-side packages and unused routes as a deployment risk.
- The GitHub keep-alive workflow for the Supabase free plan is present and is
  scheduled four times a day. Its actual run history could not be checked
  because the GitHub CLI is not installed here.
- The homepage hero, club page, and Court 2 now use WebP derivatives: a
  1376×768 file at 184 KB for desktop and a 960×536 file at 101 KB for phones and
  cards, down from the 923 KB JPEG. The hero uses a plain `img` with `srcSet`, so
  a phone picks the 960 px file. The original JPEG is retained as the source and
  for the internal design-preview page.

### Files

- `components/staff/staff-filters.tsx` (new)
- `components/staff/staff-pagination.tsx` (new)
- `lib/staff/search.ts` (new)
- `lib/staff/pagination.ts` (new)
- `lib/staff/xlsx.ts` (new)
- `public/_headers` (new)
- `public/courts/pickleball2-960.webp`, `public/courts/pickleball2-1376.webp`
  (new WebP derivatives)
- `scripts/check-worker-size.mjs` (new)
- `app/staff/bookings/page.tsx`, `app/staff/payments/page.tsx`,
  `app/staff/open-play/page.tsx`, `app/staff/courts/page.tsx`,
  `app/staff/reports/page.tsx`, `app/staff/reports/export/route.ts`,
  `app/staff/page.tsx`

### Checks

- `npx tsc --noEmit` — passed, no output.
- Scoped `npx eslint` on the changed staff pages, filters, pagination, and
  XLSX writer — passed with `--max-warnings=0`.
- Pagination helper assertions — 9/9 passed (filter preservation, page parsing,
  out-of-range clamping, and page counts).
- `npm run build` — passed (Next.js 16.4.5, 41 routes generated).
- `npm run check:worker-size` — passed at 2,927.06 KiB / 3,072 KiB gzip
  (95.3%, 144.94 KiB headroom).
- `npm run deploy` — passed; live Worker versions
  `637961a2-81a5-4c09-a587-802831649d0d` (XLSX export),
  `8e14c4fd-89ae-48ca-bb55-a119be66930c` (immutable asset headers),
  `1cdc3217-dfa5-4730-9c5d-159a30bb35e3` (pagination), and
  `fa4759ce-13b1-4cc9-b979-6cd3522c85eb` (WebP hero and size guard) are at
  `https://bookings.dhiddenpickleball.workers.dev`.
- Live routing: `/`, `/book`, `/courts/court-2`, and `/club` returned 200;
  `/staff`, `/staff/bookings?page=2`,
  `/staff/payments?status=paid&page=2`, and `/staff/reports/export` returned 307
  to the staff sign-in.
- Live image check: the homepage references the responsive 1376/960 WebP hero;
  the files returned 200 at 187,574 and 102,502 bytes. Court 2 and the club page
  reference the 960 WebP file.
- Live asset check: hashed JS returned `Cache-Control: public,
  max-age=31536000, immutable` with `CF-Cache-Status: HIT`; the WebP images are
  served by the asset layer rather than the Worker.
- XLSX validation: generated sample parsed by Python `zipfile`, `ElementTree`,
  and `openpyxl`; all XML well-formed, branded styles and weight/currency
  formatting confirmed.

### Not verified

- No authenticated browser pass: staff routes require a staff session and no
  credentials were used. Check `/staff/bookings`, `/staff/payments`,
  `/staff/open-play`, `/staff/courts`, and `/staff/reports` at roughly 390 px
  and 1440 px, including a search with no results, a cleared filter, and the
  mobile filter stacking.
- Pagination links were built and unit-checked, but not clicked in a signed-in
  browser. Confirm Previous/Next keeps the date, status, tab, and search, and
  that the out-of-range redirect lands on the last page.
- The new OR-style PostgREST search filters were type-checked and built, not
  executed against production data. Run one search per page in staging before
  relying on them at the desk.
- The workbook was not downloaded from the live Worker or opened in desktop
  Excel, because the export requires a staff session; the sample was validated
  with a separate XLSX parser. Check one live export in Excel or Google Sheets.
- The performance figures are from a single network location, not Lighthouse or
  real-user field data. The 3 MiB Worker limit remains the main capacity
  constraint. The WebP derivatives were visually inspected, but not tested on a
  slow mobile connection.

## Official QR asset deployment fix (10 November 2026)

**Problem:** the deployed site returned `404` for the official QR image, while the
GCash number in code was already correct.

### Root cause

- `npm run deploy` reported success, but Cloudflare's incremental asset upload
  treated the QR's content hash as already uploaded and skipped the file. A
  direct request to `/qr/client-official-qr.jpg` returned the Next.js 404 page
  even after a second deploy said "No updated asset files to upload".
  `gcash-sample.jpg` and `gcash-test-qr.png` served `200`, so the Worker, routes,
  and `run_worker_first` asset rules were working; only this file was missing.
- Renaming the file did not help because Wrangler deduplicates uploads by content
  hash, not path.

### Fix

- Republished the same artwork as `public/qr/client-official-gcash-qr.jpg` with a
  standard JPEG comment segment added before the end marker. The comment changes
  the upload hash; it does not touch the compressed scan data. Pillow confirmed
  the decoded 828×1608 image is pixel-identical to the original.
- Updated `lib/payment.ts` and the exact-path asset rule in `wrangler.jsonc` to
  the new filename, and updated the asset references in the docs.

### Checks

- `npm run deploy` — passed and uploaded `/qr/client-official-gcash-qr.jpg`
  (Worker version `bd130f6d-8c3b-4d3e-b2f1-81191fe4f1c7`).
- Live `/qr/client-official-gcash-qr.jpg` — `200`, `Content-Type: image/jpeg`;
  downloaded MD5 matches the local file.
- Pillow decoded-pixel comparison against the pre-comment original — identical.

### Note on the receiving number

The confirmation's GCash number was not stale: `PAYMENT_DETAILS.accountNumber`
reads `CLUB.phoneDisplay`, which is **0956 167 0905**, matching the masked
`0956 167•••` on the official QR. The previously deployed page used the old test
QR and had no account-number row, so a stale tab or old confirmation would show
both as old. A fresh confirmation after this deploy uses the new artwork and the
number row above.

## Mobile number inputs show the +63 prefix (9 November 2026)

**Scope completed:** make the Philippine-only requirement visible inside every
mobile number field. No booking, validation, or storage rule changed.

### Implemented

- **Shared `PhoneInput`:** `components/ui/field.tsx` now exports a phone input
  with a fixed, non-editable `+63` indicator inside the control. The submitted
  value is still the local number (for example `917 123 4567`), and the existing
  `normalizeMobile` handles both local and `+63` input on the server.
- **All five mobile fields use it:** the court booking review form, the design
  preview form, the `/lookup` reference form, the open-play registration form,
  and the staff walk-in form. Placeholders now read `917 123 4567` so they do
  not repeat the prefix.

### Checks

- `npx tsc --noEmit` — passed, no output.
- Scoped `npx eslint` on the six changed files — passed, no output.
- `npm run deploy` — passed; Worker version `99c6a51f-454d-492a-acf7-08d28684e533`
  is live at `https://bookings.dhiddenpickleball.workers.dev`.
- Live `/open-play` HTML contains the `+63` prefix; `/book` returns `200`.

### Not verified

- No browser screenshot pass was run. The prefix padding and alignment were
  reviewed from the implementation only; check the five fields at phone and
  desktop widths before client review.

## Official GCash QR and receiving details (9 November 2026)

**Scope completed:** replace the project owner's test QR with the client's official
GCash QR, and make the receiving details usable by a player who does not want to
scan a code.

### Implemented

- **Official QR:** `public/qr/client-official-gcash-qr.jpg` (828×1608 JPEG) is
  published unchanged and served through `lib/payment.ts`. The booking and open-play
  confirmations show the whole artwork, including the GCash header, so the payer
  can see the receiving account on the image itself. Nothing crops, resizes, or
  recompresses the file.
- **Account details:** the confirmation shows the account name `MA*Y GR**E M.`
  exactly as GCash prints it on the QR, plus the GCash number **0956 167 0905**,
  which is the club's published contact number.
- **Copyable number:** the payment-instruction block has new account-name and
  GCash-number rows. The number is selectable text with a **Copy** button and a
  caption that offers the number as an alternative to scanning.
- **Public copy:** the courts page, FAQ, rules page, payment policy, and footer no
  longer say the official QR is pending or that a test QR is shown.
- **Cloudflare:** `/qr/client-official-gcash-qr.jpg` is listed with the other
  exact public-file asset rules in `wrangler.jsonc`.

### Checks

- `npx tsc --noEmit` — passed, no output.
- `npx eslint app components lib` — passed, no output.
- `npm run build` — passed.

### Limitations

- GCash masks the account name on the QR (`MA*Y GR**E M.`); the full unmasked
  receiving name was not supplied, so the masked form is what payers see.
- Maya and bank transfer remain out of the current flow per the 6 November
  direction. Only the GCash method is offered.
- The official QR is committed as a public asset. The blueprint's Phase 12 setup
  list says real QR images should not be committed; the file is already shown to
  every payer at payment time, but the repository decision should be confirmed
  with the client before launch. The old sample and test files were left in
  place, unreferenced by the guest flow.
- No browser screenshot pass or live scan-to-pay test was run; the confirmation
  layout was reviewed from the implementation.
- The deployed Worker still serves the previous build until `npm run deploy`.

## Staff operations UI pass (9 November 2026)

**Scope completed:** make the authenticated staff area feel like a designed operations
tool rather than a generic admin template, and improve phone-to-desktop behaviour
without changing any staff workflow, data access, or business rules.

### Implemented

- **Staff shell and navigation:** richer navy sidebar with the court-grid texture,
  lime/blue accent rail, grouped sections, an active-item treatment, and a payment
  review callout. On phones and tablets the staff area now has a sticky context
  header, a thumb-reachable bottom tab bar (Today, Bookings, Payments, Open play,
  More), and a full overlay menu sheet with Escape/backdrop close and a scroll lock.
  Content reserves space above the fixed tab bar, including safe-area inset.
- **Shared staff components:** the page header now has a brand accent rule and a
  stronger display scale; stat cards use tinted icon tiles, an accent rail, larger
  tabular figures, and clearer hover affordance; panels have a consistent accent
  and header treatment; empty states use a subtle court-grid texture.
- **Dashboard:** added an on-court/next-up brief for today, a two-up stat grid on
  phones, and clearer quick-action tiles.
- **Bookings and payments:** responsive filter toolbar, pill-style day navigation,
  status rail on mobile booking rows, and a segmented payment tab bar. Payment
  review cards have a stronger hierarchy and accent.
- **Courts, open play, reports:** creation forms move first on narrow screens so
  staff do not scroll past long lists, session rows show a capacity bar, and the
  report filter wraps cleanly on phones. Detail-page side rails stay in view on
  wide screens.

### Checks

- `npx tsc --noEmit` — passed, no output.
- `npx eslint components/staff app/staff` — passed, no output.
- `npm run build` — passed; all `/staff` routes compiled as dynamic routes.

### Not verified

- Browser screenshots at mobile/tablet/desktop widths were **not** taken: the staff
  routes require an authenticated staff session, and no credentials were available
  in this environment. The responsive layout was reviewed from the implementation
  only. Before client review, sign in with a staff account and inspect `/staff`,
  `/staff/bookings`, `/staff/bookings/new`, a booking detail page, `/staff/payments`,
  `/staff/open-play`, a session detail page, `/staff/courts`, and `/staff/reports`
  at roughly 375 px, 768 px, 1024 px, and 1440 px, including the mobile bottom bar,
  menu sheet, light/dark themes, and reduced motion.
- No behaviour, permission, or payment-logic change was made; existing booking and
  payment workflows are unchanged.

## Broken court links + Cloudflare asset routing (9 November 2026)

**Scope completed:** fix clickable links that landed on an error page, and keep static traffic off the
Worker without breaking routes.

### Root cause

`wrangler.jsonc` used the negative asset rule `!/courts/*`, intended for the two court photographs.
Cloudflare gives negative `run_worker_first` patterns asset-first precedence, so `/courts/court-1` and
`/courts/court-2` also skipped the Worker. Those pages are rendered by Next and are not files in
`.open-next/assets`, so the asset layer answered them with a bare **404**. Every other public route,
policy page, and in-page anchor was crawled and returned 200/307 as expected.

### Implemented

- **Exact-file asset rules:** `wrangler.jsonc` now lists each public file individually instead of a
  whole directory, so `/courts/court-1` and `/courts/court-2` reach the Worker again while the photos,
  logo, QR images, MapLibre worker, and `_next/static` stay on the free asset layer.
- **Worker-side image optimizer skipped:** `next.config.ts` sets `images.unoptimized`. Without an
  `IMAGES` binding the optimizer only returned the original bytes through a Worker request; `<Image>`
  now emits the direct `/courts/...`, `/logo/...`, and `/qr/...` URLs, which the asset layer answers.
  A homepage view no longer makes any `/_next/image` Worker requests.

### Checks

- `npm run cf:build` — passed.
- Against `wrangler dev`: `/courts/court-1` and `/courts/court-2` return 200 and render Court 1/Court 2
  content; `/`, `/courts`, `/club`, `/club/rules`, `/club/faq`, `/visit`, `/book`, `/open-play`,
  `/lookup`, all four policy pages, `/staff-access`, `/notifications`, and `/sign-in`/`/account`
  redirects behave as before.
- Crawled all 28 unique internal `href` values from the public pages: none return 404/5xx.
- Homepage HTML contains no `/_next/image` references; image responses are served by the asset layer.
- `npx tsc --noEmit` — passed.

### Limitations

- The fix is verified in the local Worker build only; it is not deployed. Run `npm run deploy` (which
  rebuilds `.open-next`) to update the live Worker.
- `public/courts/pickleball2.jpg` was ~923 KB. It is now free of Worker requests, and the homepage,
  club page, and Court 2 use 184 KB/101 KB WebP derivatives; the JPEG remains the source asset and is
  still used by the internal design-preview page.
- `public/logo/hidden-pickleball.png` (~1.2 MB) is unused; the WebP is what the site loads.

## Mailjet email, Turnstile production secret (9 November 2026)

**Scope:** replace Resend with Mailjet for transactional email and activate the
production Turnstile secret on the deployed Worker.

### Implemented

- **Mailjet adapter:** `POST https://api.mailjet.com/v3.1/send` using
  `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, a validated `EMAIL_FROM`, and
  `EMAIL_REPLY_TO`. The outbox dedupe key is sent as Mailjet `CustomID` for
  tracing, truncated to Mailjet's 64-character limit. Mailjet has no
  idempotency-key header, so a retry after a timeout can still duplicate a
  message at the provider.
- **RESEND_API_KEY is no longer read.** Send API v3.1 returns per-message
  `Status` and `Errors`, so the adapter fails the outbox row when Mailjet accepts
  the HTTP request but rejects the message.
- **Quota defaults now match Mailjet Free:** 200/day and 6,000/month, still
  overridable with `EMAIL_DAILY_LIMIT` and `EMAIL_MONTHLY_LIMIT`. The Worker
  secrets were updated from the old Resend limits to `200` and `6000`.
- **Email logo:** the header uses a 96×96 PNG at `/email-logo.png`. The earlier
  CID inline attempt was removed because Gmail listed it as a downloadable
  attachment when the sender was not trusted. Remote images can still be hidden
  until the sending domain is validated.
- **Worker secret:** `TURNSTILE_SECRET` was written to the `bookings` Worker
  (value never printed) and validated against siteverify with a dummy token,
  which returned `invalid-input-response` rather than `invalid-input-secret`.
- **Docs and env template** now use `MAILJET_API_KEY` and
  `MAILJET_SECRET_KEY`. The historical Resend notes below remain for context.

### Checks

- Turnstile widget rendered in a production `next start` build, including the
  challenge iframe.
- A headless Chrome click was rejected by Cloudflare with client error
  `600010` (automation detected), so a real token success and replay rejection
  still need a normal browser.
- Mailjet Send API sandbox validation returned `HTTP 200` and `Status success`
  for the configured sender; sandbox mode performs validation without delivery.
- The first live outbox attempts failed with HTTP 400 because `EMAIL_FROM` was
  still `onboarding@resend.dev`, which Mailjet has not validated. The local and
  Worker `EMAIL_FROM` now use the account's validated sender.
- After the sender fix, live outbox attempts exposed Mailjet's 64-character
  `CustomID` limit (`mj-0006`). The adapter now truncates the dedupe key to 64
  characters.
- A direct live Mailjet send to the club address returned `HTTP 200` and
  `Status success` after the sender change.
- A live send with the inline logo attachment returned `HTTP 200` and
  `Status success`, but Gmail showed it as a downloadable attachment instead of
  rendering it inline.
- `npx tsc --noEmit`, focused ESLint, and the production build passed after the
  code changes.

### Required setup

1. Confirm the Mailjet account is on the Free plan, or raise the two limits to
   match the paid plan.
2. The current `EMAIL_FROM` is the account's validated Gmail sender, which is
   enough for testing but is not ideal for deliverability. Validate the club's
   sending domain in Mailjet, then move `EMAIL_FROM` to a mailbox on that domain.
3. `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and the corrected `EMAIL_FROM` are
   now Worker secrets. Run `npm run deploy` to activate the new adapter, then
   remove the now-unused `RESEND_API_KEY` secret.
4. Send one real booking through to a guest inbox and confirm sender, logo,
   links, reference, and timezone. The earlier queued booking email is scheduled
   for a later outbox retry; a new booking tests the path immediately.

## Resend transactional email + send quotas (8 November 2026)

**Scope:** the owner returned from the brief Brevo trial to Resend's free plan
(100 sends/day, 3,000/month) and asked to send only booking-critical mail.

### Implemented

- **Resend adapter:** `POST https://api.resend.com/emails` with
  `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `EMAIL_REPLY_TO`. The outbox
  dedupe key is sent as Resend's `Idempotency-Key` header, so a retry after a
  timeout cannot create a duplicate message.
- **Event policy:** booking received, open-play reserved, payment verified,
  payment proof rejected, booking cancelled, open-play details changed, and the
  24-hour reminder still send. The player **payment-proof-received** email is
  suppressed because the lookup page already shows the new status. All four
  staff alerts are also suppressed to protect the quota; staff use the dashboard
  as the source of truth. `STAFF_NOTIFICATION_EMAILS` remains configured for a
  future re-enable.
- **Daily and monthly quota guards:** `EMAIL_DAILY_LIMIT` defaults to **100** and
  `EMAIL_MONTHLY_LIMIT` to **3,000**, matching Resend's free plan. The processor
  counts successful outbox rows since the start of the UTC day and month, claims
  only the remaining slots, and leaves excess rows queued instead of failing.
  Current enabled events have one guest recipient per row, so the row count
  matches the provider's send count.
- **Stale-email cutoff:** messages that have waited more than 24 hours are
  skipped, so an outage cannot send a stale confirmation or reminder.
- **Docs and env template** now use `RESEND_API_KEY`, `EMAIL_DAILY_LIMIT`, and
  `EMAIL_MONTHLY_LIMIT` with Resend sender verification instructions.
- **`EMAIL_FROM` is a mailbox, not the deployed URL.** It must be an address on a
  Resend-verified domain, for example
  `D-Hidden Pickleball <bookings@dhiddenpickleball.com>`. `NEXT_PUBLIC_SITE_URL`
  is the site origin for links and the logo. The current Workers hostname is
  `bookings.dhiddenpickleball.workers.dev`. A custom domain is still the clean
  client-facing URL.

### Checks

- `npx tsc --noEmit` — passed.
- Focused ESLint on the email modules — passed.
- Production build — passed with a 4 GB Node heap; the default heap hit a
  Windows worker OOM after compilation.
- No live Resend send was performed in this change. The Phase 9 Resend sandbox
  delivery to the account owner remains the last live provider check; it cannot
  reach guests until a domain is verified.

### Required setup

1. Create a Resend API key and add it as `RESEND_API_KEY` (local `.env.local`,
   Worker secret in production).
2. Verify the sending domain in Resend, then set `EMAIL_FROM` to a verified
   mailbox on that domain. Do not use the deployed site URL as `EMAIL_FROM`.
3. Leave the defaults at 100/day and 3,000/month. Lower them if the club's volume
   needs less; raise them only on a paid plan.
4. Run one real booking through to a guest inbox and confirm the sender, logo,
   links, reference, and timezone.

### Site URL and GitHub/Worker naming

- The current Workers hostname is
  `https://bookings.dhiddenpickleball.workers.dev`; `bookings` is the Worker
  `name` in `wrangler.jsonc`, and `dhiddenpickleball` is the Cloudflare
  `workers.dev` account subdomain. A custom domain such as
  `book.dhiddenpickleball.com` is still the clean client-facing option.
- The GitHub repository can be renamed to `dhiddenpickleball`; update the local
  `origin` remote and any deployment/CI references after the rename.

## Guest booking access — no player accounts (8 November 2026)

**Scope completed:** the client approved removing the player login and
registration system and keeping staff accounts. Court bookings and open-play
places now belong to guest customer records instead of player profiles.

### Implemented

- **Database migrations** `20261108000100_guest_booking_no_player_accounts.sql`,
  `20261108000200_customers_service_role_grant.sql`, and
  `20261108000300_backfill_staff_history_customers.sql`, applied to project
  `ybgcktpyntpcragegwec`. They add `customers`, link bookings, booking groups,
  and open-play registrations through `customer_id`, preserve historical owner
  details (including staff test bookings), keep 1 staff auth user, delete the
  player auth users, and grant the service role the `customers` read it needs
  for email processing.
- **Guest actions** call security-definer RPCs: guest court/group bookings,
  guest open-play registration, guest payment proof, and `lookup_guest_record`.
  Anonymous table access was removed; RLS now exposes these records to staff
  only.
- **Mandatory mobile number** on both booking forms, normalised to
  `63XXXXXXXXXX` in the database. Optional email is used only for confirmation
  mail.
- **QR pass:** `DHPB1|<reference>|<mobile>` generated in the browser, with an
  automatic download at the payment/proof step, a **Download QR code** button,
  and copyable reference and mobile number. No QR file is stored in Supabase.
- **`/lookup` page:** upload the QR image (decoded in the browser with `jsqr`)
  or enter reference plus mobile. It shows status, payment status, court/time
  items, hold expiry, rejection reason, and the QR pass, and offers payment
  proof upload when eligible.
- **`/api/payment-proof`:** verifies reference plus mobile, uploads the file
  with the service role to `guests/<record id>/<uuid>.<ext>`, then records it
  through the guest RPC. New bucket MIME type: PDF, in addition to images.
- **Staff-only auth:** player sign-up/sign-in/account pages were deleted.
  Staff sign in at the unlisted `/staff-access`, with recovery at
  `/staff-access/forgot-password` and `/staff-access/reset-password`. A
  non-staff account is signed out immediately. `/staff` remains guarded by the
  proxy and `requireStaff`.
- **Staff pages and email processing** now join `customers` (aliased as the
  existing `player` fields), and email links point to `/lookup` instead of
  `/account`.
- **Walk-in desk** asks for guest name and mobile number instead of a player
  account email.

### Checks run

- `npx tsc --noEmit` — passed.
- `npx eslint . --max-warnings=0` — passed.
- `npm run build` — passed; `/lookup`, `/api/payment-proof`, `/staff-access`,
  and the staff routes built successfully.
- `npx supabase db push --remote --yes` — migration applied.
- Remote SQL verification: 5 customers, 1 auth user (staff), 1 staff profile,
  0 bookings/groups/registrations without a customer, and 0 records left on the
  placeholder customer.
- `lookup_guest_record` executed as the `anon` role against a real booking and
  returned the expected record.
- Guest group booking and guest open-play registration executed as `anon`
  inside rolled-back transactions; both succeeded without persisting data.
- PostgREST embedded reads with the service role returned `200` for the exact
  booking, group, and staff-page customer joins used by the app.
- Production server smoke test: `/lookup`, `/staff-access`, `/book`, and
  `/open-play` returned `200`; `/staff` redirected to `/staff-access`; legacy
  `/sign-in`, `/sign-up`, and `/account` redirected to `/lookup`.
- `/api/payment-proof` rejected an unknown reference/mobile with `400` and a
  clear message.
- QR round-trip: the `DHPB1|<reference>|<mobile>` payload encoded with `qrcode`
  decoded back identically with `jsqr`.
- Redirect guard checked directly: `/staff-access/reset-password` is preserved
  after recovery, while `/staff-access`, `/auth/*`, and external URLs fall back
  to `/staff`.

### Known limitations / follow-up

- Browser pop-up/download policy may suppress the automatic QR download; the
  visible **Download QR code** button always works.
- No automated test suite exists. The guest RPCs were verified with manual SQL
  transactions, not end-to-end UI tests.
- Production needs `SUPABASE_SERVICE_ROLE_KEY` for guest proof uploads and
  guest email enqueueing; without it, proof upload returns a configuration
  error and confirmation emails are skipped, while booking and lookup still
  work.
- Supabase Auth email templates should point recovery redirects at
  `/staff-access/reset-password` (the app also defaults recovery links there).
- The in-memory lookup throttle is per server instance; the database still
  requires both the reference and matching mobile number.
- Player notification rows were removed by the profile cascade; staff
  notifications and the staff bell remain.

**Last updated:** 8 November 2026
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md` (v2.5, with the 8 November guest-access scope change)
**Current phase:** Phase 10 QA, security, and pre-launch review is complete for the available local/staging scope; see `docs/PHASE_10_QA.md`. The production build, typecheck, lint, audit, RLS boundaries, booking/capacity constraints, public pages, and authenticated staff routing passed. Public launch remains blocked by real guest email (unvalidated Mailjet sender), the reminder scheduler, client acceptance/staff training, and backup/monitoring arrangements. The official GCash QR is installed as of 9 November 2026. The Phase 11 hosting slice is deployed on Cloudflare Workers at `https://bookings.dhiddenpickleball.workers.dev`; the launch checklist remains open. See `docs/DEPLOYMENT_CLOUDFLARE.md`.

**Phase 3:** Implemented as a design preview with real assets and real rates; three booking rules remain unanswered. Not production-approved.
**Phase 4:** Core schema, RLS, auth screens, and roles are live on project `ybgcktpyntpcragegwec`. Email/password sign-up, confirmation, sign-in, and Google sign-in worked at Phase 4 close; the 8 November guest-access change removed player auth, leaving staff email/password sign-in only. Anonymous access probes match the applied migration; overlapping-booking rejection and password recovery are deferred runtime checks.
**Phase 5:** The public site now covers the homepage, both courts, the visit/location page, club information, rules, FAQ, and the booking, payment, privacy, and terms policies. The public copy was approved on 5 November 2026, and `Asia/Manila`/PHP were confirmed. At Phase 5 close, open play had no schedule, price, capacity, or levels, so it was omitted; Phase 7 now supplies the owner defaults. Public booking actions lead to `/book`; the Phase 3 preview remains an internal reference route only.
**Phase 6:** At Phase 6 close, account profile editing was limited to full name and mobile; booking history and detail read the real `bookings` and `court_reservations` tables, with empty, error, and session-expiry states. The 8 November guest-access change removed player account pages; the equivalent lookup now lives at `/lookup`. Self-service cancel/reschedule remains unavailable per `D-13`. No staff tools or sample reservations were added. Phase 7 now supplies real bookings to the lookup.

## Storage budget and data hygiene (7 November 2026)

Supabase's Free plan measures database size and file storage separately: **500 MB
of Postgres database per project** and **1 GB of Storage**, plus 5 GB of egress.
Public assets in `public/` and the QR image are served by the web host, not from
Supabase Storage.

### Measured usage

Production on 7 November 2026: database **14 MB** (`pg_database_size`), Storage
**1.8 MB** across 17 payment proofs (average 108 kB). The largest tables were
`audit_logs` (480 kB, 395 rows), `auth.users` (232 kB), and `email_outbox`
(152 kB, 66 rows). No image, base64 payload, or file blob is stored in Postgres;
booking, payment, audit, and open-play rows are small text/numeric records.

### What keeps it small

- **Proof compression before upload.** The browser resizes to a 1,600 px maximum
  edge, re-encodes to WebP (JPEG fallback) at quality 0.82, and caps the object
  at 1.5 MB, retrying smaller if needed. The bucket ceiling stays at 2 MB as a
  hard stop (`20261107000100_payment_proof_storage_limit.sql`). A proof only has
  to stay readable for the amount, reference, and recipient.
- **Failed uploads are discarded.** The screenshot uploads before the server
  action records it, so both proof actions delete the object when the database
  refuses it (expired hold, duplicate proof, wrong account).
- **Scheduled hygiene.** `public.run_data_hygiene()`, created by
  `20261107000700_phase9_data_hygiene.sql` and scheduled daily at 03:15
  Asia/Manila with `pg_cron`, trims: `email_outbox` terminal rows after 30 days,
  read `notifications` after 90 days (any notification after 1 year), and
  `audit_logs` after 1 year. Bookings, payments, booking groups, and payment
  proofs are never deleted by the job. The windows live in the function body and
  can be changed there. If `pg_cron` cannot be enabled, the migration raises a
  warning and the same function can be run manually or scheduled from the
  Supabase dashboard.
- **No automatic proof deletion.** The published policy keeps proof only while
  it is needed to verify payment and handle a dispute or accounting requirement,
  so deleting screenshots stays a client policy decision rather than a job.
  Volume can be audited from the Supabase SQL editor with
  `select sum((metadata->>'size')::bigint) from storage.objects where bucket_id = 'payment-proofs';`.

### Free-plan project pausing

Supabase pauses a Free Plan project after roughly a week of low user database
activity (a few API queries a day normally prevent it). Internal `pg_cron` work
is not user API activity, so the hygiene job alone is not relied on for this.
`.github/workflows/keep-supabase-awake.yml` queries one public `courts` row four
times a day with the public anon key and fails loudly if the project stops
answering. It needs the `SUPABASE_URL` and `SUPABASE_ANON_KEY` repository
secrets. GitHub disables scheduled workflows on public repositories after 60
days without repository activity, so an external uptime monitor pointed at
`/rest/v1/courts?select=id&limit=1` with an `apikey` header is the fallback. Only
a paid plan guarantees no pausing; a paused project keeps its data and can be
restored from the dashboard for up to one year.

### Free-plan headroom

At ~108 kB per proof, 1 GB holds roughly 9,000 uploads; the tighter compression
adds headroom on top of that. Database growth is dominated by audit rows
(~1.2 kB each) and the email outbox, and the hygiene job removes both once they
stop being useful, keeping the database in the low tens of megabytes at normal
club volume. Existing proof objects above the old ceiling are left untouched;
new uploads follow the current settings.

## Phase 10 — QA, security, and pre-launch review (7 November 2026)

Authorized 7 November 2026. Scope was verification and hardening only; no
Phase 11 or deferred coaching/DUPR work was added. Full results are in
`docs/PHASE_10_QA.md`.

### Passed

- `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm run build`
  (47 routes), and `npm audit --omit=dev` (0 vulnerabilities).
- Production headers: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and `Permissions-Policy`; `X-Powered-By` removed.
- RLS and storage isolation: player A saw 4 bookings/4 payments, player B saw
  2/2, staff saw 20/9; anonymous booking reads, player outbox reads, player
  self-promotion, cross-profile updates, and player staff RPCs were denied.
- Booking overlap and open-play capacity were rejected inside rolled-back
  transactions (`23P01`); no test record persisted.
- Player `/staff` redirects to the account page; staff `/account` redirects
  to `/staff`. All staff pages rendered at 1440 and 390 px with no overflow or
  console errors.
- 36 public/auth production views at 390–1440 px had one `h1`, no horizontal
  overflow, labelled inputs, and no real broken images. Map canvas, marker,
  popup, and attribution rendered without errors.
- Basic throttled mobile homepage measurement: LCP 1,084 ms, CLS 0, 23
  resources. This is a local lab observation, not field data.

### Fixed

- Added baseline security headers and disabled `X-Powered-By` in
  `next.config.ts`.
- Ignored `.tmp-ui/**` and generated `public/vendor/**` in
  `eslint.config.mjs`, so lint no longer hangs on QA artifacts.

### Blocked or not run

- Real guest email, email logo/links, and password-recovery delivery remain
  blocked by the unverified Resend sender and private `NEXT_PUBLIC_SITE_URL`.
- The 24-hour reminder/retry scheduler is not configured.
- The official GCash QR/account name is still the test asset.
- Destructive staff writes, full keyboard/focus, WCAG, cross-browser, and
  real-device checks were not run; the project has no automated test suite.
- Backups, restore, uptime, and error monitoring were not verified.
- Production still contains QA accounts and test bookings; decide whether to
  retain them as demo data or purge before launch.

### Launch-gated work

1. Verify a sending domain, set `EMAIL_FROM`/`EMAIL_REPLY_TO`, and send a real
   player email.
2. Set the public HTTPS `NEXT_PUBLIC_SITE_URL`.
3. Configure `EMAIL_CRON_SECRET` and schedule `/api/cron/email` every 15
   minutes.
4. Install the official payment QR and confirmed account details.
5. Obtain client acceptance and train staff.
6. Confirm backups, restore, monitoring, and deployment hardening.

Phase 11 has not been completed; only its hosting target was started (see below).

## Phase 11 — Hosting target on Cloudflare Workers (7 November 2026)

Authorized 7 November 2026 for the hosting slice of Phase 11 only. Coaching,
DUPR, and the remaining launch-checklist items were not added. Full deployment
notes, secret handling, and costs are in `docs/DEPLOYMENT_CLOUDFLARE.md`.

### Implemented

- **Worker deployment via OpenNext.** `@opennextjs/cloudflare` and `wrangler`
  were added as dev dependencies, with `open-next.config.ts` and
  `wrangler.jsonc` describing the Worker, the static asset binding, and
  observability. `next` moved to ^16.4.5 for the adapter's peer range.
- **Commands.** `npm run cf:build`, `npm run preview`, and `npm run deploy`.
  Plain `npm run build` is unchanged.
- **Cache Components disabled** in `next.config.ts`, and the `instant = false`
  exports removed from `app/staff/layout.tsx` and `app/notifications/page.tsx`.
  The adapter's CacheSignal patch no longer matches Next 16.4
  (opennextjs/cloudflare#1318), so every Worker request hung and returned 500
  while it was enabled. The app uses no `use cache`/`cacheLife`/`cacheTag`
  directives, so the practical loss is partial prerendering shells.
- **Lint fix.** `.open-next/**` and `.wrangler/**` are now globally ignored in
  `eslint.config.mjs`; without it, `npx eslint .` exhausted the heap linting the
  generated bundle.

### Checks

| Check | Result |
| --- | --- |
| `npx opennextjs-cloudflare build` | Passed |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint . --max-warnings=0` | Passed, no output |
| `npm run build` | Passed |
| Worker routes under `wrangler dev` | `/`, `/courts`, `/club`, `/sign-in`, `/account`, `/book`, `/open-play`, `/qr/gcash-test-qr.png` returned 200; `/staff` and `/notifications` returned 307 to sign-in; `/api/cron/email` returned 401 |
| Deployed to Cloudflare (initial Worker) | The initial Worker returned 200 for `/`, `/courts`, `/club`, `/book`, `/open-play`, `/sign-in`, and `/account`; `/staff` returned 307 and `/api/cron/email` returned 401. The current Worker is deployed separately. |
| Worker secrets | **Configured** — the Worker has the expected secret names; values were not read |
| Custom domain | **Not attached** |
| CPU per request on Workers | **Not measured** — needs a deployed preview and `wrangler tail` |

### Deployment link fix (7 November 2026)

The confirmation/recovery link that arrived as
`http://localhost:3000/?code=...` was caused by the Supabase project's Auth
**Site URL** still being `http://localhost:3000` with an empty redirect
allow-list, so Supabase ignored the app's `emailRedirectTo` and used the Site
URL. Fixed:

- Updated the remote Supabase project `ybgcktpyntpcragegwec` (via a targeted
  `npx supabase config push`) so `auth.site_url` pointed at the then-current
  Worker origin and the redirect allow-list included that origin plus
  localhost/127.0.0.1 for development. The local target is now
  `https://bookings.dhiddenpickleball.workers.dev`.
  Email confirmations, Google, MFA, and pooler settings were left unchanged.
- Mirrored those values in `supabase/config.toml` so a future config push does
  not revert the deployed origin to localhost.
- Added a root-level auth-result redirect in `proxy.ts`: old links like
  `/?code=...`, `/?token_hash=...`, or `/?error=...` now go through
  `/auth/callback` instead of losing the code on the homepage.
- `lib/email/config.ts` no longer falls back to localhost in a production
  build; a missing `NEXT_PUBLIC_SITE_URL` uses the current Workers origin.
- `.env.example` documents the deployed HTTPS origin instead of localhost.

### Remaining launch blockers

A fresh deploy build is still needed to ship the proxy redirect and the
email-config change to the Worker. No `wrangler secret put` has been run, no
custom domain is attached, the Mailjet sender is still unvalidated, the
reminder scheduler is not configured, and the official GCash QR is still the
test asset. Google's consent screen still displays the Supabase project host
because that is the OAuth callback domain; changing it requires a Supabase
custom domain and/or Google brand verification (see
`docs/DEPLOYMENT_CLOUDFLARE.md`). Client acceptance and staff training are
unchanged.

## Post-Phase 10 booking-flow follow-up (7 November 2026)

Implemented after the Phase 10 QA pass at the owner's request. This is a
corrective UX and booking-policy change, not a new phase.

- **Location copy:** the full address is now "Bung-aw, Pondol, Balamban,
  Cebu". Pages and metadata that showed only "Balamban" now use "Pondol,
  Balamban, Cebu"; the short footer/auth address uses the full line.
- **One active unpaid hold:** a player with a pending, unpaid court booking
  and an unexpired 15-minute hold cannot create another court booking.
  Submitting proof (booking moves to confirmed/awaiting verification) or
  letting the hold expire allows the next booking. Staff walk-ins are exempt.
  The guard is in `supabase/migrations/20261107000400_player_single_active_hold.sql`
  and is applied to production. Group bookings still create all ranges under
  one hold through the internal function.
- **Court-time picker:** tapping an open hour adds a court time immediately
  and enables Review booking. Tapping an hour adjacent to any existing range
  extends that range, so ranges can keep growing after later picks too. Tapping
  an already added hour removes just that hour, splitting the range when the
  hour is in the middle; × in the court-times list still removes a whole range.
  Add court time returns the user to the date picker and makes the next pick a
  separate range, so another time on the same date does not extend or follow
  the previous range. A non-adjacent pick on the same court and date fills the
  free hours in between into the same range (4 PM then 10 PM becomes 4 PM–
  11 PM); when an hour in between is taken the pick is refused and the picker
  offers a one-click "Add it as a separate court time" action next to the grid.
  The last-edited range is solid blue and other added ranges are pale blue.
  Every add, trim, extension, and removal records a cart snapshot, and an
  **Undo** link next to the picker notice restores the previous court times in
  one click.
- **Selection survives sign-in:** Review booking while signed out saves the
  chosen court times in `localStorage` under `dhidden-booking-cart` for two
  hours, so they survive the sign-in page, a new tab from an email link, and a
  closed overlay. Returning to a booking surface restores them with a "We kept
  the court times you picked earlier" notice; the `?resume=cart` return path
  opens Review directly, and that step now lists the saved times and total for
  signed-out players with a Change times button. A successful booking clears
  the saved copy.
- **Proof authenticity:** the GCash proof form now requires a confirmation
  that the screenshot is genuine and unaltered. The server action rejects a
  submission without that confirmation. The booking and group detail pages
  link to the payment policy.
- **Policy links:** the booking terms now link the words booking,
  cancellation, and payment to the relevant policy sections.

Checks: `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, and `npm run
build` passed. The database guard was tested in rolled-back transactions:
a second unpaid booking was rejected, an expired hold and a submitted-proof
booking were allowed, a two-range group succeeded, and staff booking was
exempt. Browser checks confirmed auto-add, ranges extending from any adjacent
pick, single-hour trimming that splits a range, separate ranges after Add
court time, ×-removal of a whole range, and the refused out-of-range pick
with its one-click separate-range action, bridging 4 PM to 10 PM into a
single range, per-hour trimming, the Undo link restoring both a trim and a
whole-range removal, and the sign-in handoff restoring a signed-out
selection into Review with its times and total, then back to the picker via
Change times; the full location wording also rendered with no console errors.

## Phase 9 — Notifications, emails, and customer trust (7 November 2026)

> **Provider note:** this phase originally shipped with Resend. It was briefly
> switched to Brevo on 8 November 2026, then returned to Resend the same day;
> see the top section for current setup.

Authorized 7 November 2026, after the owner confirmed the Phase 8 live staff pass.
Scope is email-only transactional messaging. SMS, marketing automation, waitlist
promotion, coaching, and DUPR are not included.

### Implemented

- **Database-backed outbox:** `email_outbox` records each event, its audience,
  booking/group/session target, a unique dedupe key, attempts, availability,
  provider message id, and delivery status. Rows are inserted by a security-definer
  function after the related database change; the browser cannot write the table.
- **Player messages:** booking received (court and grouped reservations),
  open-play place reserved, proof received, payment verified, proof rejected,
  booking cancelled, open-play details changed, and a 24-hour reminder.
- **Staff messages:** new booking, payment proof waiting, booking cancelled, and
  open-play session reaching capacity. Staff recipients come from
  `STAFF_NOTIFICATION_EMAILS`, not from a database role scan.
- **Branded templates:** the approved logo-derived icon, club name, navy/cream
  palette, address, phone, email, booking reference, service, date/time in
  `Asia/Manila`, amount due or paid, payment status, cancellation/rejection
  notes, policy guidance, and a direct account/staff link. Both HTML and plain
  text versions are sent.
- **Provider adapter (at Phase 9 close):** server-only Resend HTTP integration
  with a verified `EMAIL_FROM`, `EMAIL_REPLY_TO`, and the outbox dedupe key sent
  as the `Idempotency-Key` header. Resend provides this adapter again.
- **Safe processing:** an authenticated server action enqueues the event and
  schedules delivery with Next.js `after()`. A protected
  `GET /api/cron/email` route claims queued rows with `FOR UPDATE SKIP LOCKED`,
  sends a batch, records the result, retries failed sends up to five times with
  spacing, and queues 24-hour reminders. If the provider is not configured,
  rows stay queued rather than being lost or claimed.
- **UI fallback:** booking and open-play confirmations now say that the page and
  account history remain the source of truth if an email does not arrive.

### Files

- `supabase/migrations/20261107000200_phase9_email_outbox.sql` — outbox, event
  enqueueing, capacity alert, reminder queue, claim, and completion functions.
- `supabase/migrations/20261107000300_phase9_service_role_reads.sql` — grants the
  server-only service role read access to the booking tables used by the email
  processor. Without these grants, queued rows were marked skipped with
  “Reservation data is no longer available.”
- `lib/email/types.ts`, `config.ts`, `provider.ts`, `templates.ts`, `process.ts`,
  and `events.ts` — shared types, configuration, email provider adapter, templates,
  outbox processor, and action helper.
- `lib/supabase/admin.ts` — server-only service-role client for outbox processing.
- `app/api/cron/email/route.ts` — protected reminder/outbox endpoint.
- `app/book/actions.ts`, `app/open-play/actions.ts`,
  `app/account/bookings/[reference]/actions.ts`, and `app/staff/actions.ts` —
  event enqueueing after successful booking, proof, payment, cancellation, and
  open-play changes.
- `components/booking/booking-group-confirmation.tsx` and
  `components/open-play/open-play-registration.tsx` — email fallback copy.
- `.env.example` — provider, sender, staff recipient, service-role, site URL, and
  cron secret placeholders.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Scoped `npx eslint` on the email modules, route, actions, and fallback components | Passed, no output |
| `npm run build` | Passed; 47 routes, including the protected `/api/cron/email` handler |
| Phase 9 migrations | Applied to production project `ybgcktpyntpcragegwec`, including the service-role read grants |
| Real provider delivery (Phase 9 close) | **Partial** — with `EMAIL_FROM` set to `D-Hidden Pickleball <onboarding@resend.dev>`, two staff messages for test booking `HG-8CFE694F` were received at the Resend account owner (`dhiddenpickleball@gmail.com`). The two player messages remain queued because the sandbox only delivers to that owner, not `joeljexanzjay@gmail.com`. |
| Reminder scheduler | **Not configured** — needs a platform cron or external scheduler with `EMAIL_CRON_SECRET` |
| SMS, waitlist promotion, marketing automation | Not built; waitlists do not exist yet |

### Required external setup

1. Create a Resend account, verify the club's sender domain, and set
   `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_DAILY_LIMIT`, and
   `EMAIL_MONTHLY_LIMIT` in the deployment environment. The API key and
   service-role key must never use a `NEXT_PUBLIC_*` prefix.
2. Set `SUPABASE_SERVICE_ROLE_KEY` server-side so the outbox processor can claim
   rows; set `NEXT_PUBLIC_SITE_URL` to the real site origin for email links.
3. Optional: set `STAFF_NOTIFICATION_EMAILS` only if staff email alerts are
   re-enabled; the current policy suppresses them.
4. Set `EMAIL_CRON_SECRET` and schedule a request to `/api/cron/email` every
   15 minutes with `Authorization: Bearer <secret>`. The route queues reminders
   and retries failed rows.
5. Send one test booking to a real inbox, then verify the sender name, logo,
   links, timezone, amount, and reference before launch.

### Phase 9 limitations

1. Staff test messages were confirmed received by the Resend account owner at
   Phase 9 close, but guest delivery is not yet confirmed. A verified Resend
   sender is required before real guest recipients can receive mail.
2. The 24-hour reminder interval is an implementation choice; the client can
   change it before launch.
3. At Phase 9 close, Resend was the configured provider (8 November 2026),
   after a brief Brevo trial. It was replaced by Mailjet on 9 November 2026.
   Changing providers again requires editing the server adapter, not the booking
   actions or templates.
4. Email images and links use `NEXT_PUBLIC_SITE_URL`. While it is
   `http://localhost:3000`, Gmail cannot load the logo and recipients cannot open
   the booking/staff links. A public deployment or tunnel is required for those
   to work; a custom sending domain does not fix localhost links by itself.
5. There is no SMS, marketing automation, delivery webhook, or waitlist
   promotion. The outbox records send attempts, not provider-level opens or
   bounces.
6. The official GCash QR/account name is still pending, so payment messages use
   the existing test-payment wording and link to the booking page rather than
   embedding a QR image.

### Phase 9 extension — in-app realtime notifications (7 November 2026)

Authorized 7 November 2026. Scope is in-app notifications for players and staff
only. Email remains the off-app channel; SMS, browser push, and marketing
automation are not included.

#### Implemented

- **Durable inbox:** `public.notifications` stores one row per recipient, with
  an event, title, short body, target link, optional booking/group/session
  reference, and a per-recipient dedupe key. RLS lets a user read and mark only
their own rows; clients cannot insert or delete.
- **Realtime transport:** an `after insert` trigger calls
  `realtime.send(..., private => true)` on the topic
  `notifications:<recipient id>`. A `realtime.messages` policy authorizes the
  topic from `auth.uid()`. Broadcast failures are caught so a Realtime outage
  cannot break the booking or payment transaction.
- **Event fan-out:** `queue_notifications()` reuses the Phase 9 email dedupe
  keys and the existing `enqueue_booking_email_event()` seam, so booking
  received, open-play reserved, proof received, approved, rejected, cancelled,
  and session-changed events reach both channels. Staff alerts exclude the staff
  member who performed the action. Staff-driven confirmed/completed/no-show and
  open-play attendance changes are recorded through `notify_booking_update()`.
  The open-play capacity trigger now also writes a staff notification.
- **Client:** a single root `NotificationsProvider` subscribes to the private
  per-user channel, shows a toast, refreshes server-rendered pages, and reloads
  the inbox on subscribe, reconnect, focus, and a 60-second fallback poll, so
  missed socket messages are recovered from the table.
- **UI:** a bell with unread count and popover in the public header, account
  header, and staff rail/mobile header, plus `/notifications` history with
  mark-all-read.

#### Files

- `supabase/migrations/20261107000500_phase9_realtime_notifications.sql`
- `lib/notifications/types.ts`, `events.ts`, `format.ts`
- `components/notifications/notifications-provider.tsx`,
  `notification-bell.tsx`, `mark-all-read-button.tsx`
- `app/notifications/page.tsx`, `app/layout.tsx`, `app/staff/actions.ts`,
  `components/site/site-header.tsx`, `components/auth/auth-top-bar.tsx`,
  `components/staff/staff-nav.tsx`, `components/ui/icons.tsx`

#### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Scoped `npx eslint` on the notification modules and wiring | Passed, no output |
| `npm run build` | Passed; 48 routes, `/notifications` dynamic |
| Migration applied to production | **Not applied** — requires `npx supabase db push` |
| Live Realtime delivery | **Not run** — needs the migration applied and the project's private-channel setting verified |

#### Required setup and limitations

1. Apply the migration. It is additive (new table, policies, functions, and
   triggers) and does not change booking, payment, or email behavior.
2. Confirm Realtime is enabled for the project and private channels are
   permitted. No client key or environment variable is added.
3. The bell and toast only cover an open site tab. Off-site alerts remain email;
   browser push is deferred.
4. Staff in-app recipients come from `profiles.role = 'staff'`, not the
   `STAFF_NOTIFICATION_EMAILS` list. Keep both in sync when staff change.
5. Notification history is capped at 30 in the bell and 50 on the history page;
   older rows remain in the table.

## Phase 8 — Staff operations desk (6 November 2026)

Authorized 6 November 2026. Scope was limited to the staff dashboard, daily
operations, bookings and payments, open play, court blocks, and reports. Coaching
and DUPR were not added.

### Implemented

- **Focused staff shell:** a navy desktop rail and compact mobile menu, a clear
  page title and date, and no generic admin-template sidebar. Screen readers get
  a skip link, the current section is marked, and staff pages are always dynamic.
- **Today dashboard:** today's KPIs, an hour-by-hour court and open-play
  timeline, and a short attention queue for payments and expiring holds. The
  dashboard links directly to the next action instead of presenting every
  management screen at once.
- **Payment verification:** a queue of `awaiting_verification` proofs with a
  short-lived signed URL, amount, booking/player facts, and approve/reject
  actions. Rejection requires a reason. Approval marks the payment paid and
  confirms the related booking or group; rejection returns both to a consistent
  state.
- **Bookings:** search by booking reference, group reference, player name, email,
  or phone; filter by status; open a booking or group detail with reschedule-safe
  facts, payment history, staff record-payment, status changes, and cancellation.
  Group rows are treated as one reservation for status and payment actions.
- **Walk-ins:** staff can create a confirmed walk-in against an existing player
  account, choose court, start, duration, rate, and whether payment was collected
  now. Walk-ins cannot invent an account because bookings reference a real
  profile; the form explains that constraint.
- **Open play:** staff can list and create sessions, edit schedule/price/capacity/
  level/status, cancel a session with a reason, and open a roster with player and
  payment information. Attendance and registration status can be updated, with
  capacity enforced on restore.
- **Courts:** staff can close one court or all courts for a date or time range
  with a reason, and remove an existing block.
- **Reports:** a daily report of bookings, paid revenue, open-play registrations,
  and court utilisation, plus a CSV export for the selected date range.
- **Database guards:** staff functions validate staff role, require reasons for
  destructive changes, prevent confirmation of an expired hold, and prevent
  restoring an open-play registration beyond capacity.
- **Account entry point:** players with the `staff` role see a **Staff dashboard**
  link on `/account`; other players see a short staff-access notice.

### Files

- `supabase/migrations/20261106000600_phase8_staff_operations.sql` — staff-only
  review, payment, booking, group, open-play, and walk-in functions.
- `supabase/migrations/20261106000700_phase8_staff_guards.sql` — expired-hold and
  open-play capacity triggers.
- `app/staff/layout.tsx`, `components/staff/staff-shell.tsx`, and
  `components/staff/staff-nav.tsx` — guarded staff frame and navigation.
- `app/staff/page.tsx` — Today dashboard, timeline, and attention queue.
- `app/staff/actions.ts` — all staff server actions and path validation.
- `app/staff/payments/page.tsx` and `components/staff/payment-review.tsx` —
  payment queue and review cards.
- `app/staff/bookings/page.tsx`, `app/staff/bookings/[reference]/page.tsx`, and
  `app/staff/bookings/new/page.tsx` — search, detail, and walk-in flow.
- `app/staff/open-play/page.tsx` and `app/staff/open-play/[id]/page.tsx` —
  session management and roster/attendance.
- `app/staff/courts/page.tsx` — court blocks.
- `app/staff/reports/page.tsx` and `app/staff/reports/export/route.ts` — daily
  report and CSV export.
- `lib/staff/auth.ts`, `lib/staff/time.ts`, `lib/staff/types.ts`, and
  `lib/staff/reports.ts` — staff access, Manila time, shared types, and report
  aggregation.
- `lib/supabase/proxy.ts` and `proxy.ts` — signed-out and non-staff redirects
  before a staff page renders.
- `app/account/page.tsx` and `components/ui/icons.tsx` — staff entry point,
  access notice, and staff icons.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Scoped `npx eslint app/staff app/account/page.tsx components/staff lib/staff proxy.ts lib/supabase/proxy.ts` | Passed, no output |
| `npm run build` | Passed; 46 routes, including every `/staff` page and the CSV export |
| Phase 8 migrations | Applied to the linked production project; all seven staff functions and both guard triggers exist |
| Staff foreign keys | Confirmed `bookings_player_id_fkey`, `booking_groups_player_id_fkey`, `payments_booking_id_fkey`, `payments_group_id_fkey`, and `open_play_registrations_player_id_fkey` for the PostgREST joins |
| Unauthenticated staff routes | `/staff`, `/staff/bookings`, `/staff/payments`, `/staff/open-play`, and `/staff/reports/export` return `307` to `/sign-in` with the staff return path; the public homepage still returns `200` |
| Signed-in staff dashboard and actions | **Not run** — production has two player profiles and no staff profile |
| Payment approval/rejection, walk-in, attendance, court block, and CSV content | **Not run** — need a staff session and real operational data |
| Mobile staff layout and keyboard/screen-reader traversal | **Not run** — no staff session for authenticated visual inspection |

### Phase 8 limitations

1. **No staff account yet:** production has no profile with `role = 'staff'`, so
   the console redirects every current account to `/account`. Promote the intended
   staff profile (or create the staff auth user and promote it) before launch;
   there is intentionally no self-service staff promotion screen.
2. The signed-in UI and every write action still need a live staff pass: payment
   approval/rejection, walk-in creation, attendance, court blocking, and CSV
   content have not been exercised.
3. Payment verification is manual and tied to the current test GCash QR. The
   official QR/account name is still pending; there is no automated reconciliation
   or refund action.
4. Staff can close courts for a date or time range, but there is no recurring
   closure or holiday schedule yet.
5. Reports use recorded bookings and payments only; they do not reconcile against
   GCash, and CSV exports raw operational fields for internal use.
6. Notifications, audit-history screens, staff management, coaching, and DUPR
   remain outside this phase.

## Phase 7 — Court reservation and open play (6 November 2026)

Authorized 6 November 2026. The court slice covers live availability, trusted
booking creation, confirmation, and account history. Open play was added on the
same day after the project owner supplied implementation defaults. Private
payment-proof upload is an early Phase 8 slice; staff review, staff management
screens, coaching, DUPR, and notifications were not added.

### Implemented

- **Live booking overlay:** the **Book a court** buttons open a real in-page
  overlay; the page stays behind it. Desktop shows a centered panel and mobile
  shows a full-screen sheet. The modal keeps the calendar and start-time grid
  side by side on desktop, shows a compact 3/4-column time grid, hides the
  duplicate rate/policy blocks, and initially limits the grid to 12 times with a
  **Show more times** control. The direct `/book` route remains as a fallback.
  Visitors can see live times and computed prices before signing in; the review
  step requires an account and saves the contact details used for the booking.
- **Grouped multi-date cart:** a player can add contiguous time ranges on more
  than one date before reviewing. The cart shows each range, its own price, and
  the combined total. Reviewing creates one `booking_groups` record with one
  group reference, one 15-minute hold, one total, and one GCash proof. Each
  individual range remains a normal `bookings` row linked by `group_id`, so the
  existing overlap constraint still protects every slot.
- **Public availability:** `get_court_availability(date, duration)` returns only
  bookable hourly starts for active courts, inside configured operating hours,
  excluding closures, active reservations, past times, and times without a
  configured rate. It never returns another player's booking details. The court
  booking UI loads one-hour blocks and groups contiguous free hours, so a player
  can choose a start hour and an end hour instead of a fixed session length.
- **Expired holds:** `release_expired_court_holds()` releases expired pending
  bookings and their active reservations. Availability calls it lazily, and
  booking creation calls it again before the atomic insert. A scheduled cleanup
  remains future work.
- **Trusted creation:** the server validates contact fields, the selected slot,
  a whole-hour duration, hourly starts, and terms acceptance. It checks the signed-in user
  and verified email, saves the profile name/mobile, then calls the existing
  `create_court_booking` function. The browser price is never trusted; the
  database recalculates the amount and remains the final authority on double
  booking through the GiST exclusion constraint. A Phase 7 trigger also rejects
  non-hourly online starts from a direct RPC call.
- **Confirmation:** the created booking is shown with its reference, court,
  time, amount, and a live 15-minute countdown. When the countdown reaches zero,
  the upload form closes and the page tells the player the slot may have been
  released. Booking and payment status stay separate: the request is
  `pending`/`unpaid`, and the page never marks it paid. The confirmation now
  shows the project owner's test GCash QR, labelled **Test**, with a download
  link, while the club's official QR and receiving account name remain on hold.
  The site does not process the payment.
- **Private proof upload (early Phase 8):** the booking confirmation and
  booking detail page both show the GCash QR, a download link, and a screenshot
  upload form. A player can submit proof immediately after creating the booking,
  without opening another page. Files go to the private `payment-proofs` bucket
  under the player's folder and are recorded by the owner-only
  `submit_payment_proof` function. A proof submitted before the hold expires
  confirms the slot and moves payment to **Awaiting verification**; it never
  marks the payment **Paid**. The confirmation updates to confirmed in place,
  and the player can view the submitted proof through a short-lived signed URL.
  Staff review and rejection are not built.
- **Open play:** `/open-play` groups upcoming normal open-play sessions by
  Saturday date with a compact date strip and three short session rows, showing
  the live time, skill level, price, and remaining places without a long card
  scroll. Clicking a session row opens an open-play overlay on the same page,
  showing the session facts, a short before-you-play list, and a one-place
  registration control; on mobile the registration panel comes before the
  supporting notes. `/open-play/[id]` remains as a direct-link fallback. The
  database
  locks the session row and rechecks capacity before creating the booking, so
  the last-place race cannot oversell. The confirmation appears in place with
  the reference, GCash QR, and private proof upload. Open-play bookings are
  `confirmed`/`unpaid` immediately; they do not use the court 15-minute hold.
- **Open-play defaults:** ₱75 per player, Saturdays, 120 minutes, 12 places,
  with beginner (8:00 AM), intermediate (10:00 AM), and advanced (4:00 PM)
  sessions. The migration seeds 52 Saturdays as editable rows. The price,
  schedule, capacity, level, and status are database values, not UI constants.
- **Account history:** successful court bookings and open-play places appear in
  the existing `/account` history and detail routes. Status and payment labels
  use the shared helpers, and open-play entries show their level. Ranges with
  the same group reference collapse into one group card that opens
  `/account/bookings/group/[reference]`; direct links to an individual grouped
  booking redirect to that group detail.
- **Public links and copy:** the header, footer, homepage, courts pages, visit
  page, account empty state, FAQ, and policies now point to `/book` or
  `/open-play` and describe live booking, open play, the 15-minute court hold,
  and staff-verified payment. The Phase 3 preview remains at
  `/design-preview/booking` for internal reference but is no longer linked from
  public pages.
- **Not built:** staff payment review and rejection, staff open-play
  management screens, self-service cancel/reschedule, staff booking tools,
  scheduled hold cleanup, email/SMS reminders, coaching, and DUPR.

### Decisions

- Availability uses hourly start times because partial-hour starts, the maximum
  booking window, buffer, and weekend rates are still unconfirmed. Players can
  now choose any contiguous end hour within the free block; the amount is the
  sum of the hourly rates across that range, including the 5:00 PM change. This
  was an explicit 6 November implementation change from the fixed 60/90/120
  picker. Existing 60/90/120 rows and staff-created bookings remain valid.
- Availability is public; the review step is where sign-in, email verification,
  and contact details are required.
- Edge cases such as an expired hold, a taken slot, an unverified email, a
  profile write failure, and an expired session return explicit states. A taken
  slot offers a fresh availability load instead of silently retrying.
- The live confirmation uses the project owner's test QR and labels it as a test
  account. The club's official QR and account name remain open; replacing the QR
  is a configuration change in `lib/payment.ts`, not a component edit.
- Proof upload confirms the slot while payment stays **Awaiting verification**.
  This follows `D-08`: a proof submitted before the hold expires prevents the
  automatic cancellation, but only staff can verify the incoming transfer.
- Open play uses the owner's defaults rather than waiting for client-confirmed
  business rules. Sessions are editable database rows, so staff can change the
  price, time, level, capacity, and status without a code change. The staff
  management UI is intentionally deferred to Phase 8.

### Files

- `supabase/migrations/20261106000100_phase7_court_availability.sql` —
  availability, lazy expired-hold release, and hourly-start trigger for online
  bookings, with the required execute grants.
- `supabase/migrations/20261106000400_court_booking_ranges.sql` — allows one
  booking to cover a contiguous whole-hour range (3–17 hours) while keeping the
  original 60/90/120 rows valid, and updates the amount/creation functions.
- `supabase/migrations/20261106000500_booking_groups.sql` — `booking_groups`,
  `bookings.group_id`, group-aware payments, group creation and proof
  submission functions, RLS, and grants.
- `app/book/actions.ts` — availability action, single/group booking creation
  actions, server validation, error mapping, and confirmation payloads.
- `app/book/page.tsx` — direct `/book` fallback route, viewer/court loading,
  metadata, and streaming skeleton.
- `components/booking/court-booking.tsx` — live date/court selection, multi-date
  range cart, availability states, review form, submission, confirmation,
  payment instructions, inline proof upload, and mobile action bar.
- `components/booking/booking-group-confirmation.tsx` — grouped confirmation
  with one reference, total, hold, QR, and proof form.
- `components/booking/booking-modal-provider.tsx` — root client provider and
  in-page overlay for court and open-play flows, including loading, error,
  body-scroll lock, Escape-to-close, and focus-on-close.
- `components/booking/booking-trigger.tsx` — reusable page button that opens the
  court overlay without navigating.
- `components/ui/payment-instructions.tsx` — reusable QR/amount/reference block;
  the sample badge and caption are now configurable.
- `lib/payment.ts` — current test GCash QR, download name, and public label.
- `public/qr/gcash-test-qr.png` — square crop of the project owner's stand-in QR;
  the QR code still decodes and the original `gcash-sample.jpg` is untouched.
- `app/account/bookings/group/[reference]/page.tsx` — grouped reservation detail
  with all ranges and the shared payment proof.
- `app/account/bookings/[reference]/actions.ts` — validates the signed-in owner,
  booking reference, and private path, then records the proof.
- `components/account/payment-proof-form.tsx` — client-side type/size checks,
  session check, private upload, transaction reference, and honest
  pending/success states; reusable on confirmation and booking detail.
- `supabase/migrations/20261106000200_payment_proof_upload.sql` — owner-only
  proof submission, booking confirmation on proof, and owner cleanup policy.
- `supabase/migrations/20261106000300_open_play.sql` — open-play session and
  registration tables, RLS, public capacity reads, atomic registration, and 52
  seeded Saturdays.
- `app/open-play/page.tsx` — public session list grouped by Manila date.
- `app/open-play/[id]/page.tsx` — direct-link session detail fallback, compact
  facts, capacity, viewer state, and registration entry; the registration card
  is first on mobile.
- `components/site/flow-frame.tsx` — shared modal-style frame used by the direct
  open-play fallback, with an internal scroll area and close action.
- `components/open-play/open-play-browser.tsx` — date strip and compact session
  rows for the public open-play index.
- `app/open-play/actions.ts` — signed-in/verified registration action and
  capacity/duplicate/error mapping.
- `components/open-play/open-play-registration.tsx` — one-place registration,
  in-place confirmation, GCash instructions, and proof upload.
- `lib/open-play.ts` — session types, level labels, capacity helpers, and RPC
  row mapping.
- `lib/bookings.ts` — availability/confirmation types, open-play booking labels,
  and Manila date/minute formatting helpers.
- Public links and copy: `components/site/site-header.tsx`,
  `components/site/site-footer.tsx`, `components/home/home-page.tsx`,
  `app/courts/page.tsx`, `app/courts/[slug]/page.tsx`, `app/visit/page.tsx`,
  `components/account/booking-list.tsx`, and `lib/policies.ts`.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Scoped `npx eslint app/book components/booking/court-booking.tsx components/ui/payment-instructions.tsx lib/bookings.ts lib/payment.ts lib/policies.ts lib/faq.ts components/site/site-footer.tsx` | Passed, no output |
| `npm run build` | Passed; 35 pages, including `/book`, `/open-play`, and `/open-play/[id]` as partial-prerender routes |
| `npx supabase db push --remote --dry-run` | Passed; `Remote database is up to date`, so the Phase 7 migration is applied |
| Unauthenticated `/book` HTTP check | Returned 200 and rendered the booking shell on the production build |
| Payment policy, footer, and QR asset check | `/policies/payments`, `/club/faq`, `/`, `/book`, and `/qr/gcash-test-qr.png` returned 200; the QR is served as `image/png` and the policy/footer rendered the test-QR copy |
| Test QR crop | 540×540 PNG decodes to the same payload as `gcash-sample.jpg` (OpenCV; matching SHA-256 prefix) |
| Proof-upload migration | Applied to the linked project; `submit_payment_proof` exists as a security-definer function and the owner delete policy is present |
| Proof-upload grants | `authenticated` can execute `submit_payment_proof`; `anon` cannot |
| Scoped proof-upload checks | `npx tsc --noEmit`, scoped `npx eslint`, and `npm run build` passed after the confirmation upload form, live hold countdown, and expired-hold state were added |
| Open-play migration | Applied to the linked project; `open_play_sessions`, `open_play_registrations`, public read functions, and the registration RPC exist |
| Open-play seed | 156 future sessions (52 Saturdays × 3 levels), ₱75, 120 minutes, capacity 12 |
| Open-play function grants | `anon` and `authenticated` can read sessions; `authenticated` can register; `anon` cannot register |
| Anonymous open-play RPC | `set local role anon; select count(*) from get_open_play_sessions()` returned 156 |
| `/open-play` production route | Returned 200; rendered the seeded beginner session, ₱75 price, and session link |
| `/open-play/[id]` production route | Returned 200; rendered the session, 8:00 AM time, price, and signed-out registration state |
| Open-play build | `npx tsc --noEmit`, scoped `npx eslint`, and `npm run build` passed; 35 pages generated, including `/open-play` and `/open-play/[id]` |
| Court range migration | Applied to the linked project; `bookings_duration_minutes_check` accepts 60/90/120 or 3–17 whole hours, and `calculate_court_amount`/`create_court_booking` accept the same range |
| Court range UI check | Headless at 390px and 1440px: layout rendered at both widths, and the 390px viewport measured no horizontal page overflow. Selecting 9 PM and a 3-hour end showed 9 PM–12 AM and ₱900 in the summary. This was a visual/UI check, not a real booking. |
| Court range build | `npx tsc --noEmit`, scoped `npx eslint`, and `npm run build` passed after the range picker |
| Group migration | Applied to the linked project; `booking_groups`, `bookings.group_id`, both group functions, the group payment check, and grants exist |
| Grouped cart UI check | Headless at 390px: adding 10 PM–12 AM on 6 November and 10–11 PM on 7 November produced two cart rows, 2 dates, 3 hours total, and ₱900. This was a visual/state check, not a real booking. |
| In-page modal check | Headless at 390px and 1440px: clicking **Book a court** on the homepage opened `[role=dialog]`, locked body scroll, and kept the page behind it. Desktop panel measured 1152px wide; mobile measured 390px. Clicking an open-play row opened the session overlay with the reserve card first. |
| Modal cart check | Headless at 390px: choosing 7 November, tapping 7:00 AM, then 8:00 AM added a range and enabled **Review**; the 12-slot collapsed grid exposed **Show more times** for 36 available slots. This was a visual/state check, not a real booking. |
| Group flow build | `npx tsc --noEmit`, scoped `npx eslint`, and `npm run build` passed after the grouped cart, modal frame, and account group card; 36 pages generated. |
| Open-play registration and proof upload | **Not run** — needs a signed-in verified player and a real test image |
| Live confirmation QR and countdown render | **Not run** — the confirmation appears only after a signed-in booking |
| Live proof upload | **Not run** — needs a signed-in booking and a real test image |
| Authenticated sign-in return path, profile save, booking, confirmation, and account history | **Not run** — no test player session or credentials were available |
| Group creation, grouped proof upload, and grouped account detail | **Not run** — no signed-in verified player session; the migration, RPC shape, cart state, and layout were checked instead |
| Responsive screenshots, keyboard traversal, screen reader, real devices | **Not run** |

### Phase 7 limitations

1. **Signed-in verification:** live court availability/creation and open-play
   registration were not exercised in this report against a signed-in player, so
   the RPC behavior, capacity race, profile save, confirmation, proof upload,
   and account-history rendering remain runtime checks. The migrations are
   applied and the public reads were checked.
2. The official GCash QR and receiving account name (`D-07`) are still pending.
   The live confirmation shows the project owner's test QR, clearly labelled as
   a test account; it is not the club's receiving account. The client's QR is
   expected soon. Staff payment review and rejection are still Phase 8 work.
3. Open play now runs on owner-supplied defaults, not client-confirmed business
   rules. The 52 seeded Saturdays will run out, and staff can edit the rows
   directly but have no management screen until Phase 8. There is no waitlist,
   attendance workflow, or staff session-cancellation action. Partial-hour
   starts, the booking window, buffer, holiday closures, and weekend rates
   remain open.
4. Expired holds are released lazily by availability reads and booking attempts;
   there is no scheduled cleanup job yet. A booking left untouched with no
   subsequent availability request stays `pending` until one arrives.
5. The existing `/design-preview/booking` route remains for design reference and
   still contains sample data. It is not linked publicly, but it is still
   reachable by URL.
6. Proof upload is not staff-reviewed yet. A submitted screenshot confirms the
   slot and leaves payment `awaiting_verification`; there is no staff queue,
   rejection action, or notification yet. A fake or unreadable proof can hold a
   slot until staff handle it manually.
7. Group creation and grouped proof upload have not been run against a signed-in
   player. The migration, RPC shape, cart state, and grouped account rendering
   are implemented, but the atomic multi-range insert, rollback on one taken
   range, and one-proof payment flow still need a live session check. The cart is
   capped at 8 ranges as an implementation guard; that is not a confirmed
   business maximum.
8. The overlays are in-page dialogs with body-scroll lock and Escape-to-close,
   but there is no focus trap yet. Keyboard traversal, screen-reader behavior,
   and focus return to the exact trigger have not been tested.
9. No automated test suite exists.

### Required before the Phase 7 court-reservation slice can be called verified

Use a verified player session to check availability, a successful hold, a
multi-hour hold, a duplicate-slot rejection, a grouped multi-date hold with one
proof, the sign-in return path, profile save, confirmation,
the live countdown and expired state, the downloadable test QR, a real proof
upload, and the account history/detail views. Also register for an open-play
session, re-register to check the duplicate path, fill the last place in a test
session to check the capacity rejection, and confirm the open-play booking
appears in account history. Replace the test QR only after the official `D-07`
details are supplied.

### Recommended next phase

Phase 8 — staff payment review/rejection, verification queue, open-play
management, and staff booking surfaces, after explicit approval. Proof upload is
already an early slice; the current test QR can exercise the flow. Replace it
with the client's official `D-07` details before launch. Open-play defaults are
in place, but the staff editor, attendance, waitlist, and session cancellation
rules remain Phase 8 work. Do not start the deferred coaching or DUPR work.

## Phase 6 — Account and player experience (6 November 2026)

Authorized 6 November 2026. The work stays on the account/profile and booking
review surface. No Phase 7 booking creation, payment proof, staff, open-play,
coaching, or DUPR implementation was added.

### Implemented

- **Editable profile:** `/account` now edits full name and an optional mobile
  number through a server action. Zod validates both fields on the server, and
  the action updates only `profiles.full_name` and `profiles.phone`. The
  database column grants and RLS remain the final guard.
- **Sign-in identity:** email stays read-only because it is the account's
  sign-in address; role stays club-controlled. The page links to password
  recovery and shows the email-verification state.
- **Booking history:** the account page reads the signed-in player's bookings
  from `bookings`, with the related service and court, and splits them into
  upcoming and past/cancelled. Each card shows date, Philippine time, court,
  duration, reference, booking status, amount, and payment status.
- **Booking detail:** `/account/bookings/[reference]` scopes the lookup by both
  reference and `player_id`. It shows the reference, court time, booking and
  payment status, amount, hold/confirmation/cancellation timestamps, the 24-hour
  cancellation guidance, and the club's phone/email. Unknown or another player's
  references use the account-specific not-found state.
- **Session expiry:** unauthenticated access to the account or a booking detail
  redirects to sign-in with `notice=session-expired`; the sign-in form explains
  that the session ended and preserves the return path.
- **States:** the profile form has pending, success, validation, and save-error
  feedback. Booking history has loading skeletons, empty, read-error, upcoming,
  past/cancelled, and per-status/payment badges. The booking route has a
  streaming skeleton and a not-found screen.
- **Not built:** booking creation/availability, payment proof upload or review,
  self-service cancel/reschedule, staff booking tools, notifications, open play,
  coaching, and DUPR.

### Decisions

- Full name is required (2–100 characters). Mobile is optional but validated
  when present (7–15 digits, allowing spaces, `+`, `-`, and parentheses).
- Email is not editable in this phase; changing the sign-in identity needs a
  separate, verified flow.
- No sample bookings are fabricated. Until Phase 7 creates real bookings, the
  account history correctly shows the empty state.
- Cancellations and reschedules remain club-mediated per `D-13`; the account
  shows contact actions and the policy instead of controls the business cannot
  honour.
- The detail route returns the same not-found state for a missing reference and
  another player's reference, so it does not confirm whether a booking exists.

### Files

- `app/account/page.tsx` — account overview, profile editor, booking history,
  contact guidance, and sign-out.
- `app/account/actions.ts` — server-side profile update with validation and
  session handling.
- `app/account/bookings/[reference]/page.tsx` — scoped booking detail.
- `app/account/bookings/[reference]/not-found.tsx` — account-specific missing
  booking state.
- `components/account/account-shell.tsx`, `profile-form.tsx`, `booking-list.tsx`,
  `detail-row.tsx` — shared account frame and components.
- `components/auth/sign-in-form.tsx` — session-expired notice.
- `lib/bookings.ts` — status labels, payment descriptions, and `Asia/Manila`/PHP
  formatting.
- `lib/validation/profile.ts` — profile schema and field errors.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Scoped `npx eslint` on the changed account, auth, booking, and validation files | Passed, no output |
| `npm run build` | Passed; 32 pages, including `/account` and `/account/bookings/[reference]` as partial-prerender routes |
| Unauthenticated `/account` | Headless Chrome landed on sign-in with the **Session expired** notice |
| Unauthenticated booking detail | Headless Chrome landed on sign-in with the **Session expired** notice and a preserved return path |
| Sign-in notice | Appears with `notice=session-expired`; absent on plain `/sign-in` |
| Production server | No runtime errors in the `next start` log during the checks |
| Authenticated account, profile save, booking query, and booking rendering | **Not run** — no test session or credentials were available |
| Responsive screenshots, keyboard traversal, screen reader, real devices | **Not run** |

### Phase 6 limitations

1. The account and booking detail screens could not be browser-inspected while
   signed in, and the profile update and booking queries were not exercised
   against a live session. Type, lint, build, and unauthenticated redirect checks
   passed.
2. At Phase 6 close, booking history was empty because Phase 7 had not created
   bookings. No sample rows were inserted. Phase 7 now supplies real bookings
   once its migration is applied.
3. Profile editing intentionally excludes email and role. There is no
   email-change flow in this phase.
4. Cancel/reschedule controls are absent by policy; players must contact the
   club. If the business later approves self-service changes, the policy and UI
   need a new phase.
5. No automated test suite exists.

### Recommended next phase

Phase 7 — core booking engine for courts and normal open play, after explicit
approval. It should replace the booking preview with real availability, atomic
creation, confirmation, and the existing account history. Open play remains
unconfirmed and must not be assumed in scope.

## Phase 5 — Public website, content, and club location (5 November 2026)

Authorized 5 November 2026 at full public-site scope. The work stays UI and
content only: no booking engine, payment, open-play, staff, coaching, or DUPR
implementation was added.

### Implemented

- **Public routes:** `/`, `/courts`, `/courts/court-1`, `/courts/court-2`,
  `/visit`, `/club`, `/club/rules`, `/club/faq`, `/policies/booking`,
  `/policies/payments`, `/policies/privacy`, `/policies/terms`, plus a custom
  root not-found screen and segment not-found screens for unknown court and
  policy slugs.
- **Shared content:** `lib/courts.ts`, `lib/faq.ts`, and `lib/policies.ts` hold
  the court, FAQ, booking, payment, privacy, and terms copy. The privacy notice
  covers account and booking data, payment proof, sharing, retention, Data
  Privacy Act rights, cookies, and the map. The terms cover accounts, bookings,
  payments, refunds, conduct, liability, content, and governing law.
  `components/site/page-header.tsx`, `public-page.tsx`, and
  `not-found-content.tsx` provide the common public-page structure.
- **Navigation:** the header and footer now point at real public routes. The
  header uses a solid surface on interior pages and stays an overlay on the
  homepage. Below 768px the header shows the logo, the compact **Book a court**
  action, and the menu; account access, hours, and phone are inside the menu.
- **Homepage:** production pass. Court cards now link to the court detail pages,
  the preview-only build badge is removed, and the remaining booking links are
  labelled as an interactive preview.
- **Courts:** both courts list their supplied photograph, daily hours, confirmed
  rates, and session lengths. Detail pages state only confirmed facts and do not
  claim lighting, covered areas, parking, or other unconfirmed facilities.
- **Visit:** the existing lazy-loaded OpenFreeMap map is reused, with the address,
  coordinates, hours, phone, email, and directions written as text. The map keeps
  its loading and failure fallback.
- **Club, rules, and FAQ:** the club page uses confirmed facts only. The rules and
  policy pages publish the 15-minute hold, payment deadline, GCash review,
  24-hour cancellation outcomes, and group-booking rule. Unconfirmed rules are
  named as open rather than stated as policy.
- **Not built:** open-play routes, booking persistence, availability queries,
  payment proof upload/review, staff tools, and any coaching or DUPR surface.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint app components lib` | Passed, no output |
| `npm run build` | Passed; 31 pages generated, including all twelve public routes and the four policy pages |
| HTTP check (`next start` on port 3100) | All twelve public routes, including `/policies/privacy` and `/policies/terms`, returned 200; an unknown top-level path returned 404 |
| Browser audit (CDP) | All ten original public routes at 390, 768, and 1440, plus `/`, `/courts`, `/visit`, and `/club/rules` at 1024: no document-level horizontal overflow and exactly one `h1` per page. Privacy and terms were also checked at 390 and 1440 with no overflow and one `h1`. |
| Phone header (390) | Shows the logo, **Book a court**, and the menu button; **Sign in** is hidden; the menu opens with the public links, hours, phone, and booking action |
| Desktop header (1440) | Shows the four public links, theme control, **Sign in**, and **Book a court** |
| Themes | Light homepage, courts, visit, and privacy pages inspected; dark courts, rules, and terms pages inspected |
| Map | Loaded on `/visit` with OpenStreetMap/OpenFreeMap attribution visible; the existing failure fallback remains |
| Not run | Screen reader, real devices, Safari/Firefox, full keyboard traversal, Lighthouse, and user testing |

### Phase 5 limitations

1. At Phase 5 close, the booking engine was not connected and booking actions
   opened `/design-preview/booking` with a visible preview label. Phase 7 now
   replaces those public links with `/book`; the preview remains internal.
2. Open play remains unconfirmed. `D-10` is blank and the 5 November owner
   direction says not to assume it is in or out, so it is omitted and no
   open-play surface was built.
3. The facilities list (`D-04`), holiday closures (`D-05`), club story, and the
   official GCash QR/account name (`D-07`) remain unconfirmed. Pages omit them or
   label them as open. The live confirmation now uses the project owner's test
   QR, labelled **Test**; the internal preview still uses the marked sample.
4. The privacy notice and terms of use are plain-language policy, not legal
   advice. Client and counsel review is recommended before launch.
5. Public pages remain `noindex`. At Phase 5 close booking was still a preview,
   and the official QR is still on hold; removing `noindex` remains a launch
   decision, not part of the copy approval.
6. Next 16's partial prerender can serve the first uncached request for an
   unknown court or policy slug with a 200 shell before the 404 settles. No page
   links to an unknown slug.
7. No automated test suite exists.

### Recommended next phase

Phase 6 — account and player experience, after explicit approval. The privacy
notice and terms should also receive client/counsel review before launch. Phase 7
remains the phase that replaces the preview booking buttons with real
availability and booking creation.

## Phase 4 — Database, authentication, permissions, and security (4 November 2026)

Full detail is in `docs/PHASE_4_IMPLEMENTATION.md`.

### Implemented

- **Schema and migrations:** three ordered Supabase migrations under
  `supabase/migrations/` covering profiles, roles, club settings, courts,
  operating hours, closures, services, rates, bookings, court reservations,
  payments, and audit logs.
- **Integrity:** a GiST exclusion constraint on active court reservations plus a
  `security definer` booking function. The database, not the browser, rejects
  double bookings.
- **RLS and grants:** public read for active reference data; own-profile and
  own-booking access for players; staff-only management and audit reads. The
  authenticated column grant excludes `profiles.role`, and a trigger rejects
  role changes from an authenticated session.
- **Private storage:** a non-public `payment-proofs` bucket with owner-folder
  upload/read and staff read/delete policies.
- **Auth:** email/password, Google OAuth, email confirmation, forgot/reset
  password, and a friendly auth-code error page.
- **Session handling:** `@supabase/ssr` browser and server clients plus a Next.js
  16 `proxy.ts` that refreshes sessions with `getClaims()`.
- **Roles:** `player` and `staff` only. Every new account starts as a player;
  staff promotion is manual SQL until Phase 8. There is no manager/admin role.
- **Screens:** `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`,
  `/auth/callback`, `/auth/confirm`, `/auth/auth-code-error`, and `/account`.
  The site header and mobile menu link to the account or sign-in page.
- **Docs:** `docs/PHASE_4_IMPLEMENTATION.md` added; `docs/ux/CLIENT_DECISIONS.md`
  updated for `D-14` and `D-16`.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| Targeted `npx eslint` on changed source | Passed, no output |
| `npm run build` | Passed; 18 routes including the auth, account, callback, and confirm routes; proxy present |
| Route HTTP check with the live project | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, and `/account` render the real forms; the setup notice is gone |
| Desktop and mobile rendering | Headless Chrome at 1440×1000 and 390×844: no document-level horizontal overflow, one `h1` per page, forms render after hydration |
| Light and dark themes | Sign-in, sign-up, recovery, error, and account shells inspected |
| Live migrations | **Passed** — three migrations applied to `ybgcktpyntpcragegwec` |
| Live email sign-up, confirmation, sign-in | **Passed** — confirmed by the project owner |
| Live Google OAuth | **Passed** — confirmed by the project owner |
| Anonymous RLS and function probes | **Passed** — reference data readable; profiles, bookings, audit logs, writes, and privileged RPCs denied |
| Password recovery email | **Not run** |
| Authenticated cross-player, role-escalation, staff, and double-booking checks | **Outstanding** — need two live player sessions |

### Phase 4 limitations

1. Two runtime checks are deferred: overlapping `create_court_booking` rejection
   (Phase 7) and an end-to-end password-recovery email.
2. The Supabase SQL Editor verification output was not captured; configuration
   was confirmed by migration inspection plus live anonymous probes.
3. Staff MFA, the final password policy, and named staff accounts remain open;
   staff promotion is manual SQL.
4. The booking preview is not wired to the database. Payment proof upload/review
   is not implemented; only the table and private bucket exist.
5. Open play, attendance, coaching, and DUPR were deliberately not built.
6. No automated test suite exists.

### Required before Phase 4 can be called verified

Create or link the hosted Supabase project, add the public URL and publishable
key to `.env.local`, push the three migrations, then test sign-up, confirmation,
sign-in, Google OAuth, recovery, `/account`, role self-promotion rejection,
staff promotion by SQL, and an overlapping booking rejection.


## Revision — 4 November 2026 (map presentation and responsive pass)

Follow-up to the same-day fix above. Still Phase 3; no backend or new-phase work.

- **Map card:** the panel was rebuilt, not just its frame. The header pairs a pin
  badge with the confirmed address and a bordered "Get directions" action; the
  map sits inset in a rounded, ringed frame; the address hierarchy and pin
  coordinates stay below it; the footer is a single metadata line. The glassy
  stacked bands and the "MAP" kicker are gone.
- **Tiles:** switched from OpenFreeMap Liberty to Positron (style endpoint and
  v8 style JSON verified). The neutral basemap reads as current and keeps
  street and barangay labels legible under the white pin label.
- **Pin and label:** the popup label wraps within `min(16rem, 72vw)` so it cannot
  clip on narrow screens, and a soft ring layer (radius interpolated by zoom)
  marks the exact spot. Map rotation is disabled so labels stay upright; zoom is
  limited to 11–18.
- **Responsive check:** marker and popup stayed inside the map and inside the
  viewport at 1440×1000, 768×1024, 390×844, 360×740 and 844×390 landscape, with
  no horizontal overflow at any size.
- **Home and booking review (light and dark):** hero, courts, rates,
  how-it-works, location, FAQ, footer, booking step 1, review and payment were
  inspected and hold up against the approved direction. Only two adjustments
  came out of it: calendar cells are now 44px touch targets in a `max-w-md`
  column, and secondary map text was nudged up in contrast. The mobile action
  bar looked broken only because the Next.js development badge overlaps it; it
  is a dev-only overlay.
- **Files:** `components/home/club-map.tsx`,
  `components/booking/booking-preview.tsx`, `app/globals.css`.

### Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint` on the changed components | Passed, no output |
| `npm run build` | Passed; 10 routes; `club-map-frame` and the calendar utilities present in the emitted CSS |
| Map, five viewports | Marker and popup visible and inside the map at 1440/768/390/360, plus 844×390 landscape |
| Themes | Location band, map card and booking calendar checked in light and dark |
| Console | No errors on `/` or `/design-preview/booking` |
| Keyboard, screen reader, real devices | Not performed in this revision |

## Revision — 4 November 2026 (map frame, location detail, booking calendar)

Two fixes raised after reviewing the Phase 3 preview. Still Phase 3; no new
phase work and no backend changes.

- **Map frame:** the map region no longer depends on an arbitrary Tailwind
  height. `app/globals.css` now owns `.club-map-frame` (22rem, 26rem from
  40rem). With no height of its own, the container let MapLibre's canvas feed
  its size back into the page: the panel grew from 0 to over 14,000px and the
  lower page became unreachable. The frame now measures 416px at desktop and
  352px at 390px wide, unchanged through scroll and zoom.
- **Map label:** the marker popup keeps its own white pill. The design-system
  reset had left MapLibre's popup content transparent, so the navy label was
  unreadable over the dark band. The pill now shows the club name and the
  confirmed address line.
- **Location detail:** a strip below the map lists the confirmed address
  hierarchy — Purok / area Bung-aw, Barangay Pondol, Municipality Balamban,
  Province Cebu — with the confirmed pin coordinates. No street name, purok
  number, or landmark was invented.
- **Booking calendar:** the seven-day strip was replaced with a month calendar
  (Sunday-first, previous/next month, days outside the sample window disabled).
  The sample window is pinned to 5 Nov – 31 Dec 2026 so server and client render
  the same grid; it is labelled sample availability, not a real booking window.
- **Files:** `components/home/club-map.tsx`,
  `components/booking/booking-preview.tsx`, `app/globals.css`.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint` on the two changed components | Passed, no output |
| `npm run lint` (repository-wide) | Not clean: the run also lints the gitignored `.tmp-ui` Chrome profiles and reports errors there. Same state before this change |
| Map at 1280×900 | Frame 416px before, during, and after scroll and zoom; document height constant at 6,835px; page bottom reachable |
| Map at 390×844 | Frame 352px; detail strip in two columns; no horizontal overflow |
| Calendar at 1280×900 and 390×844 | November 2026 grid with 26 selectable days (5–30 Nov); choosing 14 Nov updated the summary date; previous arrow disabled in November, next arrow disabled in December (31 selectable days); no horizontal overflow |
| Console | No errors on `/` or `/design-preview/booking` |
| Build, keyboard, screen reader, real devices | Not re-run in this revision |

## Revision — 3 November 2026 (homepage and booking rebuild)

A second Phase 3 revision replaced the flat review presentation with a
customer-facing interface layer. It stays UI-only and does not begin Phase 4,
5, 6, or 7.

- **Route move:** the root route `/` is now the presentation-quality homepage.
  The phase review index moved to `/design-preview`, and the old
  `/design-preview/homepage` route redirects to `/` (HTTP 307). Both preview
  routes and the homepage are marked `noindex` while content is unapproved.
- **Design foundation:** semantic color tokens now drive light and dark themes
  from one contract. The theme follows the OS by default, can be switched from
  every shell, persists in `localStorage`, and is applied before first paint.
- **Motion system:** `motion` (Framer Motion's React package) was added. Hero
  entrance is CSS-only so it runs before hydration; below-fold sections reveal
  on view; selection pills, step transitions, FAQ disclosure, toasts, the mobile
  action bar, and payment-status feedback are animated. Reduced motion removes
  non-essential movement.
- **Homepage:** photography-led hero, court cards, rate panel, three-step booking
  explanation, confirmed-policy details, location band, accessible FAQ, and a
  final booking CTA. Only client-confirmed hours, courts, rates, durations,
  payment review, and the 24-hour cutoff are stated as facts. No testimonials,
  ratings, schedules, facilities, address, or map pin were invented.
- **Booking flow:** rebuilt with skeleton availability, grouped time slots,
  animated date/duration/court selection, empty states for no matching courts
  and no open times, inline field validation with focus management, a live
  sample hold countdown, copy-reference feedback, drag-free image selection,
  optimistic proof submission, status transitions, and a mobile action bar.
- **Components:** refreshed button, badge tint, alert, field, stepper, booking
  summary, policy notice, payment instructions; new shared icon set, theme
  toggle, toast, and motion primitives.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed, no output |
| `npm run build` | Passed; seven routes generated including the homepage, review index, booking preview, and design system |
| Production route audit | `/`, `/design-preview`, `/design-preview/booking`, `/design-system` at 390/768/1440: no horizontal overflow, one `<h1>` each, no console errors |
| Redirect | `/design-preview/homepage` returned HTTP 307 to `/` |
| Theme | Light and dark body/heading/card tokens verified; toggle persisted `dhidden-theme` |
| Hero first paint | Entrance computed to the CSS `rise-in` animation, not a hydration-gated style |
| Mobile header | 390px menu opened and exposed the section links |
| FAQ | Second question expanded to one visible region with `aria-expanded="true"` |
| Skeletons | Present on first booking load and again after a date change |
| Slot selection | Summary updated with court, date, time, duration, and a computed peso amount |
| Step focus | Review heading received focus after the exit transition |
| Validation | Submitting an empty review form rendered all three field errors |
| Payment step | Reached after valid details and terms; countdown, sample reference, and sample QR rendered |
| Mobile booking | 390px action bar appeared after selecting a slot |
| Keyboard / screen reader / real device / user testing | Still not performed |

### Revision limitations

1. **Lottie was not added.** No approved Lottie artwork exists, and hand-authored
   Lottie JSON would add bundle weight and a second animation system without
   improving the key moments. CSS and SVG motion cover the hero, selection,
   disclosure, confirmation, and status feedback. Lottie remains an option once
   licensed club motion assets exist.
2. **shadcn/ui was not adopted wholesale.** The repository already has an
   equivalent primitive layer with the same Tailwind token approach. Replacing
   it would rewrite working components without a visual gain; the primitives
   were refreshed in place instead.
3. The homepage is still a presentation preview. Real availability, accounts,
   and payments are not implemented. The address, map, phone, and email are now
   published; the open-play schedule, the facilities list, and the club's GCash
   code are not.
4. The booking flow remains local browser state. The countdown, reference,
   availability, and payment status are sample values.
5. No automated test suite exists. Verification was type, lint, build, HTTP, and
   headless-browser based.

## Revision — 3 November 2026

The client's exported questionnaire was reconciled and the supplied assets were
integrated.

- **Response 2 (30 October 2026, "Management") is authoritative.** Response 1
  (Edna Doster, 28 October) was reviewed and is not adopted. The register was
  rewritten to version 2.0 with per-decision status, and blanks stay open rather
  than being filled from Response 1.
- **Club name:** the project owner chose to match the logo, so the written name is
  **D-Hidden Pickleball Court & Bistro**. Confirmed as "D-Hidden Pickleball" on
  4 November 2026.
- **Assets integrated:** official logo in the header, footer, review index, and
  design reference; logo-derived app icons; two supplied court photographs on the
  homepage mockup and the design reference; a clearly marked sample GCash QR in
  the payment panel.
- **Booking preview revised:** account gate at review with required name, email,
  and mobile; daily 7:00 AM–12:00 AM availability; 60/90/120-minute durations;
  ₱250/₱300 rates with a computed amount; held-slot states; "past closing" guards;
  GCash as the only confirmed method; 24-hour cutoff and contact-the-club
  messaging.
- **Sample payment QR:** `public/qr/qr.jpg` was renamed to
  `public/qr/gcash-sample.jpg`. It is a personal account used as a stand-in, and
  the UI overlays a band that breaks the code plus a "do not send money" caption.
- **Resolved 4 November 2026:** the temporary-hold length (15 minutes), the
  payment deadline (the same window), the cancellation outcomes, the club name,
  the address and map pin, and the publishable phone and email. See
  `docs/ux/CLIENT_DECISIONS.md`. The remaining blockers are the club's real GCash
  code and account name, plus weekend, rounding, and booking-window pricing.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed on 3 Nov 2026. Re-checked 4 Nov: the project source is still clean; the bare command now fails only because ESLint walks the gitignored `.tmp-ui/` browser profiles (145 errors from Chrome's bundled extension scripts) |
| `npm run build` | Passed; four review routes plus `/icon.png`, `/apple-icon.png`, and `/_not-found` generated |
| Route and asset check (`next start`) | All four routes and the logo, court, QR, and icon files returned HTTP 200 |
| Overflow and heading audit | 4 routes × 3 widths (390/768/1440): no horizontal overflow, one `<h1>` each, no console errors |
| Selection and pricing | 34 slots across two courts; selecting 7:00 AM Court 1 produced ₱250 for 60 minutes |
| Gates | Review disabled until a slot is chosen; confirm disabled until terms accepted; three required account fields present |
| Sample QR | Rendered 174×319 with a visible "Sample · do not pay" band |
| Keyboard / screen reader / real device / user testing | Still not performed |


## Phase 3 deliverables produced

- Reusable booking-flow components:
  - `components/ui/stepper.tsx`
  - `components/ui/booking-summary.tsx`
  - `components/ui/status-pair.tsx`
  - `components/ui/policy-notice.tsx`
  - `components/ui/payment-instructions.tsx`
- Responsive, interactive court-reservation preview at
  `/design-preview/booking`, implemented in
  `components/booking/booking-preview.tsx`
- Design-system reference extended with the new components and states
- Temporary review index updated for Phase 3
- Homepage mockup updated to link to the booking preview and Phase 3 status
- `docs/PHASE_3_DESIGN.md` with scope, placeholder policy, checks, and limitations
- Step entrance motion added to `app/globals.css` with the global
  reduced-motion reset still in force

Phase 3 remains UI-only. No database, authentication, booking persistence, payment
integration, QR image, file storage, notification, staff tool, public-site page,
coaching, or DUPR feature was added.

## Phase 3 checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed, no output |
| `npm run build` | Passed; `/`, `/design-preview/booking`, `/design-preview/homepage`, `/design-system`, `/_not-found` generated as static routes |
| Production route check | `/`, `/design-system`, `/design-preview/homepage`, and `/design-preview/booking` returned HTTP 200 |
| Browser overflow and heading audit | No horizontal overflow and exactly one `<h1>` on every route at 390px, 768px, and 1440px |
| Console errors | None captured on any audited route |
| Booking selection | Summary updated to Court 1, Thu 29 Oct, 7:00 AM, 60 minutes |
| Step transition | Review disabled until a slot was selected; focus moved to the new step heading |
| Terms gate | Confirmation disabled until the preview-terms checkbox was selected |
| Confirmation state | Pending approval, Unpaid, sample reference, QR placeholder, and proof control rendered |
| Proof state | Local image selection enabled preview submission; payment moved to Awaiting verification |
| Mobile layout defect | Date strip initially stretched the 390px page; fixed with grid `min-w-0` constraints and re-tested |
| Keyboard traversal | Not performed beyond programmatic clicks and heading focus |
| Screen-reader review | Not performed |
| Real-device testing | Not performed |
| User testing | Not performed |
| Automated tests | No test suite exists |
| Tap-target audit | Not performed |

## Phase 3 exit status

| Exit criterion | Status |
| --- | --- |
| Existing Phase 1 visual direction retained | Met |
| Reusable booking-flow component layer | Met at design-preview level |
| Responsive court-reservation flow | Implemented and browser-inspected at 390px, 768px, and 1440px; not user-tested |
| Disabled, selected, pending, unpaid, and proof states | Implemented as preview states |
| Prices, final policies, and payment details visible before confirmation | Structure present; real values remain deferred |
| Account and confirmation-model decisions | Shown as explicit decision placeholders; `D-01` and `D-02` remain open |
| Accessibility intent | Focus handling, `aria-current`, `aria-pressed`, labels, and reduced-motion rules implemented; no screen-reader or full keyboard pass |
| Production readiness | **Not met** — placeholders, missing assets, missing business answers, and no user/device testing |

Phase 3 completes the visual and component layer only. It does not authorize or
implement Phase 5 public pages or Phase 7 booking logic.

## Phase 2 deliverables produced

- Sitemap and route-level information architecture for public, auth, player,
  booking, and staff areas
- Navigation model for public, mobile, booking wizard, account, and staff shells
- End-to-end player journeys: court booking, returning-player booking, open play,
  cancellation/reschedule, payment proof, location, and account recovery
- Staff workflows: dashboard, check-in/payment, QR verification, walk-in
  bookings, court blocks, open-play operations, reconciliation, permissions
- Booking/payment status model and required UI states
- Page-by-page low-fidelity wireframes with desktop and mobile layouts
- Responsive behaviour rules and interaction/component requirements
- Accessibility and usability requirements
- Content/asset requirements and an open decision register
- Acceptance criteria for each planned journey
- Blueprint conflict log covering the deferred coaching/DUPR scope
- Documents created:
  - `docs/ux/UX_PLAN.md`
  - `docs/ux/WIREFRAMES.md`
  - `docs/ux/CLIENT_DECISIONS.md`
  - `docs/ux/CLIENT_QUESTIONNAIRE.md` (client-facing short form; answers pending)

No application code, dependencies, database schema, auth, or payment code was
changed in Phase 2.

**Client approval recorded 27 October 2026:** the Phase 2 artifacts are approved
as drafted: sitemap, labels/navigation, player and staff journeys, wireframes,
state requirements, component/accessibility requirements, and acceptance
criteria. This approval does **not** answer the open business decisions in
`docs/ux/CLIENT_DECISIONS.md`, which remain deferred pre-implementation
blockers. It did not itself authorize Phase 3; Phase 3 was separately
authorized on 28 October 2026.

## Phase 2 checks

| Check | Result |
| --- | --- |
| Phase 2 blueprint requirements reviewed | All ten requested deliverables mapped to `docs/ux/UX_PLAN.md` and `docs/ux/WIREFRAMES.md` |
| Sitemap and access model | Documented for anonymous, player, staff, and manager roles |
| Player journeys | Seven journeys documented with failure/recovery states |
| Staff workflows | Eight workflows documented with permission and audit expectations |
| Mobile-first booking layouts | Availability and review wireframes specified at 390px before desktop |
| Price/payment/rules before commitment | Explicit in journey, screen requirements, and wireframes |
| States | Loading, empty, error, success, disabled, unavailable specified |
| Deferred features excluded | No coaching/DUPR routes, navigation, tables, or components planned |
| Client questionnaire | Created at `docs/ux/CLIENT_QUESTIONNAIRE.md`; returned 30 October 2026 and reconciled on 3 November 2026 |
| App files changed | None |
| `npx tsc --noEmit` (re-run) | Passed, no output |
| `npm run lint` (re-run) | Passed, no output |
| `npm run build` (re-run) | Passed; `/`, `/design-system`, `/design-preview/homepage`, `/_not-found` generated as static routes |

## Phase 2 exit status

The Phase 2 artifacts are **client-approved as drafted**, but several business
inputs remain deferred. The planning phase can close on the approved structure;
affected implementation work cannot be finalized until the deferred decisions
are supplied.

| Exit criterion | Status |
| --- | --- |
| Primary player journeys mapped | Met |
| Staff workflows mapped | Met |
| Mobile layouts specified for booking interactions | Met as specifications; not user-tested |
| Login placement decided | **Deferred** — `D-02` remains open; recommendation documented |
| Full price, duration, payment method, and rules shown before confirmation | Structure specified; real values deferred on `D-03`, `D-06`, `D-07`, `D-08` |
| Loading, empty, error, unavailable, and success states | Specified |
| Labels and page structure confirmed by client | Approved as drafted, 27 October 2026 |
| Client-approved prices, policies, and business rules | **Deferred** — not supplied |

Until the deferred items are resolved, no implementation phase should treat the
booking rules, prices, or payment policy as final. No implementation phase may
begin without explicit authorization.

## Phase 1 completed work (unchanged)

- Logo-derived color tokens plus separate semantic status colors
- Archivo display type and Source Sans 3 body type through `next/font`
- Typography, spacing, radius, elevation, and motion foundations
- UI primitives: button, field/input/select/textarea, badge, alert
- Interaction previews: slot picker, native dialog, loading, disabled, error,
  empty, and skeleton states
- `/design-system` component and token reference page
- `/design-preview/homepage` desktop/mobile mockup slice
- Temporary `/` review index (to be replaced by the real homepage in Phase 5)
- Placeholder components for the missing logo and photography
- `docs/DESIGN_BRIEF.md` with asset checklist and client decisions
- `docs/PROJECT_STATUS.md` (this file)

## Phase 1 checks actually run (last code change)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npm run lint` | Passed, no output |
| `npm run build` | Passed; `/`, `/design-system`, `/design-preview/homepage`, `/_not-found` generated as static routes |
| Production server route check (`next start`) | All three routes returned HTTP 200 with expected content; unknown route returned 404 |
| CSS and font delivery | Built CSS served (53 KB); both WOFF2 font files requested by the page returned HTTP 200 |
| Overflow audit (headless Chrome, CDP) | No horizontal page overflow at 390px, 768px, or 1440px on all three routes |
| Heading structure | Exactly one `<h1>` per route |
| Console errors | None captured on any audited route |
| Font application | `document.fonts.status` = `loaded`; display sample computed to Archivo |
| Slot picker interaction | Clicking a time updated `aria-pressed` and the `aria-live` summary |
| Dialog interaction | Opened with `showModal`, focus moved to the first action, `aria-describedby` resolved; closed programmatically |
| Keyboard focus | First `Tab` on the mockup showed a visible blue focus ring |
| Tap targets (390px) | Homepage: no interactive target under 44px tall. Design reference: remaining sub-44px items are the intentional “small button” sample, 16px custom radio/checkbox controls inside larger labels, and disabled preview buttons |

Browser review used production builds in headless Chrome through the DevTools
Protocol. Screenshots were inspected at 390px and 1440px; 768px was checked for
overflow and heading structure.

## Not verified

Phase 2:

- Wireframes were not tested with users, on devices, or through a clickable
  prototype. They are structural specifications only.
- No design-tool file exists (Figma or equivalent); the ASCII wireframes are the
  agreed fallback for this phase.
- The decision register is only partly answered. The sitemap,
  labels, journeys, and wireframes were approved as drafted on 27 October 2026.
- Acceptance criteria are future implementation targets; none has been executed.

Phase 3:

- The booking preview has not been tested with users, on real devices, or with a
  screen reader.
- Full keyboard traversal and tap-target measurement were not performed.
- No end-to-end booking, account, payment, or file-storage path exists to test.
- The preview was exercised in headless Chrome only; Safari and Firefox were not
  checked.

Phase 1:

- Real iOS/Android device testing and touch behavior
- Screen-reader announcement quality (VoiceOver/TalkBack/NVDA)
- Safari and Firefox rendering
- Reduced-motion behavior visually (the global CSS rule is implemented but was
  not visually inspected with the OS preference toggled)
- Full keyboard traversal of every control on the reference page
- Escape-key dismissal of the dialog (native behavior relied upon, not tested)
- Lighthouse/performance profiling on a throttled mobile connection
- Color contrast with a dedicated audit tool (values were spot-checked manually)

## Known limitations

1. **Assets are supplied but not final.** The logo is a raster WebP, not a vector
   master, and no light-on-dark version exists. Court photography is used on the
   owner's instruction; final crops and captions are Phase 5 work.
2. **Palette measured, not approved.** Sampling the logo gave navy `#062E6B`
   against the `#123B78` token. Aligning it changes every surface, so it is left
   for an explicit decision.
3. **White text on court blue** measures approximately 4.68:1. It passes AA for
   normal text but has little headroom; confirm the final brand blue before
   production.
4. **`/` route.** It is now the public homepage, rebuilt in Phase 5.
5. **No automated test suite.** The project still has no Vitest or Playwright
   configuration; verification was type, lint, build, HTTP, and browser-based.
6. **404 handling.** The custom 404 screens are in place. Next 16 may serve the
   first uncached request for an unknown court/policy slug with a 200 shell
   before the 404 settles; see the Phase 5 limitations.
7. **Design reference and booking preview are intentionally incomplete.**
   `/design-preview/booking` demonstrates states with local browser state and
   sample data; it is not a booking, account, payment, or file-storage flow.
8. **Wireframes are text-based.** No design tool was available, so low-fidelity
   layouts are ASCII specifications in `docs/ux/WIREFRAMES.md` rather than
   Figma artboards or a clickable prototype.
9. **Booking rules are partly decided.** The 4 November owner decisions cover the
   hold, the payment deadline, and cancellation. Weekend rate, rounding, booking
   window, buffer, and maximum players are still open, and the preview labels
   those gaps as unconfirmed.

## Client input still blocking production polish

The prioritized register is `docs/ux/CLIENT_DECISIONS.md` version 2.3, which
records the client's 30 October answers and the project owner's 4 and 5 November
decisions. Remaining blockers:

- Weekend rate, partial-hour rounding, buffer, and booking window
- Maximum players per court and the publishable facilities list
- Holiday closures
- Open-play schedule, capacity, and waitlist rules
- Named staff accounts and the permission split
- The club's real GCash QR and receiving account name
- Any publishable social links
- Client/counsel review of the new privacy notice and terms
- A launch decision on removing `noindex` and publishing the site

## Recommended next step

1. Record the public-copy approval in the client register (done 5 November 2026)
   and keep facilities, closures, and open play labelled as open.
2. Have the client and counsel review the privacy notice and terms before launch.
3. Review the Phase 6 account screens with a signed-in test account, then
   approve Phase 7 if the core booking engine is the next scope.
4. Wire the booking wizard to `create_court_booking` in Phase 7 and build payment
   proof submission/review in Phase 12. Do not start either automatically.
5. Replace the sample GCash QR with the club's own code before any deployment,
   and decide when to remove `noindex`.

## Deferred / out of scope

Coaching, DUPR, and open play remain conditional and unapproved. On 5 November
2026 the project owner stated that open play is not confirmed either way, and
that coaching and DUPR are not expected for now because the client has not
answered the related questions. No related pages, tables, endpoints, or
workflows exist, and none should be created until the client supplies the missing
rules and explicitly asks for them. The
public site is built (Phase 5); the booking engine, staff tools, notifications,
QR payment review, and launch work belong to later phases and remain
unimplemented. Phase 4 added the auth and database foundation only; the Phase 3
preview is still local-state UI and is not connected to it. Open-play sessions,
attendance, coaching, and DUPR tables remain deferred.

## Revision — 4 November 2026

The project owner answered the three flow blockers and the location, contact, and
name questions.

- **Hold and payment:** 15 minutes from the moment the request is confirmed. The
  payment deadline is the same window, so its expiry is what auto-cancels the
  request and returns the slot to the schedule.
- **Cancellation:** 24 hours or more before play gives a full GCash refund or one
  free move; inside 24 hours the fee is forfeited and the slot released;
  no-shows and late arrivals are neither refunded nor extended; club closures are
  refunded or moved.
- **Location and contact:** "Bung-aw, Pondol, Balamban, Cebu", map pin
  10.5015278, 123.7161667 linked to Google Maps, phone 0956 167 0905, and
  gracemilan87@gmail.com are published on the homepage location section and in
  the footer, all read from `lib/club.ts`.
- **Name:** confirmed as "D-Hidden Pickleball"; no copy changed.
- **Payment testing:** a labelled *Simulate a successful payment* control reaches
  the paid and awaiting-verification states with no real transfer, so the flow
  can be demonstrated before the club's QR arrives.
- **Palette:** shipped tokens kept; the logo is to be redrawn in `#123B78`.

### Revision checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed, no output |
| `npx eslint --ignore-pattern ".tmp-ui/**"` | Passed, no output |
| `npm run lint` | Fails only on the gitignored `.tmp-ui/` browser profiles (145 errors from Chrome extension scripts); not project source |
| `npm run build` | Passed; 10 static pages including `/`, `/design-preview/booking`, and `/design-system` |
| Served HTML (`next start` on port 3100) | `/` and `/design-preview/booking` returned HTTP 200; address, coordinates, map link, phone, and email present; no "pending confirmation" copy remains |
| Test-mode control in a browser | Not exercised — the paid states sit behind interaction and were reviewed from the implementation, not driven |

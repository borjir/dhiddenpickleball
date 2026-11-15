# Performance Audit — D-Hidden Pickleball Booking System

Audit date: 15 November 2026
Target: `https://bookings.dhiddenpickleball.workers.dev` (Worker `bookings`, version `17cfea5b`)
Method: local build/asset inspection, deployed HTTP measurements (curl, single vantage point in the Philippines/HK edge region), source and query review. No load testing was performed.

## Measured baseline

Repeated cold-ish requests from one client, no cache warm-up:

| Route | TTFB (s) | Total (s) | HTML (bytes) |
| --- | --- | --- | --- |
| `/` (prerendered) | 0.083 – 0.134 | 0.11 – 0.17 | 127,341 |
| `/book` (dynamic) | 0.086 – 0.113 | 0.19 – 0.48 | 56,818 |
| `/open-play` | 0.088 – 0.108 | 0.16 – 0.19 | — |
| `/courts` | 0.084 – 0.123 | 0.10 – 0.14 | — |
| `/lookup` | 0.099 – 0.318 | 0.10 – 0.32 | — |
| `/staff-access` | 0.095 – 0.497 | 0.10 – 0.50 | — |

Transport: Brotli (`Content-Encoding: br`) on HTML and JS; homepage 16,120 bytes over the wire. Static chunks are `public, max-age=31536000, immutable`. Dynamic pages correctly send `private, no-store`.

Verdict: the server side is fast for this workload. The two outliers are cold starts (one 0.50 s `/staff-access` sample, one 0.32 s `/lookup` sample) and the moderately heavy `/book` render, which awaits several Supabase round trips before streaming.

---

## P1 — Worker bundle is at 89% of the Cloudflare Free script limit

- **Severity:** HIGH (release risk, not user-facing latency)
- **Affected:** `.open-next/worker.js`, `wrangler.jsonc`, `scripts/check-worker-size.mjs`
- **Status:** Confirmed

**Evidence**

```
npx wrangler deploy --dry-run
Total Upload: 11896.91 KiB / gzip: 2727.98 KiB
```

Cloudflare Workers Free allows a 3 MiB (3,072 KiB) gzip script. The current build is **2,727.98 KiB = 88.8%**, leaving roughly **344 KiB** of headroom. The deploy script already fails the build above 3,072 KiB and warns above 2,950 KiB. `docs/PROJECT_STATUS.md` recorded the same figure (2,719.61 KiB) earlier in the project.

**Impact**

A routine dependency addition (a PDF library, an MFA SDK, a date library) can block deployment entirely, and the failure surfaces only after a full build. It also constrains the team's ability to add server-rendered features.

**Recommended solution**

- Treat server dependencies as a budgeted resource: add the check to CI and review `gzip` deltas in pull requests.
- Move optional server work out of the Worker (e.g. email rendering, exports) or trim existing server-only imports.
- If sustained growth is expected, a Workers Paid plan raises the limit to 10 MiB compressed — a cost decision, not a code decision.

**Complexity:** Low (process), Medium (if code must be split).

---

## P2 — Homepage downloads ~437 KB of MapLibre code for a below-the-fold map

- **Severity:** MEDIUM
- **Affected:** `components/home/club-map-lazy.tsx`, `components/home/home-page.tsx` (Location section)
- **Status:** Confirmed by code and asset measurement; runtime timing not profiled in a browser

**Evidence**

`ClubMapLazy` uses `next/dynamic(..., { ssr: false })` and is rendered unconditionally inside the location section. `ssr: false` defers the module to the client, but the component still mounts during hydration — there is no `IntersectionObserver`, click-to-load, or viewport gate — so the dynamic import starts immediately on page load regardless of scroll position.

Measured over the wire with Brotli:

| Asset | Transfer |
| --- | --- |
| `0eayo-l2tbpmu.js` (MapLibre chunk) | 301,306 bytes |
| `/vendor/maplibre-gl-worker.mjs` | 146,703 bytes |
| **Additional map cost** | **~437 KB** |

Initial scripts referenced by the homepage HTML total **255,516 bytes** Brotli across 13 files, so the map roughly doubles the JS weight of the landing page. It also issues third-party map tile requests once initialized.

**Impact**

On a mid-range phone or a slow mobile connection this is the single largest cost on the club's primary marketing page, competing with the hero image (187 KB WebP on desktop, 102 KB on phones) for bandwidth and main-thread time. It is paid by every visitor, including those who never scroll to the map.

**Recommended solution**

Gate the map behind visibility or intent: render the existing placeholder until the section is within ~200 px of the viewport (or until a "Show map" tap), then mount `ClubMap`. Alternatively move the map to `/visit`, which is where directions are the primary task. Keep the dynamic import so the Worker bundle stays unaffected.

**Complexity:** Low.

---

## P3 — Deployment ships several megabytes of unused or development assets

- **Severity:** LOW–MEDIUM (deploy size, public bandwidth; not page weight)
- **Affected:** `public/`, `.open-next/assets/_next/static/media/`
- **Status:** Confirmed

**Evidence**

| File | Size | Referenced in app code? |
| --- | --- | --- |
| `public/logo/hidden-pickleball.png` | 1,217,032 B | No (only `app/design-system/page.tsx` references other art) |
| `public/courts/pickleball2.jpg` | 944,753 B | Only the internal `/design-system` page |
| `maplibre-gl-dev*.mjs` | 2.4 MB + 1.17 MB | No — dev builds copied during a development build |
| `maplibre-gl.3rkpky0htenmc.mjs` | 1.09 MB | Prod map chunk (lazy) |
| `maplibre-gl-worker*.mjs` (prod) | 508 KB | Used by the map |

`public/` totals 18 MB; the Worker upload is 11.9 MB uncompressed. All of these are reachable over HTTP. The images are not on any public page's critical path, so this does not slow visitors, but it wastes deployment bandwidth and public storage, and the 1.2 MB PNG is a production file that no user-facing page needs.

**Recommended solution**

Delete unused images and dev-only MapLibre artifacts before the next deploy, and adjust `wrangler.jsonc`'s exact-path asset allowlist (`run_worker_first` negative rules) when files disappear. Consider keeping the design-system route out of production entirely.

**Complexity:** Low.

---

## P4 — Availability is recomputed per slot with a write on every read

- **Severity:** MEDIUM (database cost under load, amplification risk)
- **Affected:** `public.get_court_availability` (`supabase/migrations/20261115000100_weekend_rates_booking_window.sql`), `app/book/actions.ts`
- **Status:** Confirmed by code

**Evidence**

The function loops courts × hourly slots (2 courts × up to 17 starts) and calls `calculate_court_amount(...)` inside the loop for every candidate slot. It also performs a write at the start of every call:

```sql
perform public.release_expired_court_holds();
```

It is granted to `anon`, so the cost can be triggered by anyone (see Security finding S1). The same pattern exists in the open-play availability path (per-session registration counts).

**Impact**

At the current scale (2 courts, a handful of concurrent guests) this is comfortably fast — the `/book` timings above (0.19–0.48 s) include it. Under a burst of availability polling plus unauthenticated traffic, Postgres does O(courts × slots) function calls and a write per request, on a Free-plan instance with a small compute budget. That is the most likely place a traffic spike would show up first.

**Recommended solution**

Compute rates once per court/day window (single `service_rates` lookup, then evaluate the time-of-day split in the function) instead of per slot; move hold expiry to a scheduled job (pg_cron already used for hygiene) and remove the per-read write, or make it conditional on the existence of expired holds. Between requests, cache availability for a few seconds per date/duration if staleness is acceptable.

**Complexity:** Medium.

---

## P5 — Animation and form libraries add ~100 KB of client JS to public pages

- **Severity:** LOW
- **Affected:** `package.json`, `components/home/hero-media.tsx`, `components/motion/reveal.tsx`
- **Status:** Confirmed by code; exact byte attribution per library not isolated

**Evidence**

The app ships two animation entry points into the same library family:

- `components/home/hero-media.tsx` imports from `"framer-motion"`
- `components/motion/reveal.tsx` imports from `"motion/react"`

`framer-motion@14.12.0` is **not** a declared dependency; it is installed transitively through `motion@14.12.0` (`npm ls framer-motion motion`). The import works today because npm hoists it. The homepage's four largest chunks total ~197 KB Brotli (71.5 + 52.2 + 40.6 + 35.9 KB), which includes React DOM and the animation runtime.

**Impact**

Beyond size, the undeclared import is a build-fragility risk: a future `motion` release that stops depending on (or re-exporting) `framer-motion` breaks the build, and a different package manager layout may not hoist it. Two entry points also risk duplicated module state.

**Recommended solution**

Use `motion/react` everywhere and drop the `framer-motion` specifier. Keep entrance animations CSS-based (as `FadeIn` already is) so the hero does not depend on JS for first paint.

**Complexity:** Low.

---

## P6 — Steady-state polling generates Worker requests per open tab

- **Severity:** INFORMATIONAL
- **Affected:** `components/site/version-guard.tsx` (every 5 min), `components/notifications/notifications-provider.tsx` (Realtime + 60 s fallback poll), `components/guest/lookup-panel.tsx` (30 s poll on a revealed booking)
- **Status:** Confirmed by code

These are reasonable product choices, but each open tab costs Worker invocations and Supabase reads indefinitely. The version guard alone is 12 requests/hour per tab. On the Workers Free plan (100k requests/day) this is not a concern for a single club, but it is worth knowing when judging headroom.

**Recommended solution**

No action needed now. If traffic grows, lengthen the version-check interval, pause polling when the tab is hidden (partly done already), and rely on Supabase Realtime for notifications.

**Complexity:** Low.

---

## P7 — Caching and transport are configured correctly

- **Severity:** INFORMATIONAL (positive)
- **Status:** Confirmed

- Prerendered pages are served from the OpenNext static-asset incremental cache (`x-opennext-cache: HIT`) with a one-year `s-maxage` and stale-while-revalidate.
- Hashed `/_next/static/*` responses are `immutable` for a year, as they should be.
- Brotli is negotiated for HTML and JS by Cloudflare.
- `/api/version` is `no-store`; dynamic booking/lookup pages are `private, no-store`, which is correct for per-guest data.
- `next.config.ts` disables image optimization deliberately (no IMAGES binding on the free plan); the hero uses `srcSet` with 960 px and 1376 px WebP variants, so phones do not download the desktop file.
- Fonts are self-hosted and subset to Latin by `next/font`; 10 woff2 files ship, of which a browser downloads only the weights actually used.

One nuance: the prerendered homepage carries `s-maxage=31536000`, so shared caches may hold a build's HTML for a long time. OpenNext's cache keys include the build, but if the club publishes time-sensitive copy (rates, closures), prefer a shorter `revalidate` for that page or accept that the HTML shell may lag a deploy.

---

## P8 — Database query design is sound for the current scale

- **Severity:** INFORMATIONAL (positive, with one watch item)
- **Status:** Confirmed by review

- Staff lists page 40 rows at a time with `count: "exact"` and explicit `range()`; the reports page aggregates in JS over a bounded date window.
- Indexes cover the hot paths: `bookings(status, starts_at)`, `bookings(payment_status)`, partial index on pending holds, `court_reservations` GiST time index, `payments(booking_id, created_at)`, `payments(status, created_at)`, `payments_group_idx`, `open_play_registrations(session_id)`, `customers(mobile)`/`(email)`, `notifications(recipient_id, …)`.
- Nested selects (`court_reservations(court:courts(name))`, `customer:customers!…`) are PostgREST joins, not N+1 loops.
- Proof URLs are signed in one batch (`createSignedUrls(paths, 600)`) rather than per row.
- Watch item: `bookings` and `payments` filters use `voided_at is null` together with `starts_at` ranges; there is a `bookings_voided_idx` but the combined predicate is not covered by a partial index. At thousands of rows this does not matter; at tens of thousands, consider partial indexes on non-voided rows.
- Watch item: the staff dashboard issues six parallel queries plus a `release_expired_court_holds` RPC on every load. Acceptable now; the RPC write is the part to remove (see P4).

---

## Recommended priority

1. **P1** — protect the release pipeline (size budget in CI, plan decision if growth continues).
2. **P2** — gate the homepage map; the largest real user-facing win.
3. **P4** — reduce per-slot rate computation and remove the write-on-read.
4. **P3, P5** — cleanup and dependency hygiene.
5. **P6–P8** — no action; monitoring only.

## Limitations

- No browser tracing (LCP/CLS/INP) was captured; no Lighthouse run was performed because no audit tooling was installed. The map-load finding is derived from the component structure and measured asset sizes, not from a waterfall.
- Single vantage point, no throttled mobile profile, no concurrent-user load test.
- Third-party map tile latency was not measured.
- `/staff/*` page performance could not be measured because no staff session was used.

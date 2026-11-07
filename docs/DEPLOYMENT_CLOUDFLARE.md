# Cloudflare Workers deployment

**Last updated:** 7 November 2026
**Blueprint:** `docs/PRODUCT_BLUEPRINT.md` (v2.5), Phase 11 — Production Launch and Handover
**Status:** The current live Worker is at **https://play4serve.dhiddenpickleball.workers.dev**
(old Worker name). `wrangler.jsonc` now targets **https://bookings.dhiddenpickleball.workers.dev**;
the new URL does not exist until that Worker is deployed and its secrets are set. The Supabase Site
URL and redirect allow-list still point at the old origin until the cutover. Worker secrets are not
set yet, so email delivery and the cron endpoint are inactive. Launch checklist items remain open.

**Always deploy with `npm run deploy`, not a bare `wrangler deploy`.** The bare command reuses the
last `.open-next` build, so any change to `NEXT_PUBLIC_*` values — which are inlined at build time —
will not take effect. `npm run deploy` rebuilds, regenerating the MapLibre worker that `public/vendor/`
needs for the map to work (that file is generated, not committed).

## What this adds

The app is deployed as a single Cloudflare Worker using the OpenNext adapter
(`@opennextjs/cloudflare`), not Vercel. Supabase remains the database, auth, and file storage
provider, so this changes only where the Next.js server runs.

| Piece | File |
| --- | --- |
| Adapter build config | `open-next.config.ts` |
| Worker, assets, observability | `wrangler.jsonc` |
| Build/deploy commands | `package.json` (`cf:build`, `preview`, `deploy`) |
| Generated output (ignored) | `.open-next/`, `.wrangler/` |

`next` was raised from 16.4.3 to ^16.4.5 because the adapter's peer range requires it; 16.4.5 is
also the November security patch.

## Commands

```bash
npm run preview   # build the Worker and serve it at http://127.0.0.1:8787
npm run deploy    # build the Worker and deploy it to Cloudflare
npm run build     # ordinary Next.js build, unchanged
```

`wrangler deploy` requires `npx wrangler login` once on the machine that deploys.

## Environment variables: two different mechanisms

This split matters and is easy to get wrong.

**Build-time (inlined by Next.js).** These must be present in the environment that runs
`npm run deploy`, because Next.js substitutes them into the bundle at build time. Setting them as
Worker secrets has no effect on the browser bundle.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` — the real HTTPS origin; email links and images depend on it

**Runtime (Worker secrets).** Set once each, from `.env.example`:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put EMAIL_CRON_SECRET
npx wrangler secret put EMAIL_FROM
npx wrangler secret put EMAIL_REPLY_TO
npx wrangler secret put EMAIL_DAILY_LIMIT
npx wrangler secret put EMAIL_MONTHLY_LIMIT
```

`wrangler dev` reads `.env.local` locally; deployed Workers do not. A missing runtime secret makes
`/api/cron/email` return 503 rather than failing silently, which is the intended behavior.

`EMAIL_FROM` is a verified Resend **email address**, not the deployed URL. Use a verified custom
domain, for example `D-Hidden Pickleball <bookings@dhiddenpickleball.com>`. Resend's
`onboarding@resend.dev` sandbox only delivers to the Resend account owner and cannot reach guests.

`EMAIL_DAILY_LIMIT` and `EMAIL_MONTHLY_LIMIT` default to **100** and **3,000**, matching the Resend
free plan. Set them only if you move to a paid plan or intentionally want a lower cap.

Staff email alerts are disabled in the current email policy (`lib/email/config.ts`) to conserve the
free quota; staff use the dashboard as the source of truth. `STAFF_NOTIFICATION_EMAILS` is retained
for a future re-enable.

## Site URL and the `workers.dev` hostname

`https://bookings.dhiddenpickleball.workers.dev` is made of two parts:

- `dhiddenpickleball` is the Cloudflare account's `workers.dev` subdomain.
- `bookings` is the Worker's `name` from `wrangler.jsonc`.

You cannot remove the Worker-name label while staying on `workers.dev`; the Worker name is always
the first label. `wrangler.jsonc` was changed from `play4serve` to `bookings` so the free URL no
longer carries the old project name. The old `play4serve.dhiddenpickleball.workers.dev` Worker
remains live until the new Worker is deployed and the auth URLs are switched.

For a client-facing address, attach a custom domain such as `book.dhiddenpickleball.com` to the
Worker and set `NEXT_PUBLIC_SITE_URL` to that origin. The same domain can be verified in Resend for
`bookings@dhiddenpickleball.com`, so one domain solves both the public URL and sender identity.

Changing the Worker name in `wrangler.jsonc` creates a different Worker; re-set its secrets and any
cron/domain configuration before deleting the old one. Do not rename it casually after launch.

## Supabase auth redirect URLs

Applied to project `ybgcktpyntpcragegwec` with `npx supabase config push` from a targeted
`supabase/config.toml` (only `auth.site_url` and `auth.additional_redirect_urls` were declared, so
email confirmations, Google, MFA, and pooler settings were left unchanged):

- **Site URL target:** `https://bookings.dhiddenpickleball.workers.dev`
- **Redirect URLs:**
  - `https://bookings.dhiddenpickleball.workers.dev/**`
  - `https://play4serve.dhiddenpickleball.workers.dev/**` (old Worker, kept during cutover)
  - `http://localhost:3000/**`
  - `http://127.0.0.1:3000/**`

The target values are in `supabase/config.toml`. Apply them with `npx supabase config push` only
after the new Worker is deployed, then remove the old redirect URL once no old links are in use. Without this, Supabase ignores the app's
`emailRedirectTo` and builds confirmation/recovery links from the Site URL, which is why players
received `http://localhost:3000/?code=...`.

`proxy.ts` also redirects a root-level `?code=`/`?token_hash=`/`?error=` result to `/auth/callback`,
so links that were already sent before this change still complete.

### Google sign-in consent screen

Google displays the **root domain of the OAuth callback URL** on its consent screen. With hosted
Supabase the callback is `https://<project-ref>.supabase.co/auth/v1/callback`, so an unverified app
shows `ybgcktpyntpcragegwec.supabase.co` instead of the club's name or domain. This is a Google +
Supabase platform behavior, not an app-code bug; `NEXT_PUBLIC_*` redirect URLs cannot change it.

Options, in order of reliability:

1. **Supabase custom domain (paid):** add a domain such as `auth.dhiddenpickleball.com` in
   Supabase Dashboard → Project Settings → Custom Domains, point it at Supabase, update the Google
   OAuth client's authorized redirect URI to
   `https://auth.dhiddenpickleball.com/auth/v1/callback`, then set
   `NEXT_PUBLIC_SUPABASE_URL=https://auth.dhiddenpickleball.com` and redeploy. Google then shows the
   club's domain.
2. **Verify the Google OAuth brand (free, partial):** in Google Cloud Console → APIs & Services →
   OAuth consent screen, set the app name, logo, homepage, privacy policy, terms, and authorized
   domain, then publish/submit for verification. Some apps then show the name rather than the
   `supabase.co` host, but the callback host may still appear while the app is unverified.
3. **Use the Google Identity Services ID-token flow** instead of Supabase's hosted `/authorize`
   redirect. This invokes Google directly from the site origin and calls
   `supabase.auth.signInWithIdToken`. It requires the existing Google OAuth client to allow the
   deployed origin under **Authorized JavaScript origins**, and it changes the sign-in flow, so it
   should be implemented deliberately and tested with a real Google account before launch.

Until one of these is done, keep the current working Google sign-in or hide the Google button;
email/password sign-in is unaffected.

## Reminder scheduler

`/api/cron/email` must be called every 15 minutes with
`Authorization: Bearer <EMAIL_CRON_SECRET>`. It queues 24-hour reminders and retries failed sends.
Two options:

1. **External scheduler (no code change).** Point any uptime/cron service at
   `https://<domain>/api/cron/email` with that header. This is what the Phase 9 notes already
   assumed.
2. **Cloudflare Cron Trigger (free, up to 5 triggers).** The adapter does not export a `scheduled`
   handler, so this needs a small hand-written entry (`main` pointing at a wrapper that re-exports
   `.open-next/worker.js` and adds `scheduled`). Not implemented here because it is untested glue
   around adapter internals; do it deliberately and verify with
   `wrangler dev --test-scheduled` before relying on it.

Either way, confirm one real reminder arrives before launch.

## Limits and cost

Measured against the Free plan:

| Limit | Free plan | This app |
| --- | --- | --- |
| Requests | 100,000/day | ~1,100/day at 200 members (~1%) |
| Static assets | unlimited, free | ~3.1 MB of images and the QR |
| Worker size | 3 MiB gzip (3,072 KiB) | 2,856.70 KiB gzip (93%, ~215 KiB free) — the tightest constraint |
| CPU per request | 10 ms | **unmeasured** |
| Cron triggers | 5 | 0 configured |
| Builds | 3,000 min/month | one per deploy |

The bundle size is the real risk: one more server-side dependency can cross 3 MiB. The Paid plan
($5/month) raises the limit to 10 MiB and CPU to 30 s, which also removes the CPU uncertainty.
Supabase Free remains the limit with a multi-year clock (500 MB database, 1 GB storage), and it
pauses after about a week of inactivity — the existing `keep-supabase-awake.yml` workflow guards
that.

## Known limitations of this deployment

1. **Cache Components is disabled** (`cacheComponents: false` in `next.config.ts`). The adapter's
   CacheSignal patch stopped matching Next 16.4 (opennextjs/cloudflare#1318); with it enabled every
   Worker request hung and returned 500. Re-enable it — and restore the `instant` route exports that
   were removed from `app/staff/layout.tsx` and `app/notifications/page.tsx` — once a fixed adapter
   release ships. The app uses no `use cache`/`cacheLife`/`cacheTag` directives, so the practical
   loss is partial prerendering shells; pages are now static, SSG, or dynamic.
2. **`next/image` optimization is off.** Without an `IMAGES` binding the adapter serves the original
   file. The club's photos are pre-sized in `public/`, so this is acceptable on the free plan.
3. **Node.js middleware is experimental** on the adapter. `proxy.ts` gates `/staff` and `/account`;
   the build warns about this. It was exercised in the smoke test and redirected correctly.
4. **CPU per request is unmeasured.** Only a deployed preview plus `wrangler tail` can show whether
   the 10 ms cap holds.
5. **No custom domain or route is configured** in `wrangler.jsonc`; add the `routes` entry once the
   domain is confirmed.

## Verified locally

`npx opennextjs-cloudflare build` succeeds. Against `wrangler dev`:

| Route | Result |
| --- | --- |
| `/`, `/courts`, `/club`, `/sign-in`, `/account`, `/book`, `/open-play` | 200 |
| `/staff` | 307 → `/sign-in?next=%2Fstaff&notice=session-expired` |
| `/notifications` | 307 → sign-in |
| `/api/cron/email` (no credential) | 401 |
| `/qr/gcash-test-qr.png` | 200 |

`npx tsc --noEmit`, `npx eslint . --max-warnings=0`, and `npm run build` also pass. The full
application — bookings, payments, staff actions, email delivery — was not exercised on the Worker;
only routing, auth gating, and static assets were.

## Phase 11 checklist status

Done by this work: production hosting target chosen and configured, HTTPS is provided by
Cloudflare, the first deploy is live, the Supabase Site URL and redirect allow-list point at the
Workers origin, secrets mechanism documented, and monitoring enabled (`observability`).

Still open, and not resolvable by code alone:

1. Set the Worker runtime secrets (`wrangler secret put` for Resend, service role, cron secret,
   sender, reply-to, daily limit, and monthly limit) so email delivery and the cron endpoint activate.
2. Attach the club's custom domain, update `NEXT_PUBLIC_SITE_URL` to it, and update the Supabase
   Site URL/redirect allow-list at the same time.
3. Verify the Resend sender/domain so guests receive real email, then set `EMAIL_FROM` to that verified address.
4. Configure the reminder scheduler (above).
5. Decide on the Google consent-screen branding fix (see the Google sign-in section above).
6. Install the official GCash QR (`lib/payment.ts`) — still the test asset.
7. Decide whether the QA accounts and test bookings in production Supabase stay as demo data.
8. Confirm backups, restore, and uptime monitoring; obtain client acceptance and train staff.
9. Remove `.next/design-preview` sample data if the preview route must not ship.

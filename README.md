# D-Hidden Pickleball — court booking

Next.js app for court reservations, open play, payments, and staff operations.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Runtime configuration for local development lives in `.env.local` (copy
`.env.example`). `NEXT_PUBLIC_*` values are inlined at build time; the
server-only values are deployment secrets and must never be committed.

## Production deployment

The app runs as a single Cloudflare Worker through the OpenNext adapter:

```bash
npm run preview   # build and serve the Worker at http://127.0.0.1:8787
npm run deploy    # build and deploy to Cloudflare
```

Current live Worker: <https://bookings.dhiddenpickleball.workers.dev>

Always deploy with `npm run deploy` (not a bare `wrangler deploy`), because
`NEXT_PUBLIC_*` values are inlined during the build. Deployment details,
environment variables, Supabase auth redirect URLs, and the Google consent
screen note are in [`docs/DEPLOYMENT_CLOUDFLARE.md`](docs/DEPLOYMENT_CLOUDFLARE.md).

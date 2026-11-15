/**
 * Worker entry point.
 *
 * OpenNext generates `.open-next/worker.js`, which exports a `fetch` handler
 * only. Cloudflare Cron Triggers require a `scheduled` handler on the same
 * Worker, so this module re-exports the generated worker and adds one.
 *
 * Each cron trigger calls one of the existing `/api/cron/*` routes through the
 * normal Next request pipeline, so there is a single code path and the routes
 * keep their own bearer-secret check. The cron expressions below must match
 * `triggers.crons` in wrangler.jsonc. Cron Triggers fire in UTC.
 *
 * A Worker on the Free plan may hold 5 cron triggers, and each scheduled run
 * counts as one Worker request. These two schedules add ~97 requests per day.
 */
import openNextWorker from "./.open-next/worker.js";

export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";

const EMAIL_CRON = "*/15 * * * *"; // every 15 minutes
const STORAGE_CRON = "17 3 * * *"; // 03:17 UTC (11:17 Manila), once a day

const JOBS = new Map([
  [EMAIL_CRON, "/api/cron/email"],
  [STORAGE_CRON, "/api/cron/storage"],
]);

async function runCronRoute(path, env, ctx) {
  const secret = (env.EMAIL_CRON_SECRET ?? "").trim();

  if (!secret) {
    console.error(
      `[cron] ${path} skipped: EMAIL_CRON_SECRET is not configured.`,
    );
    return;
  }

  // The host is only a placeholder: Next routes on the path, and this call
  // never leaves the isolate.
  const request = new Request(`https://cron.internal${path}`, {
    headers: { authorization: `Bearer ${secret}` },
  });

  try {
    const response = await openNextWorker.fetch(request, env, ctx);
    const body = await response.text();
    const summary = body.length > 500 ? `${body.slice(0, 500)}...` : body;

    if (response.ok) {
      console.log(`[cron] ${path} -> ${response.status} ${summary}`);
    } else {
      console.error(`[cron] ${path} -> ${response.status} ${summary}`);
    }
  } catch (error) {
    console.error(`[cron] ${path} threw:`, error);
  }
}

const worker = {
  fetch: openNextWorker.fetch,
  async scheduled(event, env, ctx) {
    const path = JOBS.get(event.cron);

    if (!path) {
      console.error(
        `[cron] Unmapped cron expression "${event.cron}"; running the email job. ` +
          "Update worker.mjs if a trigger was added in wrangler.jsonc.",
      );
    }

    ctx.waitUntil(runCronRoute(path ?? "/api/cron/email", env, ctx));
  },
};

export default worker;

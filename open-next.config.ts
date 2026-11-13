import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// The Workers Free plan gives each invocation a small CPU budget. Rendering a
// page on every request costs more than that budget, so prerendered pages are
// copied into the Worker's static assets (`populateCache local` in cf:build)
// and served directly. `enableCacheInterception` returns those entries before
// the Next render runs, bringing a page view down to an asset read.
//
// The cache is read-only and only holds build-time pages; dynamic routes
// (booking, lookup, open play, staff, API) still render per request.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});

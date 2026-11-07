import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no incremental cache or queue bindings. Sufficient for a
// build-size and routing check; add an R2/KV cache before relying on ISR.
export default defineCloudflareConfig({});

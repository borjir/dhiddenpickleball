/**
 * Cloudflare Workers Free allows a 3 MiB gzip Worker script. Wrangler already
 * refuses an oversized upload, but it does so after bundling; this check uses
 * Wrangler's own dry-run measurement first and fails with a clear budget message
 * so a new dependency cannot silently push the project past the free-plan limit.
 */
import { execSync } from "node:child_process";

const LIMIT_KIB = 3 * 1024; // 3,072 KiB
const WARN_KIB = 2_950; // leave at least 122 KiB of headroom

let output = "";

try {
  output = execSync("npx wrangler deploy --dry-run", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (error) {
  const details = [error.stdout, error.stderr].filter(Boolean).join("\n");
  console.error("Worker size check could not run:");
  if (details) console.error(details);
  process.exit(1);
}

const match = output.match(/gzip:\s*([\d.]+)\s*KiB/i);

if (!match) {
  console.error("Worker size check could not read Wrangler's gzip size.");
  console.error(output);
  process.exit(1);
}

const gzipKiB = Number(match[1]);
const headroom = LIMIT_KIB - gzipKiB;

console.log(
  `Worker size: ${gzipKiB.toFixed(2)} KiB / ${LIMIT_KIB} KiB gzip ` +
    `(${((gzipKiB / LIMIT_KIB) * 100).toFixed(1)}%, ${headroom.toFixed(2)} KiB headroom)`,
);

if (gzipKiB > LIMIT_KIB) {
  console.error(
    `Worker exceeds the Cloudflare Free limit by ${Math.abs(headroom).toFixed(2)} KiB. ` +
      "Remove server-side code or move the feature out of this Worker before deploying.",
  );
  process.exit(1);
}

if (gzipKiB > WARN_KIB) {
  console.warn(
    `Worker is within ${headroom.toFixed(2)} KiB of the Cloudflare Free limit. ` +
      "Treat new server-side dependencies as a deployment risk.",
  );
}

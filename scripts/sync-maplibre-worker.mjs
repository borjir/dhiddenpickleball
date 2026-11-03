/**
 * MapLibre resolves its worker relative to the bundled module URL. Under the
 * Next/Turbopack build that URL points at a JS chunk directory where the worker
 * file does not exist, so the map initialises but its worker 404s. Copying the
 * self-contained worker into `public/` and pointing `setWorkerUrl` at it keeps
 * the worker in step with the installed package on every dev run and build.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.join(
  path.dirname(require.resolve("maplibre-gl/package.json")),
  "dist",
  "maplibre-gl-worker.mjs",
);
const targetDir = path.join(process.cwd(), "public", "vendor");

await mkdir(targetDir, { recursive: true });
await copyFile(source, path.join(targetDir, "maplibre-gl-worker.mjs"));

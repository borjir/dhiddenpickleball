import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
  },
  // Cache Components stays off for the Cloudflare Workers deployment: the
  // OpenNext adapter's CacheSignal patch stopped matching Next 16.4
  // (opennextjs/cloudflare#1318), and with it enabled every Worker request
  // hung and returned a 500. The app uses no `use cache`/`cacheLife`/`cacheTag`
  // directives, so the only loss is partial prerendering shells. Re-enable
  // once a fixed adapter release ships, restoring `instant` route exports too.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

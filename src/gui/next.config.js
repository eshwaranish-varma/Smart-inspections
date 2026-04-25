const fs = require("fs");
const path = require("path");

// Load monorepo root `.env` so one file works for local dev (same template as Docker Compose).
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
// Then `src/gui`-local env so vars only in `src/gui/.env` apply during config (middleware edge).
const guiDir = __dirname;
for (const name of [".env", ".env.local"]) {
  const p = path.join(guiDir, name);
  if (fs.existsSync(p)) {
    require("dotenv").config({ path: p, override: name === ".env.local" });
  }
}

// File tracing root: monorepo root for local/Docker, but on Vercel the deploy root is `src/gui`
// — pointing at `../..` can break `output` tracing. Default to this app directory when VERCEL=1.
const defaultTracingRoot = process.env.VERCEL
  ? path.resolve(__dirname)
  : path.join(__dirname, "..", "..");
const monoRoot =
  process.env.NEXT_OUTPUT_TRACING_ROOT != null && process.env.NEXT_OUTPUT_TRACING_ROOT !== ""
    ? path.resolve(process.env.NEXT_OUTPUT_TRACING_ROOT)
    : defaultTracingRoot;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * `standalone` is for Docker/self-host (`node server.js`). Vercel must use the default
   * Next output; otherwise routes and /_next static assets often 404 on the edge.
   * @see https://vercel.com/docs/frameworks/nextjs
   */
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  outputFileTracingRoot: monoRoot,
  experimental: {
    esmExternals: true,
  },
  turbopack: {
    root: monoRoot,
  },
  webpack: (config) => {
    config.resolve.alias["react-router-dom"] = path.resolve(
      __dirname,
      "lib/react-router-dom-compat.tsx"
    );
    config.resolve.alias["canvas"] = false;
    return config;
  },
};

module.exports = nextConfig;

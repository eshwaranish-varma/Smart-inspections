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

// In Docker (build context = src/gui only), repo root is the app dir — avoid tracing outside the image.
const monoRoot =
  process.env.NEXT_OUTPUT_TRACING_ROOT != null && process.env.NEXT_OUTPUT_TRACING_ROOT !== ""
    ? path.resolve(process.env.NEXT_OUTPUT_TRACING_ROOT)
    : path.join(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Smaller Docker images: `node server.js` in production Dockerfile */
  output: "standalone",
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

const path = require("path");

// Load monorepo root `.env` so one file works for local dev (same template as Docker Compose).
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

// In Docker (build context = src/gui only), repo root is the app dir — avoid tracing outside the image.
const monoRoot =
  process.env.NEXT_OUTPUT_TRACING_ROOT != null && process.env.NEXT_OUTPUT_TRACING_ROOT !== ""
    ? path.resolve(process.env.NEXT_OUTPUT_TRACING_ROOT)
    : path.join(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monoRoot,
  turbopack: {
    root: monoRoot,
  },
  webpack: (config) => {
    config.resolve.alias["react-router-dom"] = path.resolve(
      __dirname,
      "lib/react-router-dom-compat.tsx"
    );
    return config;
  },
};

module.exports = nextConfig;

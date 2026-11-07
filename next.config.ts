import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The container runs .next/standalone/server.js: only the files the app needs, no dev dependencies.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

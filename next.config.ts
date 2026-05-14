import type { NextConfig } from "next";

// Static export for GitHub Pages. `pnpm build` produces `out/`, which is what
// the `gh-pages` npm script publishes to the gh-pages branch.
//
// Project-repo Pages serve at username.github.io/<repo>/, so when deploying
// the bundle needs to know its base path. We surface the same value to
// runtime code via NEXT_PUBLIC_BASE_PATH so the asset() helper can prefix
// hard-coded `/glb/…`, `/logos/…` paths that Next doesn't rewrite for us.
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/etglobal" : "";

const config: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  // three.js + WebGPU build is ESM-only and large; transpile so Next bundles it cleanly.
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  // Hide the floating dev-indicator ("1 Issue" / "Building..." chip).
  devIndicators: false,
  // Expose the base path to client code (Next inlines NEXT_PUBLIC_* env vars).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  experimental: {
    // App Router + Turbopack are the default in 15.
  },
};

export default config;

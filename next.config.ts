import type { NextConfig } from "next";

// When deploying to a GitHub Pages project site the app is served from
// /<repo>/. Set NEXT_PUBLIC_BASE_PATH="/<repo>" in the build environment.
// Leave it unset (empty) for local dev and for user/org root pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Static HTML export → deployable to GitHub Pages (no Node server needed).
  output: "export",
  // GitHub Pages serves from a subpath for project sites.
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // The Next image optimizer needs a server; disable it for static export.
  images: { unoptimized: true },
  // Trailing slashes help static hosts resolve directory URLs.
  trailingSlash: true,
  // Dev: skip server-only features. We use only client-side Firebase.
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  images: {
    // Placeholder home banners are local SVGs (swapped for raster artwork by the
    // developer). Allow SVGs through the optimizer; content is first-party only.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    // The dev backend serves uploads from http://localhost:5000, which resolves
    // to a private IP and is blocked by the optimizer's SSRF guard ("url"
    // parameter is not allowed"). Allowed outside production only: production
    // image hosts (CDN/S3 public base URL) must be publicly addressable.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    // The backend storage host (its API_URL) is an explicit port, so the port
    // must be listed with the pattern for the optimizer to accept the URL.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "5000" },
      { protocol: "http", hostname: "127.0.0.1", port: "5000" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "**.planthaat.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

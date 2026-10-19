import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const isProduction = process.env.NODE_ENV === "production";
// With Cloudinary configured, production only allows its host. Without it
// (offline/dev or a seed-only deployment) local images keep working.
const allowLocalImages = !isProduction || !cloudName;

const nextConfig: NextConfig = {
  // Allow a throwaway production build in a separate output directory (used for
  // local perf measurement) without clobbering the dev server's `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
    // Production allows only the Cloudinary host (scoped to the cloud name);
    // localhost is allowed in dev only for local/seed images.
    remotePatterns: [
      ...(cloudName
        ? [
            {
              protocol: "https" as const,
              hostname: "res.cloudinary.com",
              pathname: `/${cloudName}/**`,
            },
          ]
        : []),
      ...(allowLocalImages
        ? [
            { protocol: "http" as const, hostname: "localhost", port: "5000" },
            { protocol: "http" as const, hostname: "127.0.0.1", port: "5000" },
            { protocol: "https" as const, hostname: "picsum.photos" },
          ]
        : []),
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
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const privatePaths = [
      "/seller/:path*",
      "/admin/:path*",
      "/account/:path*",
      "/checkout",
      "/cart",
      "/orders/:path*",
      "/notifications",
      "/wishlist",
      "/complaints/:path*",
    ];
    const rules = [
      { source: "/:path*", headers: security },
      ...privatePaths.map((source) => ({ source, headers: noindex })),
    ];
    // CSP is applied to production builds only, so the dev server (HMR/Turbopack
    // needs eval and inline bootstrap) is not disturbed.
    if (process.env.NODE_ENV === "production") {
      const realtime = (process.env.NEXT_PUBLIC_REALTIME_URL ?? "").trim();
      const realtimeWs = realtime.replace(/^http/, "ws");
      const connect = ["'self'", realtime, realtimeWs, "http://localhost:5000", "http://127.0.0.1:5000"]
        .filter(Boolean)
        .join(" ");
      const imgSrc = [
        "'self'",
        "data:",
        "blob:",
        ...(cloudName ? ["https://res.cloudinary.com"] : []),
        ...(allowLocalImages ? ["http://localhost:5000", "http://127.0.0.1:5000"] : []),
      ].join(" ");
      const csp = [
        "default-src 'self'",
        `img-src ${imgSrc}`,
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        `connect-src ${connect}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; ");
      rules.push({
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      });
    }
    return rules;
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

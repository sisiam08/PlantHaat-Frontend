import type { MetadataRoute } from "next";

import { clientEnv } from "@/env/client";

export default function robots(): MetadataRoute.Robots {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/seller",
          "/admin",
          "/cart",
          "/checkout",
          "/account",
          "/orders",
          "/wishlist",
          "/notifications",
          "/complaints",
          "/dev",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

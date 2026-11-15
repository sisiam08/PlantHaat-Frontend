import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { serverRequest } from "./backend";
import { CACHE_TAGS } from "./cache-tags";

export interface PublicSettings {
  "payment.cod.enabled"?: boolean;
  "payment.advance.enabled"?: boolean;
  "order.codMaxAmount"?: number;
  "return.windowHours"?: number;
  "support.whatsapp"?: string;
  "support.phone"?: string;
  "support.email"?: string;
  [key: string]: unknown;
}

/**
 * Public settings are cached under the `settings` tag. An admin save revalidates
 * that tag; the 60s life is only a safety net for backend-originated changes.
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife({ stale: 0, revalidate: 60, expire: 300 });
  const { data } = await serverRequest<PublicSettings>({
    method: "GET",
    url: "/settings/public",
  });
  return data;
}

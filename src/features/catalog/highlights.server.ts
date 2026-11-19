import "server-only";

import type { HomeHighlights } from "@/lib/api/types";
import { serverRequest } from "@/server/backend";

/**
 * Active home Highlights. The backend owns the short cache and schedule
 * filtering, so this server function deliberately does not add a second cache:
 * admin saves and schedule boundaries are reflected on the next home request,
 * and a failure returns null so the section is omitted.
 */
export async function getHomeHighlights(): Promise<HomeHighlights | null> {
  try {
    const { data } = await serverRequest<HomeHighlights>({
      method: "GET",
      url: "/home/highlights",
    });
    return data;
  } catch {
    return null;
  }
}

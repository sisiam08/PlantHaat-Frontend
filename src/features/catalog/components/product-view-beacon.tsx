"use client";

import { useEffect, useRef } from "react";

import { apiPost } from "@/lib/api/client";

/**
 * Fire-and-forget product view beacon. The backend dedupes per IP within a
 * 30-minute window, so a single call per page load is enough.
 */
export function ProductViewBeacon({ productId }: { productId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) {
      return;
    }
    sent.current = true;
    void apiPost<void>(`/products/${encodeURIComponent(productId)}/view`, {}).catch(() => {
      // Best-effort analytics; never surface errors to the user.
    });
  }, [productId]);

  return null;
}

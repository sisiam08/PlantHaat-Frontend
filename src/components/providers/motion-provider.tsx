"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * One motion configuration for the whole app:
 * - `reducedMotion="user"` makes every `m.*` animation honour the OS setting.
 * - `LazyMotion` + `strict` keeps the storefront on `m` (not `motion`), so only
 *   the DOM animation feature set ships (~20 KB gz instead of the full bundle).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

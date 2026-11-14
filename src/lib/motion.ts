/** Shared motion tokens. CSS mirrors live in globals.css. */
export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  hero: 0.7,
} as const;

/** Two curves only: entrances/exits ease out; in-place transitions ease in-out. */
export const EASE = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;

/** Reserved for cart/press feedback. */
export const SPRING = { stiffness: 420, damping: 30, mass: 0.8 } as const;

"use client";

import { useLinkStatus } from "next/link";

import { cn } from "cn";

/**
 * Inline "this link is loading" hint. Must render inside a `<Link>` descendant
 * (it reads the link's pending state via `useLinkStatus`). The dot stays a
 * fixed size and only animates opacity, so it never shifts layout.
 */
export function LinkPending({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      role="status"
      aria-label={label}
      className={cn("link-hint", pending && "is-pending", className)}
    />
  );
}

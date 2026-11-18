import { Sprout } from "lucide-react";
import Link from "next/link";

import { cn } from "cn";
import { LinkPending } from "./link-pending";

export function Logo({
  className,
  showText = true,
  tone = "default",
}: {
  className?: string;
  showText?: boolean;
  tone?: "default" | "sidebar";
}) {
  return (
    <Link
      href="/"
      aria-label="PlantHaat"
      className={cn("group inline-flex min-h-11 items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none", className)}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-2xl shadow-[var(--shadow-soft)] transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:rotate-0",
          tone === "sidebar"
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        <Sprout aria-hidden className="size-5" />
      </span>
      {showText ? (
        <span
          className={cn(
            "font-heading text-base leading-none font-bold tracking-tight sm:text-lg",
            tone === "sidebar" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Plant
          <span className={tone === "sidebar" ? "text-sidebar-primary" : "text-primary"}>
            Haat
          </span>
        </span>
      ) : null}
      <LinkPending className="ms-1" />
    </Link>
  );
}

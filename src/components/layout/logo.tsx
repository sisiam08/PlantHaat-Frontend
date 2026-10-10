import { Sprout } from "lucide-react";
import Link from "next/link";

import { cn } from "cn";

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
      className={cn("group inline-flex items-center gap-2 rounded-full", className)}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:rotate-0",
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
            "font-heading text-lg leading-none font-bold tracking-tight",
            tone === "sidebar" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Plant
          <span className={tone === "sidebar" ? "text-sidebar-primary" : "text-primary"}>
            Haat
          </span>
        </span>
      ) : null}
    </Link>
  );
}

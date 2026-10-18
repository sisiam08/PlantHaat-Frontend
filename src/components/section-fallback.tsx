"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Inline, section-level error state for non-critical home/product sections.
 * Retrying re-renders the surrounding server components (the failed data is
 * never cached), so only the section recovers — not the whole page.
 */
export function SectionFallback({ className }: { className?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className={cn(
        "grid place-items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-secondary/30 p-8 text-center",
        className,
      )}
    >
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle aria-hidden className="size-4 shrink-0" />
        {t("sectionLoadFailed")}
      </p>
      <Button
        variant="outline"
        size="sm"
        loading={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {t("retry")}
      </Button>
    </div>
  );
}

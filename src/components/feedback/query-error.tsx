"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared inline query failure. Rendered instead of empty states so a network
 * or backend failure is never presented as "you have no data".
 */
export function QueryError({
  message,
  onRetry,
  retryLabel,
  className,
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <div
      role="alert"
      className={cn(
        "grid place-items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        {retryLabel ?? t("retry")}
      </Button>
    </div>
  );
}

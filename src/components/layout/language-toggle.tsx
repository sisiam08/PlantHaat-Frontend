"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { cn } from "cn";

function writeLocaleCookie(next: string) {
  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * One compact control with two equal circular segments. Switching writes the
 * locale cookie and soft-refreshes the server tree: the URL, scroll position
 * and open client state stay put, and the header never unmounts.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("shell");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "en" ? "bn" : "en";

  const change = () => {
    if (pending) return;
    writeLocaleCookie(next);
    startTransition(() => router.refresh());
  };

  return (
    <button
      type="button"
      onClick={change}
      disabled={pending}
      aria-busy={pending}
      aria-label={locale === "en" ? t("switchToBn") : t("switchToEn")}
      data-language-toggle
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        pending && "opacity-60",
        className,
      )}
    >
      <span className="inline-flex h-9 items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs font-medium">
        <span
          lang="en"
          className={cn(
            "grid size-[30px] place-items-center rounded-full",
            locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          En
        </span>
        <span
          lang="bn"
          className={cn(
            "bangla-label grid size-[30px] place-items-center rounded-full",
            locale === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          বাং
        </span>
      </span>
    </button>
  );
}

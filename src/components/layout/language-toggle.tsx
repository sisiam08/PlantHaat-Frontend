"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import { cn } from "cn";

const SCROLL_KEY = "ph:locale-scroll";

function writeLocaleCookie(next: string) {
  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * The one language control. A single button with two visible segments; a click
 * switches to the other locale exactly once. A document reload keeps the URL
 * (path, query, hash) and the browser restores the scroll position.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("shell");
  const next = locale === "en" ? "bn" : "en";

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (!saved) return;
    sessionStorage.removeItem(SCROLL_KEY);
    const y = Number(saved);
    if (!Number.isFinite(y) || y <= 0) return;
    // The hash anchor and late-loading images can move the page after mount;
    // re-apply briefly so the reader keeps their place across the reload.
    const restore = () => window.scrollTo(0, y);
    restore();
    const timers = [50, 250, 600].map((delay) => window.setTimeout(restore, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const change = () => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    writeLocaleCookie(next);
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={change}
      aria-label={locale === "en" ? t("switchToBn") : t("switchToEn")}
      data-language-toggle
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs font-medium transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <span
        lang="en"
        className={cn(
          "grid h-9 min-w-8 place-items-center rounded-full px-1.5",
          locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        En
      </span>
      <span
        lang="bn"
        className={cn(
          "bangla-label grid h-9 min-w-10 place-items-center rounded-full px-1.5",
          locale === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        বাং
      </span>
    </button>
  );
}

"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <form
      // Remount when the URL query changes so the field reflects the current search.
      key={q}
      role="search"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        router.push(value ? `/products?q=${encodeURIComponent(value)}` : "/products");
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        name="q"
        aria-label={t("searchAria")}
        placeholder={t("searchPlaceholder")}
        defaultValue={q}
        className="h-11 rounded-full border-border/60 bg-muted/50 pr-4 pl-10"
      />
    </form>
  );
}

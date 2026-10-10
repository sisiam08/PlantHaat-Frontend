"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
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
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-11 rounded-full border-border/60 bg-muted/50 pr-4 pl-10"
      />
    </form>
  );
}

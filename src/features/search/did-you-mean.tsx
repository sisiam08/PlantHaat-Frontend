"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { fetchSearchSuggestions } from "./api";

interface Suggestion {
  href: string;
  label: string;
}

/**
 * Zero-results helper on /products: the top suggestion for the query as a
 * "Did you mean …?" link (product first, then category).
 */
export function DidYouMean({ query }: { query: string }) {
  const t = useTranslations("search");
  const locale = useLocale();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    const controller = new AbortController();
    fetchSearchSuggestions(trimmed, controller.signal)
      .then((payload) => {
        const product = payload.products[0];
        const category = payload.categories[0];
        if (product) {
          setSuggestion({
            href: `/products/${encodeURIComponent(product.slug)}`,
            label: locale === "bn" && product.nameBn ? product.nameBn : product.name,
          });
        } else if (category) {
          setSuggestion({
            href: `/products?category=${encodeURIComponent(category.slug)}`,
            label: locale === "bn" && category.nameBn ? category.nameBn : category.name,
          });
        }
      })
      .catch(() => {
        // suggestions are optional; ignore failures
      });
    return () => controller.abort();
  }, [query, locale]);

  if (!suggestion) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground">
      {t("didYouMean")}{" "}
      <Link
        href={suggestion.href}
        className="font-medium text-primary underline underline-offset-2"
      >
        {suggestion.label}
      </Link>
      ?
    </p>
  );
}

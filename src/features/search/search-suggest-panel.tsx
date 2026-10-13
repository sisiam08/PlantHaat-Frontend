"use client";

import { ImageIcon, Search, Store, Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { formatBdt } from "@/lib/format/money";
import {
  EMPTY_SUGGESTIONS,
  fetchSearchSuggestions,
  type SuggestPayload,
} from "./api";
import { removeRecentSearch, clearRecentSearches, rememberSearch, useRecentSearches } from "./recent-searches";

interface PanelProps {
  query: string;
  onPickQuery: (query: string) => void;
  onNavigate: () => void;
}

/** Highlights the first occurrence of the query inside a label. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) {
    return <>{text}</>;
  }
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-foreground">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

function Thumb({ src, fallback }: { src: string | null; fallback: ReactNode }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/50">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  );
}

function useSuggestions(query: string) {
  const [payload, setPayload] = useState<SuggestPayload>(EMPTY_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const active = query.trim().length >= 2;

  useEffect(() => {
    if (!active) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      fetchSearchSuggestions(query.trim(), controller.signal)
        .then((result) => {
          setPayload(result);
          setLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }
          setPayload(EMPTY_SUGGESTIONS);
          setError(true);
          setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, query]);

  return {
    payload: active ? payload : EMPTY_SUGGESTIONS,
    loading: active && loading,
    error: active && error,
  };
}

/**
 * Lazily loaded suggestion list. Rendered inside the shared `<Command>` context
 * so cmdk keeps owning keyboard navigation and ARIA activedescendant state.
 */
export default function SearchSuggestPanel({ query, onPickQuery, onNavigate }: PanelProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const recent = useRecentSearches();
  const { payload, loading, error } = useSuggestions(query);
  const trimmed = query.trim();
  const active = trimmed.length >= 2;

  const go = (href: string) => {
    router.push(href);
    onNavigate();
  };

  const hasResults =
    payload.products.length + payload.categories.length + payload.shops.length > 0;

  return (
    <CommandList className="max-h-[70vh]">
      {!active ? (
        recent.length > 0 ? (
          <CommandGroup heading={t("recentHeading")}>
            {recent.map((item) => (
              <CommandItem
                key={`recent-${item}`}
                value={`recent:${item}`}
                onSelect={() => onPickQuery(item)}
              >
                <Search aria-hidden className="size-3.5 text-muted-foreground" />
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  aria-label={`${t("removeLabel")} ${item}`}
                  className="ml-auto grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeRecentSearch(item);
                  }}
                >
                  ×
                </button>
              </CommandItem>
            ))}
            <CommandItem
              value="recent:clear-all"
              onSelect={() => clearRecentSearches()}
              className="text-muted-foreground"
            >
              {t("clearAllLabel")}
            </CommandItem>
          </CommandGroup>
        ) : (
          <CommandEmpty>{t("hint")}</CommandEmpty>
        )
      ) : (
        <>
          <CommandItem
            value={`search-for:${trimmed}`}
            onSelect={() => {
              rememberSearch(trimmed);
              go(`/products?q=${encodeURIComponent(trimmed)}`);
            }}
            className="font-medium"
          >
            <Search aria-hidden className="size-4" />
            {t("searchFor", { query: trimmed })}
          </CommandItem>

          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t("error")}
            </div>
          ) : !hasResults ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t("noMatches", { query: trimmed })}
            </div>
          ) : (
            <>
              {payload.products.length > 0 ? (
                <CommandGroup heading={t("products")}>
                  {payload.products.map((product) => (
                    <CommandItem
                      key={`product-${product.slug}`}
                      value={`product:${product.slug}`}
                      onSelect={() => go(`/products/${encodeURIComponent(product.slug)}`)}
                    >
                      <Thumb src={product.image} fallback={<ImageIcon aria-hidden className="size-4" />} />
                      <span className="min-w-0 flex-1 truncate">
                        <Highlight
                          text={locale === "bn" && product.nameBn ? product.nameBn : product.name}
                          query={trimmed}
                        />
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {product.inStock ? formatBdt(product.minPrice, locale) : t("outOfStock")}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {payload.categories.length > 0 ? (
                <CommandGroup heading={t("categories")}>
                  {payload.categories.map((category) => (
                    <CommandItem
                      key={`category-${category.slug}`}
                      value={`category:${category.slug}`}
                      onSelect={() => go(`/products?category=${encodeURIComponent(category.slug)}`)}
                    >
                      <Thumb
                        src={category.imageUrl}
                        fallback={<Tag aria-hidden className="size-4" />}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        <Highlight
                          text={locale === "bn" && category.nameBn ? category.nameBn : category.name}
                          query={trimmed}
                        />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {payload.shops.length > 0 ? (
                <CommandGroup heading={t("shops")}>
                  {payload.shops.map((shop) => (
                    <CommandItem
                      key={`shop-${shop.slug}`}
                      value={`shop:${shop.slug}`}
                      onSelect={() => go(`/shops/${encodeURIComponent(shop.slug)}`)}
                    >
                      <Thumb src={shop.logoUrl} fallback={<Store aria-hidden className="size-4" />} />
                      <span className="min-w-0 flex-1 truncate">
                        <Highlight text={shop.name} query={trimmed} />
                      </span>
                      {shop.district ? (
                        <span className="shrink-0 text-xs text-muted-foreground">{shop.district}</span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          )}
        </>
      )}
    </CommandList>
  );
}

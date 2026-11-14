"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUp, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";
import { fetchFilterOptions, fetchListPage } from "@/features/catalog/feed";
import {
  ProductCard,
  ProductCardSkeleton,
  type ProductCardData,
} from "@/features/catalog/components/product-card";
import { toProductCardData } from "@/features/catalog/mappers";
import {
  csvToList,
  listToCsv,
  parseProductQuery,
  PRODUCT_SORTS,
  signatureOf,
  type CatalogFilterOptions,
  type CatalogPage,
  type ProductQuery,
  type ProductSort,
  type SearchParams,
} from "@/features/catalog/query";
import { queryKeys } from "@/lib/api/query-keys";
import { useListScrollRestoration } from "@/features/catalog/components/use-list-scroll-restoration";

const LIST_LIMIT = 24;
const PRICE_DEBOUNCE_MS = 350;

export interface CategoryFilterOption {
  value: string;
  label: string;
  children: { value: string; label: string }[];
}

function dedupe(pages: CatalogPage[] | undefined): ProductCardData[] {
  const seen = new Set<string>();
  const out: ProductCardData[] = [];
  for (const page of pages ?? []) {
    for (const product of page.data) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      out.push(toProductCardData(product));
    }
  }
  return out;
}

/** Query params sent to the API (page/limit are cursor-managed, not request params). */
function apiParamsOf(query: ProductQuery): Record<string, unknown> {
  const params: Record<string, unknown> = { ...query };
  delete params.page;
  delete params.limit;
  return params;
}

/** Reads/writes catalog filters in the URL (source of truth). */
function useCatalogParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => parseProductQuery(Object.fromEntries(searchParams.entries()) as SearchParams),
    [searchParams],
  );

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page");
      const qs = params.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      const current = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      if (next === current) return;

      router.replace(next, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      update((params) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
    },
    [update],
  );

  const setList = useCallback(
    (key: string, values: string[]) => setParam(key, listToCsv(values)),
    [setParam],
  );

  const toggleListValue = useCallback(
    (key: string, value: string) => {
      update((params) => {
        const current = csvToList(params.get(key));
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        const csv = listToCsv(next);
        if (csv) {
          params.set(key, csv);
        } else {
          params.delete(key);
        }
      });
    },
    [update],
  );

  return { query, searchParams, update, setParam, setList, toggleListValue };
}

function PriceRange({
  bounds,
  query,
  update,
}: {
  bounds: { min: number | null; max: number | null };
  query: ProductQuery;
  update: (mutate: (params: URLSearchParams) => void) => void;
}) {
  const t = useTranslations("catalog");
  const low = bounds.min ?? 0;
  const high = bounds.max ?? 0;
  const disabled = bounds.min === null || bounds.max === null || low === high;

  const initialMin = query.minPrice !== undefined ? Number(query.minPrice) : low;
  const initialMax = query.maxPrice !== undefined ? Number(query.maxPrice) : high;
  const [range, setRange] = useState<[number, number]>([initialMin, initialMax]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (next: [number, number]) => {
      setRange(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        update((params) => {
          if (next[0] > low) {
            params.set("minPrice", String(next[0]));
          } else {
            params.delete("minPrice");
          }
          if (next[1] < high) {
            params.set("maxPrice", String(next[1]));
          } else {
            params.delete("maxPrice");
          }
        });
      }, PRICE_DEBOUNCE_MS);
    },
    [low, high, update],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (disabled) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <span className="text-sm font-medium">{t("priceRange")}</span>
      <Slider
        min={low}
        max={high}
        step={Math.max(1, Math.round((high - low) / 100))}
        value={range}
        onValueChange={(value) => commit([value[0], value[1]] as [number, number])}
        disabled={disabled}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="price-min" className="text-xs text-muted-foreground">
            {t("minPrice")}
          </Label>
          <Input
            id="price-min"
            inputMode="numeric"
            value={String(range[0])}
            onChange={(event) => {
              const value = Number(event.target.value.replace(/[^0-9]/g, ""));
              commit([Number.isFinite(value) ? Math.min(value, range[1]) : low, range[1]]);
            }}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="price-max" className="text-xs text-muted-foreground">
            {t("maxPrice")}
          </Label>
          <Input
            id="price-max"
            inputMode="numeric"
            value={String(range[1])}
            onChange={(event) => {
              const value = Number(event.target.value.replace(/[^0-9]/g, ""));
              commit([range[0], Number.isFinite(value) ? Math.max(value, range[0]) : high]);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:border-primary/40 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Inline catalog search on mobile/tablet â€” search is this page's primary tool. */
function CatalogSearchField() {
  const t = useTranslations("search");
  const { query, setParam } = useCatalogParams();
  const [value, setValue] = useState(query.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const commit = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", next.trim() || undefined), 300);
  };

  return (
    <form
      role="search"
      action="/products"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        setParam("q", value.trim() || undefined);
      }}
      className="relative md:hidden"
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        name="q"
        value={value}
        onChange={(event) => commit(event.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("label")}
        className="pl-10"
      />
      <button type="submit" className="sr-only">
        {t("label")}
      </button>
    </form>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function FiltersFields({
  categories,
  options,
}: {
  categories: CategoryFilterOption[];
  options: CatalogFilterOptions | undefined;
}) {
  const t = useTranslations("catalog");
  const { query, update, setParam, toggleListValue } = useCatalogParams();
  const lightValues = options?.light ?? [];
  const difficultyValues = options?.difficulty ?? [];
  const selectedCategory = query.category ?? "";

  const renderCategory = (value: string, label: string, child: boolean) => {
    const active = value === selectedCategory;
    return (
      <button
        key={value}
        type="button"
        aria-pressed={active}
        onClick={() => setParam("category", active ? undefined : value)}
        className={cn(
          "flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          child && "pl-6 text-[0.8125rem]",
          active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <span className="text-sm font-medium">{t("category")}</span>
        <div className="grid gap-0.5">
          <button
            type="button"
            aria-pressed={selectedCategory === ""}
            onClick={() => setParam("category", undefined)}
            className={cn(
              "flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selectedCategory === ""
                ? "bg-primary/10 font-medium text-primary"
                : "text-foreground hover:bg-muted",
            )}
          >
            {t("allCategories")}
          </button>
          {categories.map((category) => (
            <div key={category.value} className="grid gap-0.5">
              {renderCategory(category.value, category.label, false)}
              {category.children.map((child) => renderCategory(child.value, child.label, true))}
            </div>
          ))}
        </div>
      </div>

      <PriceRange
        key={`${options?.price.min ?? "n"}-${options?.price.max ?? "n"}-${query.minPrice ?? ""}-${query.maxPrice ?? ""}`}
        bounds={options?.price ?? { min: null, max: null }}
        query={query}
        update={update}
      />

      {lightValues.length > 0 ? (
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t("light")}</span>
          <div className="flex flex-wrap gap-2">
            {lightValues.map((value) => (
              <FilterChipToggle
                key={value}
                active={csvToList(query.light).includes(value)}
                onClick={() => toggleListValue("light", value)}
              >
                {t(`lightOption.${value}`)}
              </FilterChipToggle>
            ))}
          </div>
        </div>
      ) : null}

      {difficultyValues.length > 0 ? (
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t("difficulty")}</span>
          <div className="flex flex-wrap gap-2">
            {difficultyValues.map((value) => (
              <FilterChipToggle
                key={value}
                active={csvToList(query.difficulty).includes(value)}
                onClick={() => toggleListValue("difficulty", value)}
              >
                {t(`difficultyOption.${value}`)}
              </FilterChipToggle>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        <ToggleRow
          id="filter-pet-safe"
          label={t("petSafe")}
          checked={query.isPetSafe === true}
          onCheckedChange={(checked) => setParam("isPetSafe", checked ? "true" : undefined)}
        />
        <ToggleRow
          id="filter-in-stock"
          label={t("inStock")}
          checked={query.inStock === true}
          onCheckedChange={(checked) => setParam("inStock", checked ? "true" : undefined)}
        />
        <ToggleRow
          id="filter-rating"
          label={t("rating4")}
          checked={query.minRating === "4"}
          onCheckedChange={(checked) => setParam("minRating", checked ? "4" : undefined)}
        />
        <ToggleRow
          id="filter-on-sale"
          label={t("onSale")}
          checked={query.onSale === true}
          onCheckedChange={(checked) => setParam("onSale", checked ? "true" : undefined)}
        />
      </div>
    </div>
  );
}

function SortSelect({ variant }: { variant: "full" | "compact" }) {
  const t = useTranslations("catalog");
  const { query, setParam } = useCatalogParams();
  const value = query.sort ?? "newest";
  const selectOpen = useRef(false);
  const labels: Record<ProductSort, string> = {
    newest: t("sortNewest"),
    price_asc: t("sortPriceAsc"),
    price_desc: t("sortPriceDesc"),
    popular: t("sortPopular"),
    rating: t("sortRating"),
  };
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!selectOpen.current) return;
        setParam("sort", next === "newest" ? undefined : next);
      }}
      onOpenChange={(open) => {
        selectOpen.current = open;
      }}
    >
      <SelectTrigger
        aria-label={t("sort")}
        className={cn(
          "h-11 rounded-full border-input px-4 text-sm",
          variant === "full" ? "min-w-[11rem]" : "w-[9.75rem]",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PRODUCT_SORTS.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {labels[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveFilterChips({ categories }: { categories: CategoryFilterOption[] }) {
  const t = useTranslations("catalog");
  const { query, update, setParam, toggleListValue } = useCatalogParams();

  const categoryLabel = (value: string): string => {
    for (const category of categories) {
      if (category.value === value) return category.label;
      const child = category.children.find((entry) => entry.value === value);
      if (child) return child.label;
    }
    return value;
  };

  const chips: { key: string; value: string; label: string; onRemove: () => void }[] = [];
  if (query.q) {
    chips.push({
      key: "q",
      value: query.q,
      label: `â€œ${query.q}â€`,
      onRemove: () => setParam("q", undefined),
    });
  }
  if (query.category) {
    chips.push({
      key: "category",
      value: query.category,
      label: categoryLabel(query.category),
      onRemove: () => setParam("category", undefined),
    });
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const min = query.minPrice ?? "â€¦";
    const max = query.maxPrice ?? "â€¦";
    chips.push({
      key: "price",
      value: `${min}-${max}`,
      label: `${t("priceRange")}: à§³${min}â€“à§³${max}`,
      onRemove: () =>
        update((params) => {
          params.delete("minPrice");
          params.delete("maxPrice");
        }),
    });
  }
  for (const value of csvToList(query.light)) {
    chips.push({
      key: `light-${value}`,
      value,
      label: `${t("light")}: ${t(`lightOption.${value}`)}`,
      onRemove: () => toggleListValue("light", value),
    });
  }
  for (const value of csvToList(query.difficulty)) {
    chips.push({
      key: `difficulty-${value}`,
      value,
      label: `${t("difficulty")}: ${t(`difficultyOption.${value}`)}`,
      onRemove: () => toggleListValue("difficulty", value),
    });
  }
  if (query.isPetSafe) {
    chips.push({
      key: "isPetSafe",
      value: "true",
      label: t("petSafe"),
      onRemove: () => setParam("isPetSafe", undefined),
    });
  }
  if (query.inStock) {
    chips.push({
      key: "inStock",
      value: "true",
      label: t("inStock"),
      onRemove: () => setParam("inStock", undefined),
    });
  }
  if (query.minRating) {
    chips.push({
      key: "minRating",
      value: query.minRating,
      label: t("rating4"),
      onRemove: () => setParam("minRating", undefined),
    });
  }
  if (query.onSale) {
    chips.push({
      key: "onSale",
      value: "true",
      label: t("onSale"),
      onRemove: () => setParam("onSale", undefined),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  const clearAll = () => {
    update((params) => {
      const keep = params.get("sort");
      for (const key of Array.from(params.keys())) {
        params.delete(key);
      }
      if (keep) {
        params.set("sort", keep);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 rounded-full pr-1.5 pl-3">
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`${t("remove")} ${chip.label}`}
            className="grid size-5 place-items-center rounded-full hover:bg-background/60"
          >
            <X aria-hidden className="size-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}

export function ProductsBrowser({
  categories,
  locale,
  initialPage,
  initialSignature,
}: {
  categories: CategoryFilterOption[];
  locale: string;
  /** Server-rendered first page (skipped when it does not match the URL). */
  initialPage?: CatalogPage;
  initialSignature?: string;
}) {
  const t = useTranslations("catalog");
  const tp = useTranslations("product");
  const { query } = useCatalogParams();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const signature = useMemo(() => signatureOf(query), [query]);
  const apiParams = useMemo(() => apiParamsOf(query), [query]);

  const filterOptions = useQuery({
    queryKey: queryKeys.catalog.filterOptions(query.category ?? "", query.q ?? ""),
    queryFn: () => fetchFilterOptions({ category: query.category, q: query.q }),
    staleTime: 5 * 60 * 1000,
  });

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.catalog.list(signature),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchListPage(apiParams, pageParam as string | null, LIST_LIMIT, signal),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    initialData:
      initialPage && initialSignature === signature
        ? { pages: [initialPage], pageParams: [null] }
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const products = useMemo(() => dedupe(listQuery.data?.pages), [listQuery.data]);
  const total = listQuery.data?.pages
    .map((page) => page.meta.total)
    .find((value) => typeof value === "number");
  const busy = listQuery.isFetching;
  const loadedPages = listQuery.data?.pages.length ?? 0;
  const nextCursor = listQuery.data?.pages.at(-1)?.meta.nextCursor ?? null;

  useListScrollRestoration({
    storageKey: `products:${signature}`,
    pages: loadedPages,
    cursor: nextCursor,
    ready: products.length > 0,
  });

  // Reset scroll to the top of the results on every filter/sort change.
  const previousSignature = useRef(signature);
  useEffect(() => {
    if (previousSignature.current !== signature) {
      previousSignature.current = signature;
      resultsRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [signature]);

  // Infinite scroll sentinel (~600px before the end).
  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
          void listQuery.fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [listQuery]);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 1600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeCount = [
    query.q,
    query.category,
    query.minPrice,
    query.maxPrice,
    query.light,
    query.difficulty,
    query.isPetSafe ? "1" : undefined,
    query.inStock ? "1" : undefined,
    query.minRating,
    query.onSale ? "1" : undefined,
  ].filter(Boolean).length;

  const showInitialError = listQuery.isError && products.length === 0;
  // Avoid a narrow flash of "0 results" before the first fetch resolves.
  const isFirstLoad = listQuery.isLoading && products.length === 0;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_1fr] lg:py-12">
      <aside className="hidden lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:block lg:self-start">
        <div className="grid max-h-[calc(100dvh-7rem)] gap-4 overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal aria-hidden className="size-4" />
            {t("filters")}
          </p>
          <FiltersFields categories={categories} options={filterOptions.data} />
        </div>
      </aside>

      <section
        ref={resultsRef}
        className="grid content-start gap-5 scroll-mt-[calc(var(--header-h)+1rem)]"
      >
        <div className="flex flex-col gap-3">
          <CatalogSearchField />
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 justify-center">
                  <SlidersHorizontal aria-hidden className="size-4" />
                  {t("filters")}
                  {activeCount > 0 ? (
                    <Badge className="ml-1 rounded-full px-2" variant="secondary">
                      {activeCount}
                    </Badge>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="flex max-h-[88dvh] flex-col rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal aria-hidden className="size-4" />
                    {t("filters")}
                  </SheetTitle>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24">
                  <FiltersFields categories={categories} options={filterOptions.data} />
                </div>
                <div className="border-t border-border/60 p-4">
                  <SheetTrigger asChild>
                    <Button variant="cta" className="w-full">
                      {t("showResultsPlain")}
                    </Button>
                  </SheetTrigger>
                </div>
              </SheetContent>
            </Sheet>
            <SortSelect variant="compact" />
          </div>

          <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-4">
            <div className="grid gap-1">
              <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">
                {total !== undefined
                  ? t("results", { count: total })
                  : isFirstLoad
                    ? t("loadingLabel")
                    : null}
              </p>
            </div>
            <div className="hidden lg:block">
              <SortSelect variant="full" />
            </div>
          </div>

          <ActiveFilterChips categories={categories} />
        </div>

        <div className="relative">
          {busy && products.length > 0 ? (
            <div
              aria-hidden
              className="absolute inset-x-0 -top-2 h-0.5 overflow-hidden rounded-full"
            >
              <div className="catalog-progress-bar h-full w-1/3 bg-primary" />
            </div>
          ) : null}

          {products.length === 0 ? (
            isFirstLoad ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: 10 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : showInitialError ? (
              <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border/60 p-12 text-center">
                <p className="text-sm text-muted-foreground">{t("listError")}</p>
                <Button variant="outline" onClick={() => void listQuery.refetch()}>
                  {t("retry")}
                </Button>
              </div>
            ) : (
              <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border/60 p-12 text-center">
                <p className="font-medium">{t("empty")}</p>
                <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
              </div>
            )
          ) : (
            <div
              className={cn(
                "transition-opacity",
                busy ? "pointer-events-none opacity-55" : "opacity-100",
              )}
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    name={tp("outOfStock")}
                    locale={locale}
                    actionLabels={{
                      wishlistAdd: tp("wishlistAdd"),
                    }}
                  />
                ))}
                {listQuery.isFetchingNextPage
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <ProductCardSkeleton key={`skeleton-${index}`} />
                    ))
                  : null}
              </div>

              <div className="mt-6 flex flex-col items-center gap-2">
                {listQuery.isError && products.length > 0 ? (
                  <Button variant="outline" onClick={() => void listQuery.refetch()}>
                    {t("retry")}
                  </Button>
                ) : null}
                {listQuery.hasNextPage ? (
                  <Button
                    variant="outline"
                    disabled={listQuery.isFetchingNextPage}
                    onClick={() => void listQuery.fetchNextPage()}
                  >
                    {t("loadMore")}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("listEnd")}</p>
                )}
              </div>
            </div>
          )}

          <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
        </div>
      </section>

      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t("backToTop")}
          className="fixed right-4 bottom-20 z-40 grid size-11 place-items-center rounded-full border border-border/60 bg-card/95 text-foreground shadow-md backdrop-blur-md md:bottom-6"
        >
          <ArrowUp aria-hidden />
        </button>
      ) : null}
    </main>
  );
}

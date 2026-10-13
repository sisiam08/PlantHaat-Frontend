"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface FilterOption {
  value: string;
  label: string;
}

const SELECT_CLASS =
  "h-10 w-full rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function ProductFilters({
  categories,
  districts,
  categoryName,
}: {
  categories: FilterOption[];
  districts: FilterOption[];
  /** Display name of the currently selected category (pre-fills the search box). */
  categoryName?: string;
}) {
  return (
    <FiltersForm categories={categories} districts={districts} categoryName={categoryName} />
  );
}

/** Mobile: opens the same filters in a bottom drawer. */
export function ProductFiltersDrawer({
  children,
  categories,
  districts,
  categoryName,
}: {
  children?: React.ReactNode;
  categories: FilterOption[];
  districts: FilterOption[];
  categoryName?: string;
}) {
  const t = useTranslations("catalog");
  const searchParams = useSearchParams();
  const activeCount = ["category", "deliversTo", "minPrice", "maxPrice", "q", "inStock", "isIndoor", "isPetSafe"].filter(
    (key) => searchParams.get(key),
  ).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-center lg:hidden">
          {t("filters")}
          {activeCount > 0 ? (
            <Badge className="ml-1 rounded-full px-2" variant="secondary">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden className="size-4" />
            {t("filters")}
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FiltersForm categories={categories} districts={districts} categoryName={categoryName} />
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FiltersForm({
  categories,
  districts,
  categoryName,
}: {
  categories: FilterOption[];
  districts: FilterOption[];
  categoryName?: string;
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  const get = (key: string) => searchParams.get(key) ?? "";
  const currentCategory = get("category");
  const categoryPrefill = currentCategory && categoryName ? categoryName : "";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    // Carry over the non-text filters unchanged.
    for (const key of ["deliversTo", "minPrice", "maxPrice", "sort"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value && value !== "false") params.set(key, value);
    }
    for (const key of ["inStock", "isIndoor", "isPetSafe"]) {
      if (formData.get(key) === "true") params.set(key, "true");
    }

    // The search box behaves like a category search: submitting the unchanged
    // category name keeps the category filter; editing it becomes a normal text
    // search; clearing it (and not picking a new category) shows all products.
    const q = String(formData.get("q") ?? "").trim();
    const selectedCategory = String(formData.get("category") ?? "");
    const unchangedCategoryName = Boolean(categoryPrefill) && q === categoryPrefill;

    if (q && !unchangedCategoryName) {
      params.set("q", q);
    } else if (selectedCategory && selectedCategory !== currentCategory) {
      params.set("category", selectedCategory);
    } else if (unchangedCategoryName && currentCategory) {
      params.set("category", currentCategory);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setPending(false);
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="q">{t("search")}</Label>
        <Input
          id="q"
          name="q"
          defaultValue={get("q") || categoryPrefill}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="category">{t("category")}</Label>
        <select
          id="category"
          name="category"
          defaultValue={currentCategory}
          className={SELECT_CLASS}
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="deliversTo">{t("deliversTo")}</Label>
        <select
          id="deliversTo"
          name="deliversTo"
          defaultValue={get("deliversTo")}
          className={SELECT_CLASS}
        >
          <option value="">{t("anywhere")}</option>
          {districts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="minPrice">{t("minPrice")}</Label>
          <Input id="minPrice" name="minPrice" inputMode="numeric" defaultValue={get("minPrice")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="maxPrice">{t("maxPrice")}</Label>
          <Input id="maxPrice" name="maxPrice" inputMode="numeric" defaultValue={get("maxPrice")} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="sort">{t("sort")}</Label>
        <select
          id="sort"
          name="sort"
          defaultValue={get("sort") || "newest"}
          className={SELECT_CLASS}
        >
          <option value="newest">{t("sortNewest")}</option>
          <option value="price_asc">{t("sortPriceAsc")}</option>
          <option value="price_desc">{t("sortPriceDesc")}</option>
          <option value="popular">{t("sortPopular")}</option>
          <option value="rating">{t("sortRating")}</option>
        </select>
      </div>

      <div className="grid gap-2 text-sm">
        <label className="inline-flex items-center gap-2 accent-primary">
          <input type="checkbox" name="inStock" value="true" defaultChecked={get("inStock") === "true"} />
          {t("inStock")}
        </label>
        <label className="inline-flex items-center gap-2 accent-primary">
          <input type="checkbox" name="isIndoor" value="true" defaultChecked={get("isIndoor") === "true"} />
          {t("indoor")}
        </label>
        <label className="inline-flex items-center gap-2 accent-primary">
          <input type="checkbox" name="isPetSafe" value="true" defaultChecked={get("isPetSafe") === "true"} />
          {t("petSafe")}
        </label>
      </div>

      <Button type="submit" variant="cta" disabled={pending}>
        {t("apply")}
      </Button>
    </form>
  );
}

interface FilterChipsProps {
  categories: FilterOption[];
  districts: FilterOption[];
}

export function FilterChips({ categories, districts }: FilterChipsProps) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const labelFor = (key: string, value: string): string | null => {
    if (key === "category") {
      return categories.find((option) => option.value === value)?.label ?? null;
    }
    if (key === "deliversTo") {
      return `${t("deliversTo")}: ${districts.find((option) => option.value === value)?.label ?? value}`;
    }
    if (key === "minPrice") return `${t("minPrice")} ≥ ${value}`;
    if (key === "maxPrice") return `${t("maxPrice")} ≤ ${value}`;
    if (key === "q") return value;
    if (key === "inStock") return t("inStock");
    if (key === "isIndoor") return t("indoor");
    if (key === "isPetSafe") return t("petSafe");
    return null;
  };

  const chips = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "sort" || key === "page") continue;
    const label = labelFor(key, value);
    if (label) {
      chips.push({ key, value, label });
    }
  }
  if (chips.length === 0) {
    return null;
  }

  const remove = (removal: { key: string; value: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(removal.key);
    if (removal.key === "category") {
      // Removing the category must not leave a stale text-search prefill.
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clearAll = () => {
    const params = searchParams.get("sort")
      ? new URLSearchParams({ sort: searchParams.get("sort") as string })
      : new URLSearchParams();
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 rounded-full pl-3 pr-1.5">
          {chip.label}
          <button
            type="button"
            onClick={() => remove(chip)}
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

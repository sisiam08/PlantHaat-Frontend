"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FilterOption {
  value: string;
  label: string;
}

const SELECT_CLASS =
  "h-10 rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function ProductFilters({
  categories,
  districts,
}: {
  categories: FilterOption[];
  districts: FilterOption[];
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  const get = (key: string) => searchParams.get(key) ?? "";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const str = String(value).trim();
      if (str && str !== "false") {
        params.set(key, str);
      }
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
        <Input id="q" name="q" defaultValue={get("q")} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="category">{t("category")}</Label>
        <select
          id="category"
          name="category"
          defaultValue={get("category")}
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

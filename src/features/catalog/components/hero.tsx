import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroComposition } from "@/features/catalog/components/hero-composition";
import type { CategoryNode } from "@/lib/api/types";

/**
 * Server-rendered hero. The headline/search/CTA exist in the first HTML payload;
 * only the decorative depth planes hydrate for parallax.
 */
export async function Hero({
  categories,
  placeholderImageUrls,
}: {
  categories: CategoryNode[];
  placeholderImageUrls: Set<string>;
}) {
  const t = await getTranslations("home");
  const ts = await getTranslations("search");
  const locale = await getLocale();

  const plates = categories
    .filter((category) => Boolean(category.imageUrl))
    .slice(0, 2)
    .map((category) => ({
      name: locale === "bn" && category.nameBn ? category.nameBn : category.name,
      slug: category.slug,
      imageUrl: category.imageUrl ?? null,
      placeholder: placeholderImageUrls.has(category.imageUrl ?? ""),
    }));

  return (
    <section
      aria-labelledby="home-hero-title"
      data-home-hero
      className="hero-grain relative overflow-hidden border-y border-border/60 bg-[radial-gradient(120%_120%_at_85%_10%,var(--secondary)_0%,var(--background)_46%,color-mix(in_oklab,var(--secondary)_55%,white)_100%)]"
    >
      <svg
        aria-hidden
        viewBox="0 0 200 260"
        className="pointer-events-none absolute -right-10 bottom-2 h-44 w-32 text-primary/[0.07] md:hidden"
      >
        <path
          d="M100 254C46 206 28 138 62 56c50 22 88 82 94 150-18 20-36 36-56 48Z"
          fill="currentColor"
        />
        <path
          d="M100 236c16-46 34-78 56-104"
          stroke="var(--background)"
          strokeWidth="2.5"
          fill="none"
        />
      </svg>
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:py-16">
        <div className="grid gap-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {t("heroBadge")}
          </p>

          <h1
            id="home-hero-title"
            className="font-heading text-balance text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl"
          >
            {t("heroTitle")}
          </h1>

          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{t("heroSubtitle")}</p>

          <form
            action="/products"
            method="get"
            role="search"
            className="flex w-full max-w-xl flex-col gap-2 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                name="q"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label={ts("label")}
                placeholder={ts("placeholder")}
                className="h-12 rounded-full border-input bg-card pl-11 text-base shadow-sm"
              />
            </div>
            <Button type="submit" variant="cta" size="lg" className="h-12 w-full px-6 lg:w-auto">
              {ts("label")}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <Link
              href="/shops"
              className="inline-flex min-h-11 items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("heroCtaSecondary")}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("heroCta")}
            </Link>
          </div>
        </div>

        <HeroComposition plates={plates} />
      </div>
    </section>
  );
}

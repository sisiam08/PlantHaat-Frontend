import { getLocale, getTranslations } from "next-intl/server";

import { HomeSection } from "@/components/layout/home-section";
import { SectionHeader } from "@/components/layout/section-header";
import { HighlightSlideView } from "@/features/catalog/components/highlight-slide-view";
import { HighlightsCarousel } from "@/features/catalog/components/highlights-carousel";
import type { HomeHighlights } from "@/lib/api/types";

/**
 * Feature-off / no-active-slide / API-failure all return null: no section,
 * heading, gap or skeleton is left in the DOM. Data is fetched with the rest of
 * the home data so the section never appears late and shifts the page.
 */
export async function HomeHighlightsSlot({ data }: { data: HomeHighlights | null }) {
  if (!data || !data.enabled || data.slides.length === 0) return null;

  const t = await getTranslations("home");
  const locale = await getLocale();
  const title = locale === "en" ? data.title.en : data.title.bn;
  const hasTitle = title.trim() !== "";

  return (
    <HomeSection
      labelledBy={hasTitle ? "home-highlights" : undefined}
      ariaLabel={hasTitle ? undefined : t("bannerLabel")}
    >
      <div className="grid gap-4">
        {hasTitle ? <SectionHeader id="home-highlights" title={title} /> : null}
        {data.slides.length === 1 ? (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <HighlightSlideView slide={data.slides[0]} locale={locale} total={1} />
          </div>
        ) : (
          <HighlightsCarousel
            slides={data.slides}
            autoplay={data.autoplay}
            intervalSeconds={data.intervalSeconds}
          />
        )}
      </div>
    </HomeSection>
  );
}

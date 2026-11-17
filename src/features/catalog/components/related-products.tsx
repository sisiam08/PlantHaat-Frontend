import { getLocale, getTranslations } from "next-intl/server";

import { SectionHeader } from "@/components/layout/section-header";
import { ProductRail } from "@/features/catalog/components/product-card";
import { toProductCardData } from "@/features/catalog/mappers";
import { getRelated } from "@/features/catalog/server";

export async function RelatedProducts({
  slug,
  excludeId,
}: {
  slug: string;
  excludeId?: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("product");

  let products;
  try {
    products = await getRelated(slug, 6);
  } catch {
    return null;
  }

  const cards = products
    .filter((product) => product.id !== excludeId)
    .slice(0, 6)
    .map(toProductCardData);

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-5">
      <SectionHeader title={t("relatedTitle")} />
      <ProductRail
        label={t("relatedTitle")}
        products={cards}
        locale={locale}
        outOfStockLabel={t("outOfStock")}
        actionLabels={{
          wishlistAdd: t("wishlistAdd"),
        }}
        ratingLabels={{
          noReviews: t("noReviews"),
          aria: t.raw("ratingAriaLabel") as string,
        }}
      />
    </section>
  );
}


import { getLocale, getTranslations } from "next-intl/server";

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
    <section className="grid gap-5">
      <h2 className="font-heading text-2xl font-semibold">{t("relatedTitle")}</h2>
      <ProductRail products={cards} locale={locale} outOfStockLabel={t("outOfStock")} />
    </section>
  );
}

import { getProduct } from "@/features/catalog/server";
import {
  getOgLocale,
  ogContentType,
  ogMessages,
  ogSize,
  renderBrandImage,
} from "@/features/og/brand-image";
import { formatBdt } from "@/lib/format/money";

export const alt = "PlantHaat product";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getOgLocale();
  const messages = ogMessages(locale);

  try {
    const product = await getProduct(slug);
    if (!product) {
      return renderBrandImage({
        title: messages.home.heroTitle,
        subtitle: messages.home.heroSubtitle,
      });
    }
    const shop = product.shop as unknown as { name?: string } | undefined;
    return renderBrandImage({
      title: product.name,
      subtitle: shop?.name,
      price: product.minPrice ? formatBdt(product.minPrice, locale) : undefined,
    });
  } catch {
    return renderBrandImage({
      title: messages.home.heroTitle,
      subtitle: messages.home.heroSubtitle,
    });
  }
}

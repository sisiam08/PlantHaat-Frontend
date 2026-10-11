import { getShop } from "@/features/catalog/server";
import {
  getOgLocale,
  ogContentType,
  ogMessages,
  ogSize,
  renderBrandImage,
} from "@/features/og/brand-image";

export const alt = "PlantHaat shop";
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
    const shop = await getShop(slug);
    return renderBrandImage({
      title: shop.name,
      subtitle: shop.description ?? undefined,
    });
  } catch {
    return renderBrandImage({
      title: messages.home.heroTitle,
      subtitle: messages.home.heroSubtitle,
    });
  }
}

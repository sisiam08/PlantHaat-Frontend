import {
  getOgLocale,
  ogContentType,
  ogMessages,
  ogSize,
  renderBrandImage,
} from "@/features/og/brand-image";

export const alt = "PlantHaat — verified plant nurseries across Bangladesh";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image() {
  const locale = await getOgLocale();
  const messages = ogMessages(locale);
  return renderBrandImage({
    title: messages.home.heroTitle,
    subtitle: messages.home.heroSubtitle,
  });
}

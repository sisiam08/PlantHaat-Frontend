import type { PublicSettings } from "@/server/public-settings";

export interface LocalizedText {
  bn: string;
  en: string;
}

export interface HeroImage {
  url: string;
  mobileUrl: string;
  altBn: string;
  altEn: string;
  focalX: number;
  focalY: number;
}

export interface HeroContent {
  headline: LocalizedText;
  subheadline: LocalizedText;
  image: HeroImage;
}

export const HERO_DEFAULTS: HeroContent = {
  headline: { bn: "আপনার ঘর সবুজে ভরে তুলুন", en: "Fill your home with green" },
  subheadline: {
    bn: "সারা বাংলাদেশে যাচাইকৃত নার্সারির গাছ - ক্যাশ অন ডেলিভারি, নিরাপদ প্যাকেজিং।",
    en: "Plants from verified nurseries across Bangladesh - cash on delivery, plant-safe packaging.",
  },
  image: { url: "", mobileUrl: "", altBn: "", altEn: "", focalX: 50, focalY: 50 },
};

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function localized(value: unknown, fallback: LocalizedText): LocalizedText {
  const item = record(value);
  if (!item) return fallback;
  return { bn: text(item.bn, fallback.bn), en: text(item.en, fallback.en) };
}

/** Same-site relative path or https URL. Mirrors the backend guard. */
export function isSafeHeroHref(href: unknown): href is string {
  if (typeof href !== "string") return false;
  const value = href.trim();
  if (value === "" || value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  return /^https:\/\/[^\s]+$/i.test(value);
}

function heroImage(value: unknown): HeroImage {
  const item = record(value);
  if (!item) return HERO_DEFAULTS.image;
  const url = text(item.url, "").trim();
  const mobileUrl = text(item.mobileUrl, "").trim();
  const focalX = typeof item.focalX === "number" ? Math.min(100, Math.max(0, item.focalX)) : 50;
  const focalY = typeof item.focalY === "number" ? Math.min(100, Math.max(0, item.focalY)) : 50;
  return {
    url: isSafeHeroHref(url) ? url : "",
    mobileUrl: isSafeHeroHref(mobileUrl) ? mobileUrl : "",
    altBn: text(item.altBn, ""),
    altEn: text(item.altEn, ""),
    focalX,
    focalY,
  };
}

export function readHeroContent(settings: PublicSettings): HeroContent {
  return {
    headline: localized(settings["home.hero.headline"], HERO_DEFAULTS.headline),
    subheadline: localized(settings["home.hero.subheadline"], HERO_DEFAULTS.subheadline),
    image: heroImage(settings["home.hero.image"]),
  };
}

export function pickText(value: LocalizedText, locale: string): string {
  return locale === "en" ? value.en : value.bn;
}

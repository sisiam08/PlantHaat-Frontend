/**
 * Home-page banners live in code (no API call) so the hero paints instantly and
 * stays cacheable. The admin banner CRUD / `GET /home` banners are intentionally
 * not used here (see FRONTEND_CONTEXT.md §9). Swap the placeholder images in
 * `public/banners/` for the final artwork (same names/dimensions).
 */
export interface HomeBanner {
  id: string;
  image: { desktop: string; mobile: string };
  alt: { bn: string; en: string };
  href: string;
  headline?: { bn: string; en: string };
  cta?: { bn: string; en: string };
}

export const HOME_BANNERS: HomeBanner[] = [
  {
    id: "greener-home",
    image: {
      desktop: "/banners/banner-1.svg",
      mobile: "/banners/banner-1-mobile.svg",
    },
    alt: { bn: "সবুজে ভরা ঘর", en: "A home filled with green" },
    href: "/products",
    headline: { bn: "ঘর ভরে তুলুন সবুজে", en: "Fill your home with green" },
    cta: { bn: "গাছ দেখুন", en: "Shop plants" },
  },
  {
    id: "new-arrivals",
    image: {
      desktop: "/banners/banner-2.svg",
      mobile: "/banners/banner-2-mobile.svg",
    },
    alt: { bn: "নতুন গাছের সংগ্রহ", en: "New plant arrivals" },
    href: "/products?sort=newest",
    headline: { bn: "নতুন গাছ এসেছে", en: "New plants just arrived" },
    cta: { bn: "নতুন সংগ্রহ দেখুন", en: "See what's new" },
  },
  {
    id: "cod-nationwide",
    image: {
      desktop: "/banners/banner-3.svg",
      mobile: "/banners/banner-3-mobile.svg",
    },
    alt: { bn: "সারা দেশে ক্যাশ অন ডেলিভারি", en: "Cash on delivery nationwide" },
    href: "/products",
    headline: { bn: "সারা দেশে ক্যাশ অন ডেলিভারি", en: "Cash on delivery, nationwide" },
    cta: { bn: "এখনই কিনুন", en: "Order now" },
  },
];

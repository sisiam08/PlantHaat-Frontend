import { HERO_SCENE } from "@/features/catalog/hero-scene.generated";

function candidates(plant: (typeof HERO_SCENE.plants)[number]) {
  const list: Array<{ suffix: string; width: number }> = [];
  if (plant.mobileWidth) list.push({ suffix: "-mobile", width: plant.mobileWidth });
  list.push({ suffix: "-small", width: plant.smallWidth });
  if (plant.mediumWidth) list.push({ suffix: "-medium", width: plant.mediumWidth });
  list.push({ suffix: "", width: plant.width });
  return list;
}

/**
 * The hero palm is the home LCP element. Emit its preload in the earliest
 * streamed shell instead of at the end of the hero subtree, so discovery is
 * not gated on the settings/highlights reads. The admin hero image override
 * still renders correctly; this only preloads the default scene asset.
 */
export function HeroPreload() {
  const palm = HERO_SCENE.plants.find((plant) => plant.key === "palm");
  if (!palm) return null;
  const srcSet = candidates(palm)
    .map(({ suffix, width }) => `/hero/palm${suffix}.avif ${width}w`)
    .join(", ");
  const sizes = `(min-width: 1024px) ${(palm.visibleWidthPct * 0.4).toFixed(1)}vw, (min-width: 640px) ${Math.round(palm.visibleWidthPct * 4.62)}px, ${Math.round(palm.visibleWidthPct * 3.3)}px`;
  return (
    <link
      rel="preload"
      as="image"
      type="image/avif"
      href="/hero/palm-mobile.avif"
      imageSrcSet={srcSet}
      imageSizes={sizes}
      fetchPriority="high"
    />
  );
}

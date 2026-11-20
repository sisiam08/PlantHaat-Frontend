import { HeroSceneCanvas } from "@/features/catalog/components/hero-scene-canvas";
import { HERO_SCENE } from "@/features/catalog/hero-scene.generated";

type Plant = (typeof HERO_SCENE.plants)[number];

function candidates(plant: Plant) {
  const list: Array<{ suffix: string; width: number }> = [];
  if (plant.mobileWidth) list.push({ suffix: "-mobile", width: plant.mobileWidth });
  list.push({ suffix: "-small", width: plant.smallWidth });
  if (plant.mediumWidth) list.push({ suffix: "-medium", width: plant.mediumWidth });
  list.push({ suffix: "", width: plant.width });
  return list;
}

function srcSet(plant: Plant, format: "avif" | "webp") {
  return candidates(plant)
    .map(({ suffix, width }) => `/hero/${plant.key}${suffix}.${format} ${width}w`)
    .join(", ");
}

function sizesFor(visibleWidthPct: number) {
  const mobilePx = Math.round(visibleWidthPct * 3.3);
  const smPx = Math.round(visibleWidthPct * 4.62);
  return `(min-width: 1024px) ${(visibleWidthPct * 0.4).toFixed(1)}vw, (min-width: 640px) ${smPx}px, ${mobilePx}px`;
}

/**
 * Static, server-rendered plant scene. This is the no-JS/reduced-motion/
 * save-data/no-WebGL result; the canvas island only enhances it after paint.
 * The inner 11:10 box keeps the supplied composition at every width; the outer
 * stage fits that box by height on small screens and centers it.
 */
export function HeroScene() {
  const palm = HERO_SCENE.plants.find((plant) => plant.key === "palm")!;
  return (
    <div
      data-hero-stage-outer
      className="relative mx-auto flex h-[300px] w-full items-end justify-center overflow-hidden sm:h-[420px] lg:h-auto lg:aspect-11/10 lg:max-w-none"
    >
      <div
        data-hero-stage
        className="relative h-full aspect-11/10 max-h-full shrink-0 overflow-hidden"
      >
        <link
          rel="preload"
          as="image"
          type="image/avif"
          href="/hero/palm-mobile.avif"
          imageSrcSet={srcSet(palm, "avif")}
          imageSizes={sizesFor(palm.visibleWidthPct)}
          fetchPriority="high"
        />
        {HERO_SCENE.plants.map((plant) => (
          <span
            key={`shadow-${plant.key}`}
            aria-hidden
            className="absolute rounded-[50%]"
            style={{
              left: `${plant.shadow.leftPct}%`,
              bottom: `${plant.shadow.bottomPct}%`,
              width: `${plant.shadow.widthPct}%`,
              height: `${plant.shadow.heightPct}%`,
              background:
                "radial-gradient(ellipse at center, rgb(11 33 22 / 0.16) 0%, rgb(11 33 22 / 0.08) 45%, transparent 72%)",
              filter: "blur(2px)",
            }}
          />
        ))}

        {HERO_SCENE.plants.map((plant) => (
          <picture
            key={plant.key}
            data-order={plant.drawOrder}
            className="pointer-events-none absolute block max-w-none select-none"
            style={{
              left: `${plant.leftPct}%`,
              bottom: `${plant.bottomPct}%`,
              height: `${plant.heightPct}%`,
              zIndex: 10 + plant.drawOrder,
            }}
          >
            <source type="image/avif" srcSet={srcSet(plant, "avif")} sizes={sizesFor(plant.visibleWidthPct)} />
            <img
              data-hero-plant={plant.key}
              data-order={plant.drawOrder}
              data-pivot-x={plant.pivot.x}
              data-pivot-y={plant.pivot.y}
              data-amp={plant.amp}
              data-phase={plant.phase}
              data-aspect={plant.textureAspect}
              src={`/hero/${plant.key}.webp`}
              srcSet={srcSet(plant, "webp")}
              sizes={sizesFor(plant.visibleWidthPct)}
              width={plant.width}
              height={plant.height}
              alt=""
              loading={plant.key === "palm" ? "eager" : "lazy"}
              fetchPriority={plant.key === "palm" ? "high" : "auto"}
              decoding={plant.key === "palm" ? "sync" : "async"}
              className="block h-full w-auto max-w-none select-none"
            />
          </picture>
        ))}

        <HeroSceneCanvas />
      </div>
    </div>
  );
}

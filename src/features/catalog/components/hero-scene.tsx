import { HeroSceneCanvas } from "@/features/catalog/components/hero-scene-canvas";
import { HERO_SCENE } from "@/features/catalog/hero-scene.generated";

function srcSet(
  key: string,
  width: number,
  smallWidth: number,
  mobileWidth?: number | null,
  mediumWidth?: number | null,
) {
  const mobile = mobileWidth ? `/hero/${key}-mobile.webp ${mobileWidth}w, ` : "";
  const medium = mediumWidth ? `/hero/${key}-medium.webp ${mediumWidth}w, ` : "";
  return `${mobile}/hero/${key}-small.webp ${smallWidth}w, ${medium}/hero/${key}.webp ${width}w`;
}

function sizesFor(visibleWidthPct: number) {
  return `(min-width: 1024px) ${(visibleWidthPct * 0.44).toFixed(1)}vw, ${(
    visibleWidthPct * 0.92
  ).toFixed(1)}vw`;
}

/**
 * Static, server-rendered plant scene. This is the no-JS/reduced-motion/
 * save-data/no-WebGL result; the canvas island only enhances it after paint.
 * No borders, cards or background: the hero gradient is the scene.
 */
export function HeroScene() {
  const palm = HERO_SCENE.plants.find((plant) => plant.key === "palm")!;
  return (
    <div
      data-hero-stage
      aria-hidden="true"
      className="relative mx-auto aspect-3/2 w-full max-w-[560px] overflow-hidden select-none lg:aspect-11/10 lg:max-w-none"
    >
      <link
        rel="preload"
        as="image"
        href="/hero/palm-small.webp"
        imageSrcSet={srcSet("palm", palm.width, palm.smallWidth, palm.mobileWidth, palm.mediumWidth)}
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
        <img
          key={plant.key}
          data-hero-plant={plant.key}
          data-order={plant.drawOrder}
          data-pivot-x={plant.pivot.x}
          data-pivot-y={plant.pivot.y}
          data-amp={plant.amp}
          data-phase={plant.phase}
          data-aspect={plant.textureAspect}
          src={`/hero/${plant.key}.webp`}
          srcSet={srcSet(plant.key, plant.width, plant.smallWidth, plant.mobileWidth, plant.mediumWidth)}
          sizes={sizesFor(plant.visibleWidthPct)}
          width={plant.width}
          height={plant.height}
          alt=""
          loading={plant.key === "palm" ? "eager" : "lazy"}
          fetchPriority={plant.key === "palm" ? "high" : "auto"}
          decoding={plant.key === "palm" ? "sync" : "async"}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            left: `${plant.leftPct}%`,
            bottom: `${plant.bottomPct}%`,
            height: `${plant.heightPct}%`,
            width: "auto",
            zIndex: 10 + plant.drawOrder,
          }}
        />
      ))}

      <HeroSceneCanvas />
    </div>
  );
}

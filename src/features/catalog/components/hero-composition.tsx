"use client";

import { m, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { PlantImage } from "@/components/plant-image";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface Plate {
  name: string;
  imageUrl: string | null;
}

/**
 * Decorative 2.5D hero planes. The text above is server-rendered; this island
 * only moves already-painted layers (transform/opacity) and is hidden < md.
 */
export function HeroComposition({ plates }: { plates: Plate[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const backY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -10]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -20]);
  const frontY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -32]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.02]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative hidden h-[460px] select-none md:block"
    >
      <m.div style={{ y: backY, scale }} className="absolute inset-0">
        <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_55%_40%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_66%)]" />
        <svg
          viewBox="0 0 240 300"
          className="absolute top-6 right-2 h-[380px] w-[300px] text-primary/10"
        >
          <path
            d="M120 292c-52-58-74-128-38-232 55 24 98 94 104 178-16 26-38 46-66 54Z"
            fill="currentColor"
          />
          <path
            d="M120 250c26-44 52-72 86-96"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </m.div>

      <m.div style={{ y: midY }} className="absolute inset-0">
        {plates.map((plate, index) => (
          <div
            key={plate.name}
            className={
              index === 0
                ? "absolute top-14 left-2 w-48 rotate-[-5deg] xl:w-56"
                : "absolute right-0 bottom-6 w-44 rotate-[6deg] xl:w-48"
            }
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
              <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-muted/40">
                <PlantImage
                  src={plate.imageUrl}
                  alt=""
                  fill
                  sizes="176px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        ))}
      </m.div>

      <m.div style={{ y: frontY }} className="absolute inset-0">
        <svg
          viewBox="0 0 160 200"
          className="leaf-drift absolute bottom-6 left-10 h-32 w-24 text-primary/70"
        >
          <path
            d="M80 194C34 154 20 96 50 36c42 18 74 70 78 128-18 16-34 26-48 30Z"
            fill="currentColor"
          />
          <path d="M80 180c14-38 30-66 48-88" stroke="var(--background)" strokeWidth="2.5" fill="none" />
        </svg>
        <span className="absolute top-8 right-8 inline-flex items-center gap-1.5 rounded-full bg-cta px-3 py-1.5 text-xs font-semibold text-cta-foreground shadow-sm">
          <span aria-hidden className="size-1.5 rounded-full bg-ink" />
          PlantHaat
        </span>
      </m.div>
    </div>
  );
}


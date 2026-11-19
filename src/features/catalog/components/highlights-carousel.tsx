"use client";

import type { EmblaCarouselType } from "embla-carousel";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { HighlightSlideView } from "@/features/catalog/components/highlight-slide-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { HomeHighlightSlide } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Small wrapper that keeps the first slide server-rendered and loads the
 * carousel engine only when the section is near the viewport. A single slide is
 * rendered by the server component without this file at all.
 */
export function HighlightsCarousel({
  slides,
  autoplay,
  intervalSeconds,
}: {
  slides: HomeHighlightSlide[];
  autoplay: boolean;
  intervalSeconds: number;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<{ play: () => void; stop: () => void; isPlaying: () => boolean } | null>(
    null,
  );
  const pausedRef = useRef(false);
  const emblaRef = useRef<EmblaCarouselType | null>(null);
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(
    () => new Set(slides[0] ? [slides[0].id] : []),
  );

  const autoplayActive = autoplay && !reduced;

  const loadSlide = useCallback((index: number) => {
    const slide = slides[index];
    if (!slide) return;
    setLoaded((current) => (current.has(slide.id) ? current : new Set(current).add(slide.id)));
  }, [slides]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    let cancelled = false;
    let embla: EmblaCarouselType | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void (async () => {
          const { default: EmblaCarousel } = await import("embla-carousel");
          if (cancelled) return;
          let plugins: unknown[] = [];
          if (autoplayActive && window.matchMedia("(min-width: 768px)").matches) {
            const { default: Autoplay } = await import("embla-carousel-autoplay");
            const plugin = Autoplay({
              delay: Math.max(4, intervalSeconds) * 1000,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
              stopOnFocusIn: true,
            });
            plugins = [plugin];
            autoplayRef.current = plugin as unknown as typeof autoplayRef.current;
          }
          embla = EmblaCarousel(
            track,
            { loop: slides.length > 1, align: "start" },
            plugins as never,
          );
          emblaRef.current = embla;
          const sync = () => {
            const index = embla?.selectedScrollSnap() ?? 0;
            setSelected(index);
            loadSlide(index);
          };
          sync();
          embla.on("select", sync);
          embla.on("reInit", sync);
          const onVisibility = () => {
            const plugin = autoplayRef.current;
            if (!plugin) return;
            if (document.visibilityState === "hidden") plugin.stop();
            else if (!pausedRef.current) plugin.play();
          };
          document.addEventListener("visibilitychange", onVisibility);
          setReady(true);
          if (!autoplayActive) autoplayRef.current = null;
        })().catch(() => {
          // Keep the static first slide when the carousel engine cannot load.
        });
      },
      { rootMargin: "300px" },
    );
    observer.observe(root);
    return () => {
      cancelled = true;
      observer.disconnect();
      embla?.destroy();
      emblaRef.current = null;
      autoplayRef.current = null;
    };
  }, [autoplayActive, intervalSeconds, loadSlide, reduced, slides.length]);

  const scrollTo = (index: number) => {
    loadSlide(index);
    emblaRef.current?.scrollTo(index);
  };

  const togglePause = () => {
    const plugin = autoplayRef.current;
    if (!plugin) return;
    if (paused || !plugin.isPlaying()) {
      plugin.play();
      setPaused(false);
    } else {
      plugin.stop();
      setPaused(true);
    }
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("bannerCarouselLabel")}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollTo(Math.max(0, selected - 1));
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollTo(Math.min(slides.length - 1, selected + 1));
        }
      }}
      data-home-highlights-carousel
      className="relative overflow-hidden rounded-2xl border border-border/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      onTouchStart={() => {
        if (!autoplayRef.current) return;
        autoplayRef.current.stop();
        setPaused(true);
      }}
    >
      <div ref={trackRef} className="flex touch-pan-y">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="min-w-0 shrink-0 basis-full"
            aria-hidden={index !== selected}
            inert={index !== selected}
          >
            <HighlightSlideView
              slide={slide}
              locale={locale}
              index={index + 1}
              total={slides.length}
              imageEnabled={loaded.has(slide.id)}
            />
          </div>
        ))}
      </div>

      {ready ? (
        <>
          <button
            type="button"
            onClick={() => scrollTo(Math.max(0, selected - 1))}
            aria-label={t("previousSlide")}
            className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:grid"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(slides.length - 1, selected + 1))}
            aria-label={t("nextSlide")}
            className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:grid"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>

          {autoplayActive ? (
            <button
              type="button"
              onClick={togglePause}
              aria-label={paused ? t("playBanner") : t("pauseBanner")}
              className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {paused ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
            </button>
          ) : null}

          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-0.5">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t("slideLabel", { index: index + 1, total: slides.length })}
                aria-current={index === selected}
                onClick={() => scrollTo(index)}
                className="grid size-11 place-items-center rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full transition-colors",
                    index === selected ? "bg-cta" : "bg-background/75",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {autoplayActive && !paused
          ? ""
          : t("slideLabel", { index: selected + 1, total: slides.length })}
      </p>
    </div>
  );
}

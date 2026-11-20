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
 *
 * Embla needs the ROOT (the overflow-hidden viewport) and measures
 * `root.children[0]` as its container. Passing the flex track made Embla see a
 * single slide, which also made the autoplay plugin disable itself.
 *
 * Autoplay is controlled here (not by the plugin's own hover/focus handlers) so
 * the visible pause button stays authoritative and the same rules apply at
 * every viewport: pause on hover/focus/touch, resume after leaving, restart
 * after a manual swipe, and stop while the tab is hidden.
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
  const emblaRef = useRef<EmblaCarouselType | null>(null);
  const slidesRef = useRef(slides);
  const manualPausedRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const interactingRef = useRef(false);
  const [selected, setSelected] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(
    () => new Set(slides[0] ? [slides[0].id] : []),
  );

  const autoplayActive = autoplay && !reduced;

  const loadSlide = useCallback((index: number) => {
    const slide = slidesRef.current[index];
    if (!slide) return;
    setLoaded((current) => (current.has(slide.id) ? current : new Set(current).add(slide.id)));
  }, []);

  const applyPlayback = useCallback(() => {
    const plugin = autoplayRef.current;
    if (!plugin) return;
    const shouldPlay =
      autoplayActive &&
      !manualPausedRef.current &&
      !hoveredRef.current &&
      !focusedRef.current &&
      !interactingRef.current &&
      document.visibilityState === "visible";
    if (shouldPlay && !plugin.isPlaying()) plugin.play();
    if (!shouldPlay && plugin.isPlaying()) plugin.stop();
  }, [autoplayActive]);
  const applyRef = useRef(applyPlayback);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    applyRef.current = applyPlayback;
  }, [applyPlayback]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    let cancelled = false;
    let embla: EmblaCarouselType | null = null;
    let removeWindowListeners = () => {};

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void (async () => {
          const { default: EmblaCarousel } = await import("embla-carousel");
          if (cancelled) return;
          let plugins: unknown[] = [];
          if (autoplayActive) {
            const { default: Autoplay } = await import("embla-carousel-autoplay");
            const plugin = Autoplay({
              delay: Math.max(4, intervalSeconds) * 1000,
              playOnInit: false,
              // The component owns pause/resume so a manual pause is never
              // overridden by the plugin's own mouse/focus helpers.
              stopOnInteraction: true,
              stopOnMouseEnter: false,
              stopOnFocusIn: false,
            });
            plugins = [plugin];
            autoplayRef.current = plugin as unknown as typeof autoplayRef.current;
          }
          // Root is the overflow-hidden viewport; its first child is the track.
          embla = EmblaCarousel(root, { loop: slidesRef.current.length > 1, align: "start" }, plugins as never);
          emblaRef.current = embla;
          const sync = () => {
            const index = embla?.selectedScrollSnap() ?? 0;
            setSelected(index);
            loadSlide(index);
          };
          sync();
          embla.on("select", sync);
          embla.on("reInit", sync);

          const apply = () => applyRef.current();
          const onVisibility = () => apply();
          const onPointerUp = () => {
            interactingRef.current = false;
            apply();
          };
          const onPointerLeave = () => {
            hoveredRef.current = false;
            apply();
          };
          const onPointerEnter = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            hoveredRef.current = true;
            apply();
          };
          const onPointerDown = () => {
            interactingRef.current = true;
            apply();
          };
          const onFocusIn = () => {
            // A pointer press focuses the tabbable root too; only keyboard
            // focus should pause autoplay, otherwise a manual swipe would keep
            // it stopped until the user clicks somewhere else.
            const active = document.activeElement;
            focusedRef.current = Boolean(
              active instanceof HTMLElement && active.matches(":focus-visible"),
            );
            apply();
          };
          const onFocusOut = (event: FocusEvent) => {
            const next = event.relatedTarget as Node | null;
            if (next && root.contains(next)) return;
            focusedRef.current = false;
            apply();
          };
          document.addEventListener("visibilitychange", onVisibility);
          root.addEventListener("pointerenter", onPointerEnter);
          root.addEventListener("pointerleave", onPointerLeave);
          root.addEventListener("pointerdown", onPointerDown);
          root.addEventListener("focusin", onFocusIn);
          root.addEventListener("focusout", onFocusOut);
          window.addEventListener("pointerup", onPointerUp);
          window.addEventListener("pointercancel", onPointerUp);
          removeWindowListeners = () => {
            document.removeEventListener("visibilitychange", onVisibility);
            root.removeEventListener("pointerenter", onPointerEnter);
            root.removeEventListener("pointerleave", onPointerLeave);
            root.removeEventListener("pointerdown", onPointerDown);
            root.removeEventListener("focusin", onFocusIn);
            root.removeEventListener("focusout", onFocusOut);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
          };

          setReady(true);
          apply();
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
      removeWindowListeners();
      embla?.destroy();
      emblaRef.current = null;
      autoplayRef.current = null;
      hoveredRef.current = false;
      focusedRef.current = false;
      interactingRef.current = false;
    };
  }, [autoplayActive, intervalSeconds, loadSlide]);

  const scrollTo = (index: number) => {
    loadSlide(index);
    emblaRef.current?.scrollTo(index);
  };

  const togglePause = () => {
    manualPausedRef.current = !manualPausedRef.current;
    setManualPaused(manualPausedRef.current);
    applyRef.current();
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
      data-autoplay={autoplayActive ? "on" : "off"}
      className="relative overflow-hidden rounded-2xl border border-border/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
              aria-label={manualPaused ? t("playBanner") : t("pauseBanner")}
              className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {manualPaused ? (
                <Play aria-hidden className="size-4" />
              ) : (
                <Pause aria-hidden className="size-4" />
              )}
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
        {autoplayActive && !manualPaused
          ? ""
          : t("slideLabel", { index: selected + 1, total: slides.length })}
      </p>
    </div>
  );
}

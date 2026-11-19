import { getImageProps } from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { splitPosition } from "@/features/catalog/highlights-position";
import type { HomeHighlightSlide } from "@/lib/api/types";
import cloudinaryLoader from "@/lib/images/cloudinary-loader";
import { cn } from "@/lib/utils";

const DEFAULT_TEXT = "#EFE7D2";

function positionClasses(position: string) {
  const { vertical, horizontal } = splitPosition(position);
  return cn(
    "flex",
    vertical === "top" ? "items-start" : vertical === "center" ? "items-center" : "items-end",
    horizontal === "left"
      ? "justify-start"
      : horizontal === "center"
        ? "justify-center"
        : "justify-end",
  );
}

function alignClass(align: string) {
  return align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
}

function safeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const value = href.trim();
  if (value === "" || value.startsWith("//")) return null;
  if (value.startsWith("/") || /^https:\/\/[^\s]+$/i.test(value)) return value;
  return null;
}

function isExternal(href: string) {
  return /^https:\/\//i.test(href);
}

function buttonClass(style: string) {
  switch (style) {
    case "secondary":
      return "bg-secondary text-secondary-foreground hover:bg-secondary/90";
    case "outline-light":
      return "border border-white/80 bg-black/10 text-white hover:bg-white/15";
    case "outline-dark":
      return "border border-foreground/40 bg-background/90 text-foreground hover:bg-background";
    case "custom":
      return "";
    default:
      return "bg-primary text-primary-foreground hover:bg-primary/90";
  }
}

function SlideImage({
  slide,
  variant,
  priority,
  enabled = true,
}: {
  slide: HomeHighlightSlide;
  variant?: "desktop" | "mobile";
  priority?: boolean;
  enabled?: boolean;
}) {
  if (!enabled) {
    return <div aria-hidden className="size-full bg-muted/40" />;
  }
  const desktopSrc = slide.image.url;
  const mobileSrc = slide.mobileImage?.url ?? slide.image.url;
  const common = {
    alt: "",
    sizes: "100vw",
    loader: cloudinaryLoader,
  };
  const desktop = getImageProps({
    ...common,
    src: desktopSrc,
    width: 1920,
    height: 640,
  }).props;
  const mobile = getImageProps({
    ...common,
    src: mobileSrc,
    width: 960,
    height: 640,
  }).props;
  const desktopPosition = `${slide.focal.x}% ${slide.focal.y}%`;
  const mobilePosition = `${slide.mobileFocal.x}% ${slide.mobileFocal.y}%`;
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? "high" : "low";

  if (variant === "desktop") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...desktop}
        alt=""
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        style={{ objectPosition: desktopPosition }}
        className="size-full object-cover"
      />
    );
  }
  if (variant === "mobile") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...mobile}
        alt=""
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        style={{ objectPosition: mobilePosition }}
        className="size-full object-cover"
      />
    );
  }

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes="100vw" />
      <img
        {...mobile}
        alt=""
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        style={{ objectPosition: mobilePosition }}
        className="size-full object-cover"
      />
    </picture>
  );
}

export function HighlightSlideView({
  slide,
  locale,
  index = 1,
  total = 1,
  preview = false,
  forceVariant,
  imageEnabled = true,
}: {
  slide: HomeHighlightSlide;
  locale: string;
  index?: number;
  total?: number;
  preview?: boolean;
  forceVariant?: "desktop" | "mobile";
  imageEnabled?: boolean;
}) {
  const alt = locale === "en" ? slide.alt.en || slide.alt.bn : slide.alt.bn || slide.alt.en;
  const headline =
    locale === "en" ? slide.overlay.headline.en : slide.overlay.headline.bn;
  const subtext = locale === "en" ? slide.overlay.subtext.en : slide.overlay.subtext.bn;
  const buttonLabel =
    locale === "en" ? slide.button?.label.en : slide.button?.label.bn;
  const href = safeHref(slide.button?.enabled ? slide.button.href : slide.link);
  const overlayPosition = forceVariant === "mobile" ? slide.overlay.position.mobile : slide.overlay.position.desktop;
  const overlayAlign = forceVariant === "mobile" ? slide.overlay.align.mobile : slide.overlay.align.desktop;
  const external = href ? isExternal(href) : false;

  const body: ReactNode = (
    <>
      <SlideImage
        slide={slide}
        variant={forceVariant}
        priority={index === 1 && preview}
        enabled={imageEnabled}
      />
      {slide.overlay.enabled ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundColor: slide.overlay.scrimColor,
              opacity: Math.min(100, Math.max(0, slide.overlay.scrimOpacity)) / 100,
            }}
          />
          <div className={cn("absolute inset-0 p-5 md:p-10", positionClasses(overlayPosition))}>
            <div className={cn("grid max-w-xl gap-2 md:gap-3", alignClass(overlayAlign))}>
              {headline ? (
                <p
                  className="font-heading text-2xl leading-snug font-bold md:text-4xl"
                  style={{ color: slide.overlay.textColor ?? DEFAULT_TEXT }}
                >
                  {headline}
                </p>
              ) : null}
              {subtext ? (
                <p
                  className="text-sm leading-relaxed md:text-base"
                  style={{ color: slide.overlay.textColor ?? DEFAULT_TEXT }}
                >
                  {subtext}
                </p>
              ) : null}
              {slide.button?.enabled && href && buttonLabel ? (
                preview ? (
                  <span
                    className={cn(
                      "mt-1 inline-flex min-h-11 w-fit items-center rounded-full px-5 text-sm font-semibold",
                      buttonClass(slide.button.style),
                    )}
                    style={
                      slide.button.style === "custom"
                        ? ({
                            backgroundColor: slide.button.backgroundColor ?? undefined,
                            color: slide.button.textColor ?? undefined,
                          } satisfies CSSProperties)
                        : undefined
                    }
                  >
                    {buttonLabel}
                  </span>
                ) : (
                  <Link
                    href={href}
                    target={external && slide.openInNewTab ? "_blank" : undefined}
                    rel={external && slide.openInNewTab ? "noopener noreferrer" : undefined}
                    className={cn(
                      "mt-1 inline-flex min-h-11 w-fit items-center rounded-full px-5 text-sm font-semibold focus-visible:ring-3 focus-visible:ring-cta/40 focus-visible:outline-none",
                      buttonClass(slide.button.style),
                    )}
                    style={
                      slide.button.style === "custom"
                        ? ({
                            backgroundColor: slide.button.backgroundColor ?? undefined,
                            color: slide.button.textColor ?? undefined,
                          } satisfies CSSProperties)
                        : undefined
                    }
                  >
                    {buttonLabel}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  const content =
    !preview && href && !slide.button?.enabled ? (
      <Link
        href={href}
        target={external && slide.openInNewTab ? "_blank" : undefined}
        rel={external && slide.openInNewTab ? "noopener noreferrer" : undefined}
        aria-label={alt || headline}
        className="absolute inset-0 block focus-visible:ring-3 focus-visible:ring-cta/40 focus-visible:outline-none"
      >
        {body}
      </Link>
    ) : (
      body
    );

  return (
    <div
      data-highlight-slide
      role={total > 1 ? "group" : undefined}
      aria-roledescription={total > 1 ? "slide" : undefined}
      aria-label={total > 1 ? `Slide ${index} of ${total}` : undefined}
      className={cn(
        "relative w-full overflow-hidden bg-muted/40",
        forceVariant === "mobile"
          ? "aspect-3/2"
          : forceVariant === "desktop"
            ? "aspect-3/1"
            : "aspect-3/2 md:aspect-3/1 md:max-h-[480px]",
      )}
    >
      {content}
    </div>
  );
}

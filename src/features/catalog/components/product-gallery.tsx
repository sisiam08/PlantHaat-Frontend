"use client";

import { ImageOff, ZoomIn } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "cn";

const ProductLightbox = dynamic(
  () => import("./product-lightbox").then((mod) => mod.ProductLightbox),
  { ssr: false },
);

interface GalleryImage {
  url: string;
  altText?: string | null;
}

export function ProductGallery({
  images,
  alt,
  label,
}: {
  images: GalleryImage[];
  alt: string;
  label: string;
}) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  const current = images[active] ?? images[0];
  const hasImages = images.length > 0;
  const slides = images.map((image) => ({ src: image.url, alt: image.altText ?? alt }));

  if (!hasImages) {
    return (
      <div
        className="grid aspect-square w-full place-items-center rounded-3xl border border-dashed border-border/60 bg-muted/40 text-muted-foreground"
        aria-label={label}
      >
        <ImageOff aria-hidden className="size-10" />
      </div>
    );
  }

  return (
    <div className="grid gap-3" aria-label={label}>
      {/* Desktop: thumbnail column + large image */}
      <div className="hidden gap-3 md:grid md:grid-cols-[auto_1fr]">
        {images.length > 1 ? (
          <div className="flex max-h-[520px] w-20 flex-col gap-2 overflow-y-auto pr-1">
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`${alt} ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border bg-muted/40 transition-colors",
                  index === active
                    ? "border-primary ring-2 ring-ring/40"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          onMouseEnter={() => finePointer && setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={(event) => {
            if (!finePointer) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setOrigin(
              `${((event.clientX - rect.left) / rect.width) * 100}% ${
                ((event.clientY - rect.top) / rect.height) * 100
              }%`,
            );
          }}
          aria-label={label}
          className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border border-border/60 bg-muted/40 ring-1 ring-border/40"
        >
          <Image
            src={current.url}
            alt={current.altText ?? alt}
            fill
            priority
            sizes="(max-width: 1024px) 50vw, 600px"
            style={{ transformOrigin: origin, transform: zoom ? "scale(2.2)" : "scale(1)" }}
            className="object-cover transition-transform duration-200 motion-reduce:transition-none"
          />
          <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-background/85 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn aria-hidden className="size-4" />
          </span>
        </button>
      </div>

      {/* Mobile: swipeable main image + thumbnail strip + dots */}
      <div className="md:hidden">
        <Carousel setApi={setMobileApi} opts={{ loop: false }} className="overflow-hidden">
          <CarouselContent className="ml-0">
            {images.map((image, index) => (
              <CarouselItem key={`${image.url}-${index}`} className="pl-0">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={label}
                  className="relative block aspect-square w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40 ring-1 ring-border/40"
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? alt}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {images.length > 1 ? (
          <>
            <div className="mt-2 flex justify-center gap-1.5">
              {images.map((image, index) => (
                <button
                  key={`dot-${image.url}-${index}`}
                  type="button"
                  aria-label={`${alt} ${index + 1}`}
                  aria-current={index === active}
                  onClick={() => mobileApi?.scrollTo(index)}
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    index === active ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={`thumb-${image.url}-${index}`}
                  type="button"
                  onClick={() => mobileApi?.scrollTo(index)}
                  aria-label={`${alt} ${index + 1}`}
                  aria-current={index === active}
                  className={cn(
                    "relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border bg-muted/40",
                    index === active ? "border-primary ring-2 ring-ring/40" : "border-border/60",
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {lightboxOpen ? (
        <ProductLightbox slides={slides} index={active} onClose={() => setLightboxOpen(false)} />
      ) : null}
    </div>
  );
}

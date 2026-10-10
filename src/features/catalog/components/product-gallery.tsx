"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "cn";

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
  const current = images[active] ?? images[0];

  return (
    <div className="grid gap-3" aria-label={label}>
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40 ring-1 ring-border/40">
        {current ? (
          <Image
            src={current.url}
            alt={current.altText ?? alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.slice(0, 10).map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${alt} ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border bg-muted/40 transition-colors",
                index === active
                  ? "border-primary ring-2 ring-ring/40"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <Image src={image.url} alt="" fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

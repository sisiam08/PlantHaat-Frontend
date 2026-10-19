"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import cloudinaryLoader, {
  cloudinaryBlur,
  isCloudinaryUrl,
  PLANT_PLACEHOLDER,
} from "@/lib/images/cloudinary-loader";

/** Neutral plant-green 1×1 blur used while non-Cloudinary images load. */
const FALLBACK_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export interface PlantImageProps
  extends Omit<
    ImageProps,
    "src" | "loader" | "placeholder" | "blurDataURL" | "onError"
  > {
  src?: string | null;
}

/**
 * The single product-image component: Cloudinary-aware loading/resizing, a
 * neutral plant placeholder while loading, on error, and when there is no image.
 * Callers own the fixed-aspect wrapper (`fill` + `sizes`), so there is no layout
 * shift. The placeholder is never zoomable (lightboxes only receive real URLs).
 */
export function PlantImage({ src, alt, className, ...props }: PlantImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = !src || failed ? PLANT_PLACEHOLDER : src;
  const usingPlaceholder = resolved === PLANT_PLACEHOLDER;
  const blur =
    !usingPlaceholder && isCloudinaryUrl(resolved) ? cloudinaryBlur(resolved) : FALLBACK_BLUR;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      loader={cloudinaryLoader}
      className={cn("object-cover", className)}
      placeholder="blur"
      blurDataURL={blur ?? FALLBACK_BLUR}
      unoptimized={usingPlaceholder ? true : undefined}
      onError={() => setFailed(true)}
    />
  );
}

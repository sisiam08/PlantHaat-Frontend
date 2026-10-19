export const PLANT_PLACEHOLDER = "/placeholders/plant-placeholder.webp";

const CLOUDINARY_HOST = "res.cloudinary.com";

export function isCloudinaryUrl(src: string | null | undefined): boolean {
  return Boolean(src && src.includes(CLOUDINARY_HOST) && src.includes("/upload/"));
}

/** Inserts a transformation segment right after `/upload/`. */
export function cloudinaryTransform(src: string, transform: string): string {
  return src.replace(/\/upload\//, `/upload/${transform}/`);
}

/** Resized/format-negotiated delivery URL (`f_auto,q_auto,c_limit,w_<width>`). */
export function cloudinaryUrl(src: string, width: number, quality: string | number = "auto"): string {
  if (!isCloudinaryUrl(src)) {
    return src;
  }
  return cloudinaryTransform(
    src,
    `f_auto,q_${quality},c_limit,w_${Math.max(1, Math.round(width))}`,
  );
}

/** Tiny blurred preview used while the real image loads. */
export function cloudinaryBlur(src: string): string | undefined {
  if (!isCloudinaryUrl(src)) {
    return undefined;
  }
  return cloudinaryTransform(src, "e_blur:1000,q_1,w_20");
}

/**
 * Next image loader: Cloudinary resizes/negotiates the format (so Next never
 * optimizes a Cloudinary asset twice); every other URL falls back to the
 * default `/_next/image` optimizer (local dev, seed assets).
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (isCloudinaryUrl(src)) {
    return cloudinaryUrl(src, width, quality ? String(quality) : "auto");
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}

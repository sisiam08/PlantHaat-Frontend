import "server-only";

import { createHash } from "node:crypto";

/**
 * The owner's category seed images are 11 byte-identical copies of one
 * placeholder illustration. In development we detect that exact file and show
 * the calm icon fallback instead, so the layout can be judged before real
 * photos exist. Production never skips an uploaded image.
 */
const SEED_PLACEHOLDER_SHA256 =
  "e1fb4cb6072a7044352e2bcb1b9ea6842a21ecd1abe5edf0b139ffeac9a601ac";

const cache = new Map<string, boolean>();

async function isSeedPlaceholderImage(url: string): Promise<boolean> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    const placeholder = hash === SEED_PLACEHOLDER_SHA256;
    cache.set(url, placeholder);
    return placeholder;
  } catch {
    return false;
  }
}

export async function getPlaceholderCategoryImageUrls(
  categories: readonly { imageUrl: string | null }[],
): Promise<Set<string>> {
  if (process.env.NODE_ENV === "production") return new Set();

  const urls = [
    ...new Set(
      categories
        .map((category) => category.imageUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  ];
  const results = await Promise.all(
    urls.map(async (url) => [url, await isSeedPlaceholderImage(url)] as const),
  );
  return new Set(results.filter(([, placeholder]) => placeholder).map(([url]) => url));
}

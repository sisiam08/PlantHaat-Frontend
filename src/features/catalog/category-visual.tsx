import {
  Cherry,
  Flower2,
  Grid2x2,
  House,
  Layers,
  Leaf,
  PlantPot,
  Shovel,
  Sprout,
  Sun,
  TreeDeciduous,
  Trees,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stable, slug-based visual identity for category tiles when a real uploaded
 * image is absent (or, in development only, still the shared seed placeholder).
 * Real images always take precedence.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "indoor-plants": House,
  "outdoor-plants": Trees,
  "flowering-plants": Flower2,
  "fruit-plants": Cherry,
  "herbs-medicinal": Leaf,
  "succulents-cactus": Sun,
  bonsai: TreeDeciduous,
  seeds: Sprout,
  "pots-planters": PlantPot,
  "soil-fertilizer": Layers,
  "gardening-tools": Shovel,
};

const SURFACES = ["bg-secondary/70", "bg-muted", "bg-primary/10"] as const;

export function categorySurfaceClass(slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash + slug.charCodeAt(index) * 17) % SURFACES.length;
  }
  return SURFACES[hash] ?? SURFACES[0];
}

export function CategoryGlyph({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Leaf;
  return <Icon aria-hidden className={cn("text-primary", className)} strokeWidth={1.5} />;
}

export function AllCategoriesGlyph({ className }: { className?: string }) {
  return <Grid2x2 aria-hidden className={cn("text-primary", className)} strokeWidth={1.5} />;
}

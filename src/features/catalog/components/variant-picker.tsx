"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatBdt } from "@/lib/format/money";

export interface VariantView {
  id: string;
  name: string;
  price: string;
  stockQty: number;
  sizeLabel?: string | null;
}

export function VariantPicker({ variants, locale }: { variants: VariantView[]; locale: string }) {
  const t = useTranslations("product");
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  if (!selected) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            type="button"
            size="sm"
            variant={variant.id === selected.id ? "default" : "outline"}
            aria-pressed={variant.id === selected.id}
            onClick={() => setSelectedId(variant.id)}
          >
            {variant.sizeLabel || variant.name}
          </Button>
        ))}
      </div>
      <p className="text-3xl font-bold text-primary">{formatBdt(selected.price, locale)}</p>
      <p className="text-sm text-muted-foreground">
        {selected.stockQty > 0 ? t("inStock", { count: selected.stockQty }) : t("outOfStock")}
      </p>
      <Button variant="cta" size="lg" disabled title={t("comingSoon")}>
        {t("addToCart")}
      </Button>
    </div>
  );
}

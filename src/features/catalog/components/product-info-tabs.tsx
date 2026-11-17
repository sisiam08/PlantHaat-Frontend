"use client";

import { Droplets, Gauge, Home, PawPrint, Ruler, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewsList } from "@/features/reviews/components/reviews-list";

export interface CareItem {
  key: "light" | "watering" | "difficulty" | "indoor" | "petSafe" | "height";
  label: string;
  value: string;
}

const CARE_ICONS: Record<CareItem["key"], LucideIcon> = {
  light: Sun,
  watering: Droplets,
  difficulty: Gauge,
  indoor: Home,
  petSafe: PawPrint,
  height: Ruler,
};

function CareGrid({ items }: { items: CareItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = CARE_ICONS[item.key];
        return (
          <div
            key={item.key}
            className="grid gap-1 rounded-xl border border-border/60 bg-card p-3 shadow-[var(--shadow-soft)]"
          >
            <Icon aria-hidden className="size-4 text-primary" />
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function CarePanel({ items, instructions }: { items: CareItem[]; instructions?: string | null }) {
  const t = useTranslations("product");
  return (
    <div className="grid gap-3">
      <CareGrid items={items} />
      {instructions ? (
        <div className="grid gap-1.5 rounded-xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-medium">{t("careInstructions")}</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {instructions}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ProductInfoTabs({
  slug,
  description,
  careItems,
  instructions,
  delivery,
  returns,
}: {
  slug: string;
  description: string;
  careItems: CareItem[];
  instructions?: string | null;
  delivery: React.ReactNode;
  returns: React.ReactNode;
}) {
  const t = useTranslations("product");
  const tabs = [
    { value: "description", label: t("description") },
    { value: "care", label: t("careTitle") },
    { value: "delivery", label: t("deliveryTab") },
    { value: "reviews", label: t("reviews") },
  ];

  return (
    <>
      {/* Desktop: tabs */}
      <div className="hidden md:block">
        <Tabs defaultValue="description">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="description" className="pt-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {description}
            </p>
          </TabsContent>
          <TabsContent value="care" className="pt-4">
            <CarePanel items={careItems} instructions={instructions} />
          </TabsContent>
          <TabsContent value="delivery" className="pt-4">
            <div className="grid gap-6">
              {delivery}
              {returns}
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="pt-4">
            <ReviewsList slug={slug} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: accordion */}
      <div className="md:hidden">
        <Accordion type="single" collapsible defaultValue="description">
          <AccordionItem value="description">
            <AccordionTrigger>{t("description")}</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {description}
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="care">
            <AccordionTrigger>{t("careTitle")}</AccordionTrigger>
            <AccordionContent>
              <CarePanel items={careItems} instructions={instructions} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="delivery">
            <AccordionTrigger>{t("deliveryTab")}</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6">
                {delivery}
                {returns}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="reviews">
            <AccordionTrigger>{t("reviews")}</AccordionTrigger>
            <AccordionContent>
              <ReviewsList slug={slug} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}

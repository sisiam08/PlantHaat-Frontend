"use client";

import {
  ChevronDown,
  Droplets,
  Gauge,
  Home,
  Info,
  Package,
  PawPrint,
  Ruler,
  Store,
  Sun,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";

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

const SECTIONS = [
  { id: "overview", label: "overview", icon: Info },
  { id: "care", label: "care", icon: Droplets },
  { id: "delivery", label: "delivery", icon: Truck },
  { id: "reviews", label: "reviews", icon: Store },
  { id: "qa", label: "qa", icon: Package },
] as const;

function CollapsibleText({ text }: { text: string }) {
  const t = useTranslations("content");
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 280;
  return (
    <div className="grid gap-2">
      <p
        className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap text-foreground",
          !expanded && long && "line-clamp-5",
        )}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? t("readLess") : t("readMore")}
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      ) : null}
    </div>
  );
}

function SectionCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden className="size-5" />
        </span>
        <h2 id={`${id}-title`} className="font-heading text-lg font-semibold sm:text-xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function ProductInfoSections({
  description,
  careItems,
  instructions,
  delivery,
  returns,
  seller,
}: {
  description: string;
  careItems: CareItem[];
  instructions?: string | null;
  delivery: React.ReactNode;
  returns: React.ReactNode;
  seller: React.ReactNode;
}) {
  const t = useTranslations("content");
  const tProduct = useTranslations("product");
  const [active, setActive] = useState<string>("overview");
  const navRef = useRef<HTMLDivElement | null>(null);

  // Scroll-spy over the actual rendered sections (including Reviews/Q&A).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div className="grid min-w-0 gap-4 overflow-x-clip">
      <div className="sticky top-[var(--header-h)] z-30 -mx-4 min-w-0 border-y border-border/60 bg-background/90 px-4 py-2 backdrop-blur-md ">
        <div
          ref={navRef}
          role="navigation"
          aria-label={t("sectionNav")}
          className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              aria-current={active === section.id ? "true" : undefined}
              onClick={() => go(section.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active === section.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
              )}
            >
              {t(`nav.${section.label}`)}
            </button>
          ))}
        </div>
      </div>

      <SectionCard id="overview" icon={Info} title={t("description")}>
        <CollapsibleText text={description} />
      </SectionCard>

      <SectionCard id="care" icon={Droplets} title={tProduct("careTitle")}>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {careItems.map((item) => {
              const Icon = CARE_ICONS[item.key];
              return (
                <div
                  key={item.key}
                  className="grid gap-1 rounded-2xl border border-border/60 bg-secondary/30 p-3"
                >
                  <Icon aria-hidden className="size-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              );
            })}
          </div>
          {instructions ? (
            <div className="grid gap-1.5 rounded-2xl border border-border/60 p-4">
              <p className="text-sm font-medium">{tProduct("careInstructions")}</p>
              <CollapsibleText text={instructions} />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard id="delivery" icon={Truck} title={t("deliveryTitle")}>
        <div className="grid gap-5">
          {delivery}
          {returns}
        </div>
      </SectionCard>

      <SectionCard id="seller" icon={Store} title={t("sellerTitle")}>
        {seller}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        <Badge variant="secondary" className="rounded-full">
          {t("secure")}
        </Badge>
        <span>{t("secureNote")}</span>
        <Link href="/policies/delivery" className="font-medium text-primary hover:underline">
          {t("policy")}
        </Link>
      </div>
    </div>
  );
}


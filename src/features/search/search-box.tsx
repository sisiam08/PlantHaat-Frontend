"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Command } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "cn";

// The suggestion list (fetch logic + rendering) loads on first focus only.
const SearchSuggestPanel = dynamic(() => import("./search-suggest-panel"), {
  ssr: false,
  loading: () => null,
});

interface SearchBoxProps {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}

/** Header search combobox: input + anchored panel, keyboard-navigable via cmdk. */
export function SearchBox({ className, autoFocus = false, onNavigate }: SearchBoxProps) {
  const t = useTranslations("search");
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Native listeners bound to the real <input> (cmdk's Input swallows React
  // onFocus/onBlur props and does not forward a ref), so focus opens the panel
  // and Escape closes it.
  useEffect(() => {
    const container = containerRef.current;
    const input = container?.querySelector("input");
    if (!container || !input) return;
    const onFocus = () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      setArmed(true);
      setOpen(true);
    };
    const onBlur = () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => setOpen(false), 150);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    container.addEventListener("keydown", onKeyDown);
    if (document.activeElement === input) onFocus();
    return () => {
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", onBlur);
      container.removeEventListener("keydown", onKeyDown);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  // cmdk hard-codes aria-expanded="true" and points aria-controls at a list
  // that only exists while the panel is open. Keep the combobox honest (and
  // axe-clean) by syncing those two attributes with the real open state.
  useEffect(() => {
    const input = containerRef.current?.querySelector("input");
    if (!input) return;
    const listId = input.getAttribute("aria-controls");
    const sync = () => {
      if (open) {
        if (input.getAttribute("aria-expanded") !== "true") {
          input.setAttribute("aria-expanded", "true");
        }
        if (listId && input.getAttribute("aria-controls") !== listId) {
          input.setAttribute("aria-controls", listId);
        }
      } else {
        if (input.getAttribute("aria-expanded") !== "false") {
          input.setAttribute("aria-expanded", "false");
        }
        if (input.hasAttribute("aria-controls")) {
          input.removeAttribute("aria-controls");
        }
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(input, {
      attributes: true,
      attributeFilter: ["aria-expanded", "aria-controls"],
    });
    return () => observer.disconnect();
  }, [open]);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <Command shouldFilter={false} loop className="contents">
      <div
        ref={containerRef}
        data-search-box={armed ? (open ? "armed-open" : "armed") : "idle"}
        className={cn("relative", className)}
        onPointerDown={() => {
          setArmed(true);
          setOpen(true);
        }}
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <CommandPrimitive.Input
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setArmed(true);
            setOpen(true);
          }}
          autoFocus={autoFocus}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          className="h-11 w-full rounded-full border border-border/60 bg-muted/50 pr-4 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {armed && open ? (
          <div
            data-search-panel
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-lg"
            onPointerDown={(event) => event.preventDefault()}
          >
            <SearchSuggestPanel query={query} onPickQuery={setQuery} onNavigate={close} />
          </div>
        ) : null}
      </div>
    </Command>
  );
}

/** Mobile: a full-screen search overlay via the header icon (or a field trigger). */
export function MobileSearch({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon-lg" aria-label={t("open")} className={className}>
            <Search aria-hidden />
          </Button>
        ) : (
          <button
            type="button"
            aria-label={t("open")}
            className={cn(
              "relative flex h-11 w-full items-center rounded-full border border-border/60 bg-muted/50 pr-4 pl-10 text-left text-sm text-muted-foreground",
              className,
            )}
          >
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
            />
            {t("placeholder")}
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-3 rounded-none p-3 sm:max-w-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("open")}</DialogTitle>
        </DialogHeader>
        <div className="pt-8">
          <SearchBox className="w-full" autoFocus onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}


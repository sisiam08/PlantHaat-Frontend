"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export interface AnimatedTab {
  value: string;
  label: string;
  badge?: ReactNode;
  content: ReactNode;
}

interface Indicator {
  left: number;
  width: number;
}

/**
 * ARIA tabs with a sliding indicator, lazy-mounted panels (kept after first
 * visit), URL-synced state and a scrollable mobile strip. Motion is
 * transform/opacity only and is disabled under prefers-reduced-motion.
 */
export function AnimatedTabs({
  tabs,
  label,
  defaultValue,
  urlParam,
  className,
  panelClassName,
}: {
  tabs: AnimatedTab[];
  label: string;
  defaultValue?: string;
  /** Query parameter kept in sync (history.replaceState, no navigation). */
  urlParam?: string;
  className?: string;
  panelClassName?: string;
}) {
  const initial = defaultValue ?? tabs[0]?.value ?? "";
  const [localValue, setLocalValue] = useState(initial);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([initial]));
  const [indicator, setIndicator] = useState<Indicator>({ left: 0, width: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const listeners = useRef(new Set<() => void>());

  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.current.add(onStoreChange);
    const onPop = () => onStoreChange();
    window.addEventListener("popstate", onPop);
    return () => {
      listeners.current.delete(onStoreChange);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    if (!urlParam || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get(urlParam);
  }, [urlParam]);

  const getServerSnapshot = useCallback(() => null, []);
  const urlValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value =
    urlParam && urlValue && tabs.some((tab) => tab.value === urlValue)
      ? urlValue
      : localValue;
  const visible = new Set(visited);
  if (urlValue) visible.add(urlValue);

  const measure = useCallback(() => {
    const list = listRef.current;
    const trigger = triggerRefs.current.get(value);
    if (!list || !trigger) return;
    const next = { left: trigger.offsetLeft, width: trigger.offsetWidth };
    setIndicator((current) =>
      current.left === next.left && current.width === next.width ? current : next,
    );
  }, [value]);

  useEffect(() => {
    const frame = requestAnimationFrame(measure);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && listRef.current) {
      observer = new ResizeObserver(() => requestAnimationFrame(measure));
      observer.observe(listRef.current);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [measure]);

  function change(next: string) {
    setLocalValue(next);
    setVisited((current) => (current.has(next) ? current : new Set(current).add(next)));
    if (urlParam && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get(urlParam) !== next) {
        url.searchParams.set(urlParam, next);
        window.history.replaceState(window.history.state, "", url.toString());
      }
      listeners.current.forEach((listener) => listener());
    }
    requestAnimationFrame(() => {
      const trigger = triggerRefs.current.get(next);
      if (trigger && typeof trigger.scrollIntoView === "function") {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        trigger.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: reduce ? "auto" : "smooth",
        });
      }
    });
  }

  return (
    <TabsPrimitive.Root value={value} onValueChange={change} className={cn("grid grid-cols-1 min-w-0 gap-4", className)}>
      <div className="relative min-w-0">
        <TabsPrimitive.List
          ref={listRef}
          aria-label={label}
          className="relative flex w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] sm:[mask-image:none]"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-0 rounded-lg bg-background shadow-sm transition-transform duration-200 ease-out [will-change:transform] motion-reduce:transition-none"
            style={{
              width: 1,
              transform: `translateX(${indicator.left}px) scaleX(${indicator.width})`,
              transformOrigin: "left",
            }}
          />
          {tabs.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              ref={(node) => {
                if (node) triggerRefs.current.set(tab.value, node);
                else triggerRefs.current.delete(tab.value);
              }}
              className="relative z-10 inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=active]:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {tab.label}
              {tab.badge ? <span className="shrink-0">{tab.badge}</span> : null}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </div>

      {tabs.map((tab) =>
        visible.has(tab.value) ? (
          <TabsPrimitive.Content
            key={tab.value}
            value={tab.value}
            forceMount
            className={cn(
              "outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200 motion-reduce:animate-none",
              panelClassName,
            )}
          >
            {tab.content}
          </TabsPrimitive.Content>
        ) : null,
      )}
    </TabsPrimitive.Root>
  );
}

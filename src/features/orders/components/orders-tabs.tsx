"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { AnimatedTabs } from "@/components/dashboard/animated-tabs";
import { queryKeys } from "@/lib/api/query-keys";
import { formatCount } from "@/lib/format/number";
import { ordersApi } from "../api";
import { OrdersList } from "./orders-list";

/**
 * Customer order lifecycle, in the same order as computeOverallStatus. The
 * default is Completed because delivered orders are the stable, finished view;
 * All orders remains one tab away.
 */
export function OrdersTabs() {
  const t = useTranslations("orders");
  const locale = useLocale();
  const counts = useQuery({
    queryKey: queryKeys.orderCounts,
    queryFn: ordersApi.statusCounts,
    staleTime: 30_000,
  });
  const badge = (value: string) => {
    const count = value === "ALL" ? counts.data?.all : counts.data?.counts?.[value];
    if (count === undefined || (value !== "ALL" && count === 0)) return undefined;
    return (
      <span
        data-order-count
        className="min-w-5 rounded-full bg-secondary px-1.5 py-0.5 text-center text-[0.7rem] leading-none font-semibold text-secondary-foreground tabular-nums"
      >
        {formatCount(count, locale)}
      </span>
    );
  };

  const tabs = [
    {
      value: "DELIVERED",
      label: t("tabs.completed"),
      badge: badge("DELIVERED"),
      content: (
        <OrdersList
          overallStatus="DELIVERED"
          emptyTitle={t("emptyStates.completed.title")}
          emptyDescription={t("emptyStates.completed.description")}
        />
      ),
    },
    {
      value: "ALL",
      label: t("tabs.all"),
      badge: badge("ALL"),
      content: (
        <OrdersList
          emptyTitle={t("emptyStates.all.title")}
          emptyDescription={t("emptyStates.all.description")}
        />
      ),
    },
    {
      value: "PENDING",
      label: t("tabs.pending"),
      badge: badge("PENDING"),
      content: (
        <OrdersList
          overallStatus="PENDING"
          emptyTitle={t("emptyStates.pending.title")}
          emptyDescription={t("emptyStates.pending.description")}
        />
      ),
    },
    {
      value: "CONFIRMED",
      label: t("tabs.confirmed"),
      badge: badge("CONFIRMED"),
      content: (
        <OrdersList
          overallStatus="CONFIRMED"
          emptyTitle={t("emptyStates.confirmed.title")}
          emptyDescription={t("emptyStates.confirmed.description")}
        />
      ),
    },
    {
      value: "PACKED",
      label: t("tabs.packed"),
      badge: badge("PACKED"),
      content: (
        <OrdersList
          overallStatus="PACKED"
          emptyTitle={t("emptyStates.packed.title")}
          emptyDescription={t("emptyStates.packed.description")}
        />
      ),
    },
    {
      value: "SHIPPED",
      label: t("tabs.shipped"),
      badge: badge("SHIPPED"),
      content: (
        <OrdersList
          overallStatus="SHIPPED"
          emptyTitle={t("emptyStates.shipped.title")}
          emptyDescription={t("emptyStates.shipped.description")}
        />
      ),
    },
    {
      value: "CANCELLED",
      label: t("tabs.cancelled"),
      badge: badge("CANCELLED"),
      content: (
        <OrdersList
          overallStatus="CANCELLED"
          emptyTitle={t("emptyStates.cancelled.title")}
          emptyDescription={t("emptyStates.cancelled.description")}
        />
      ),
    },
    {
      value: "PARTIAL",
      label: t("tabs.partial"),
      badge: badge("PARTIAL"),
      content: (
        <OrdersList
          overallStatus="PARTIAL"
          emptyTitle={t("emptyStates.partial.title")}
          emptyDescription={t("emptyStates.partial.description")}
        />
      ),
    },
    {
      value: "FAILED_DELIVERY",
      label: t("tabs.failed"),
      badge: badge("FAILED_DELIVERY"),
      content: (
        <OrdersList
          overallStatus="FAILED_DELIVERY"
          emptyTitle={t("emptyStates.failed.title")}
          emptyDescription={t("emptyStates.failed.description")}
        />
      ),
    },
  ];

  return (
    <AnimatedTabs
      label={t("tabs.label")}
      defaultValue="DELIVERED"
      urlParam="status"
      tabs={tabs}
    />
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { HighlightSlideView } from "@/features/catalog/components/highlight-slide-view";
import { uploadsApi } from "@/features/uploads/api";
import type { HomeHighlightSlide } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/query-keys";
import { buttonContrast, isHexColor, overlayContrast } from "@/lib/color-contrast";
import { adminApi } from "../api";
import type { AdminCategory, AdminHighlight, AdminHighlightInput } from "../types";

const PLACEMENT = "HOME_HIGHLIGHTS";
const POSITIONS = [
  "TOP_LEFT",
  "TOP_CENTER",
  "TOP_RIGHT",
  "CENTER_LEFT",
  "CENTER",
  "CENTER_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_CENTER",
  "BOTTOM_RIGHT",
] as const;
const ALIGNS = ["left", "center", "right"] as const;
const BUTTON_STYLES = ["primary", "secondary", "outline-light", "outline-dark", "custom"] as const;
const COLOR_PRESETS = ["#EFE7D2", "#FFFFFF", "#0B2116", "#2E4B2B", "#F0A63C", "#B8502A"];
const SCRIM_PRESETS = ["#0B2116", "#2E4B2B", "#000000", "#7A5200"];

interface Draft {
  title: string;
  imageUrl: string;
  imagePublicId: string;
  imageWidth: string;
  imageHeight: string;
  mobileImageUrl: string;
  mobileImagePublicId: string;
  mobileImageWidth: string;
  mobileImageHeight: string;
  imageAltBn: string;
  imageAltEn: string;
  linkUrl: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  focalX: number;
  focalY: number;
  mobileFocalX: number;
  mobileFocalY: number;
  overlayEnabled: boolean;
  headlineBn: string;
  headlineEn: string;
  subtextBn: string;
  subtextEn: string;
  textColor: string;
  scrimColor: string;
  scrimOpacity: number;
  desktopPosition: string;
  mobilePosition: string;
  desktopAlign: string;
  mobileAlign: string;
  buttonEnabled: boolean;
  buttonLabelBn: string;
  buttonLabelEn: string;
  buttonHref: string;
  buttonStyle: string;
  buttonBgColor: string;
  buttonTextColor: string;
  openInNewTab: boolean;
}

const EMPTY: Draft = {
  title: "",
  imageUrl: "",
  imagePublicId: "",
  imageWidth: "",
  imageHeight: "",
  mobileImageUrl: "",
  mobileImagePublicId: "",
  mobileImageWidth: "",
  mobileImageHeight: "",
  imageAltBn: "",
  imageAltEn: "",
  linkUrl: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  focalX: 50,
  focalY: 50,
  mobileFocalX: 50,
  mobileFocalY: 50,
  overlayEnabled: true,
  headlineBn: "",
  headlineEn: "",
  subtextBn: "",
  subtextEn: "",
  textColor: "#EFE7D2",
  scrimColor: "#0B2116",
  scrimOpacity: 45,
  desktopPosition: "BOTTOM_LEFT",
  mobilePosition: "BOTTOM_LEFT",
  desktopAlign: "left",
  mobileAlign: "left",
  buttonEnabled: true,
  buttonLabelBn: "",
  buttonLabelEn: "",
  buttonHref: "",
  buttonStyle: "primary",
  buttonBgColor: "#2E4B2B",
  buttonTextColor: "#FFFFFF",
  openInNewTab: false,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function draftFrom(row: AdminHighlight): Draft {
  return {
    title: row.title ?? "",
    imageUrl: row.imageUrl,
    imagePublicId: row.imagePublicId ?? "",
    imageWidth: row.imageWidth ? String(row.imageWidth) : "",
    imageHeight: row.imageHeight ? String(row.imageHeight) : "",
    mobileImageUrl: row.mobileImageUrl ?? "",
    mobileImagePublicId: row.mobileImagePublicId ?? "",
    mobileImageWidth: row.mobileImageWidth ? String(row.mobileImageWidth) : "",
    mobileImageHeight: row.mobileImageHeight ? String(row.mobileImageHeight) : "",
    imageAltBn: row.imageAltBn ?? "",
    imageAltEn: row.imageAltEn ?? "",
    linkUrl: row.linkUrl ?? "",
    isActive: row.isActive,
    startsAt: toLocalInput(row.startsAt),
    endsAt: toLocalInput(row.endsAt),
    focalX: row.focalX,
    focalY: row.focalY,
    mobileFocalX: row.mobileFocalX,
    mobileFocalY: row.mobileFocalY,
    overlayEnabled: row.overlayEnabled,
    headlineBn: row.headlineBn ?? "",
    headlineEn: row.headlineEn ?? "",
    subtextBn: row.subtextBn ?? "",
    subtextEn: row.subtextEn ?? "",
    textColor: row.textColor ?? "#EFE7D2",
    scrimColor: row.scrimColor ?? "#0B2116",
    scrimOpacity: row.scrimOpacity,
    desktopPosition: row.desktopPosition ?? "BOTTOM_LEFT",
    mobilePosition: row.mobilePosition ?? "BOTTOM_LEFT",
    desktopAlign: row.desktopAlign ?? "left",
    mobileAlign: row.mobileAlign ?? "left",
    buttonEnabled: row.buttonEnabled,
    buttonLabelBn: row.buttonLabelBn ?? "",
    buttonLabelEn: row.buttonLabelEn ?? "",
    buttonHref: row.buttonHref ?? "",
    buttonStyle: row.buttonStyle ?? "primary",
    buttonBgColor: row.buttonBgColor ?? "#2E4B2B",
    buttonTextColor: row.buttonTextColor ?? "#FFFFFF",
    openInNewTab: row.openInNewTab,
  };
}

function toInput(draft: Draft): AdminHighlightInput {
  return {
    title: draft.title.trim() || undefined,
    imageUrl: draft.imageUrl,
    imagePublicId: draft.imagePublicId || undefined,
    imageWidth: draft.imageWidth ? Number(draft.imageWidth) : undefined,
    imageHeight: draft.imageHeight ? Number(draft.imageHeight) : undefined,
    mobileImageUrl: draft.mobileImageUrl || null,
    mobileImagePublicId: draft.mobileImagePublicId || null,
    mobileImageWidth: draft.mobileImageWidth ? Number(draft.mobileImageWidth) : null,
    mobileImageHeight: draft.mobileImageHeight ? Number(draft.mobileImageHeight) : null,
    imageAltBn: draft.imageAltBn,
    imageAltEn: draft.imageAltEn,
    linkUrl: draft.linkUrl || null,
    isActive: draft.isActive,
    startsAt: fromLocalInput(draft.startsAt) || null,
    endsAt: fromLocalInput(draft.endsAt) || null,
    focalX: draft.focalX,
    focalY: draft.focalY,
    mobileFocalX: draft.mobileFocalX,
    mobileFocalY: draft.mobileFocalY,
    overlayEnabled: draft.overlayEnabled,
    headlineBn: draft.headlineBn,
    headlineEn: draft.headlineEn,
    subtextBn: draft.subtextBn,
    subtextEn: draft.subtextEn,
    textColor: draft.textColor || null,
    scrimColor: draft.scrimColor || null,
    scrimOpacity: draft.scrimOpacity,
    desktopPosition: draft.desktopPosition,
    mobilePosition: draft.mobilePosition,
    desktopAlign: draft.desktopAlign,
    mobileAlign: draft.mobileAlign,
    buttonEnabled: draft.buttonEnabled,
    buttonLabelBn: draft.buttonLabelBn,
    buttonLabelEn: draft.buttonLabelEn,
    buttonHref: draft.buttonHref || null,
    buttonStyle: draft.buttonStyle,
    buttonBgColor: draft.buttonStyle === "custom" ? draft.buttonBgColor : null,
    buttonTextColor: draft.buttonStyle === "custom" ? draft.buttonTextColor : null,
    openInNewTab: draft.openInNewTab,
  };
}

function previewSlide(draft: Draft): HomeHighlightSlide {
  return {
    id: "preview",
    sortOrder: 0,
    image: {
      url: draft.imageUrl || "/placeholders/plant-placeholder.webp",
      width: draft.imageWidth ? Number(draft.imageWidth) : null,
      height: draft.imageHeight ? Number(draft.imageHeight) : null,
    },
    mobileImage: draft.mobileImageUrl
      ? {
          url: draft.mobileImageUrl,
          width: draft.mobileImageWidth ? Number(draft.mobileImageWidth) : null,
          height: draft.mobileImageHeight ? Number(draft.mobileImageHeight) : null,
        }
      : null,
    alt: { bn: draft.imageAltBn, en: draft.imageAltEn },
    focal: { x: draft.focalX, y: draft.focalY },
    mobileFocal: { x: draft.mobileFocalX, y: draft.mobileFocalY },
    overlay: {
      enabled: draft.overlayEnabled,
      headline: { bn: draft.headlineBn, en: draft.headlineEn },
      subtext: { bn: draft.subtextBn, en: draft.subtextEn },
      textColor: draft.textColor || null,
      scrimColor: draft.scrimColor || "#0B2116",
      scrimOpacity: draft.scrimOpacity,
      position: { desktop: draft.desktopPosition, mobile: draft.mobilePosition },
      align: { desktop: draft.desktopAlign, mobile: draft.mobileAlign },
    },
    button: draft.buttonEnabled
      ? {
          enabled: true,
          label: { bn: draft.buttonLabelBn, en: draft.buttonLabelEn },
          href: draft.buttonHref || null,
          style: draft.buttonStyle,
          backgroundColor: draft.buttonStyle === "custom" ? draft.buttonBgColor : null,
          textColor: draft.buttonStyle === "custom" ? draft.buttonTextColor : null,
        }
      : null,
    link: draft.linkUrl || null,
    openInNewTab: draft.openInNewTab,
  };
}

function statusOf(row: AdminHighlight, now = Date.now()) {
  if (!row.isActive) return "hidden";
  const starts = row.startsAt ? new Date(row.startsAt).getTime() : null;
  const ends = row.endsAt ? new Date(row.endsAt).getTime() : null;
  if (starts && starts > now) return "scheduled";
  if (ends && ends < now) return "expired";
  return "active";
}

function safeLink(value: string): boolean {
  if (value === "") return true;
  return value.startsWith("/") && !value.startsWith("//") || /^https:\/\/[^\s]+$/i.test(value);
}

export function HighlightsClient() {
  const t = useTranslations("admin.highlights");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.admin.highlights,
    queryFn: adminApi.listHighlights,
    retry: false,
  });
  const settings = useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: adminApi.getSettings,
    staleTime: 0,
  });
  const categories = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: adminApi.listCategories,
    retry: false,
  });

  const [editing, setEditing] = useState<AdminHighlight | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(EMPTY));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [previewLocale, setPreviewLocale] = useState<"bn" | "en">(locale === "en" ? "en" : "bn");
  const [previewVariant, setPreviewVariant] = useState<"desktop" | "mobile">("desktop");
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const desktopFile = useRef<HTMLInputElement>(null);
  const mobileFile = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== baseline;

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.highlights });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
  };

  const saveSetting = useMutation({
    mutationFn: (values: Record<string, unknown>) => adminApi.updateSettings(values),
    onSuccess: invalidate,
    onError: (error) => toastApiError(error, tErrors),
  });

  const save = useMutation({
    mutationFn: () =>
      editing ? adminApi.updateHighlight(editing.id, toInput(draft)) : adminApi.createHighlight({
        ...toInput(draft),
        placement: PLACEMENT,
      }),
    onSuccess: async (saved) => {
      setEditing(saved);
      setDraft(draftFrom(saved));
      setBaseline(JSON.stringify(draftFrom(saved)));
      setWarnings(saved.warnings ?? []);
      await invalidate();
      toast.success(t("savedHint"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.removeHighlight(id),
    onSuccess: async () => {
      await invalidate();
      if (editing?.id === deleteId) {
        setEditing(null);
        setDraft(EMPTY);
        setBaseline(JSON.stringify(EMPTY));
      }
      setDeleteId(null);
      toast.success(t("deleted"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => adminApi.duplicateHighlight(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("duplicated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => adminApi.reorderHighlights(ids),
    onSuccess: invalidate,
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
      ),
    [query.data],
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((row) => row.id));
  };

  const commitDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...items];
    const from = next.findIndex((row) => row.id === dragId);
    const to = next.findIndex((row) => row.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorder.mutate(next.map((row) => row.id));
    setDragId(null);
  };

  const startNew = () => {
    if (dirty && !window.confirm(t("unsavedConfirm"))) return;
    setEditing(null);
    setDraft(EMPTY);
    setBaseline(JSON.stringify(EMPTY));
    setWarnings([]);
    setPreviewVariant("desktop");
  };

  const startEdit = (row: AdminHighlight) => {
    if (dirty && editing?.id !== row.id && !window.confirm(t("unsavedConfirm"))) return;
    setEditing(row);
    setDraft(draftFrom(row));
    setBaseline(JSON.stringify(draftFrom(row)));
    setWarnings(row.warnings ?? []);
  };

  const upload = async (file: File | undefined, slot: "desktop" | "mobile") => {
    if (!file) return;
    setUploading(slot);
    try {
      const stored = await uploadsApi.image(file, "banner");
      setDraft((current) =>
        slot === "desktop"
          ? {
              ...current,
              imageUrl: stored.url,
              imagePublicId: stored.key,
              imageWidth: stored.width ? String(stored.width) : "",
              imageHeight: stored.height ? String(stored.height) : "",
            }
          : {
              ...current,
              mobileImageUrl: stored.url,
              mobileImagePublicId: stored.key,
              mobileImageWidth: stored.width ? String(stored.width) : "",
              mobileImageHeight: stored.height ? String(stored.height) : "",
            },
      );
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(null);
    }
  };

  const enabled = settings.data?.["home.highlights.enabled"] === true;
  const autoplay = settings.data?.["home.highlights.autoplay"] === true;
  const overlayRatio = overlayContrast(draft.textColor, draft.scrimColor, draft.scrimOpacity);
  const buttonTextRatio =
    draft.buttonStyle === "custom"
      ? buttonContrast(draft.buttonTextColor, draft.buttonBgColor)
      : null;
  const linkError = !safeLink(draft.linkUrl || "") || !safeLink(draft.buttonHref || "");
  const scheduleError =
    draft.startsAt && draft.endsAt && new Date(draft.endsAt) <= new Date(draft.startsAt);
  const imageError = draft.imageUrl.trim() === "";
  const saveDisabled =
    save.isPending || imageError || linkError || scheduleError || draft.headlineBn.length > 60 ||
    draft.headlineEn.length > 60 || draft.subtextBn.length > 140 || draft.subtextEn.length > 140 ||
    draft.buttonLabelBn.length > 24 || draft.buttonLabelEn.length > 24;

  if (query.isLoading || settings.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (query.isError || settings.isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void query.refetch();
              void settings.refetch();
            }}
          >
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="rounded-2xl">
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="text-lg font-semibold">{t("masterTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("masterHelp")}</p>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <Switch
                checked={enabled}
                disabled={saveSetting.isPending}
                onCheckedChange={(checked) =>
                  saveSetting.mutate({ "home.highlights.enabled": checked })
                }
                aria-label={t("masterTitle")}
              />
              {enabled ? t("on") : t("off")}
            </label>
          </div>
          <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={autoplay}
                disabled={saveSetting.isPending}
                onCheckedChange={(checked) =>
                  saveSetting.mutate({ "home.highlights.autoplay": checked === true })
                }
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{t("autoplay")}</span>
                <span className="text-xs text-muted-foreground">{t("autoplayHelp")}</span>
              </span>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("interval")}</span>
              <Input
                key={String(settings.data?.["home.highlights.intervalSeconds"] ?? 6)}
                type="number"
                min={4}
                max={12}
                defaultValue={Number(settings.data?.["home.highlights.intervalSeconds"] ?? 6)}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (value >= 4 && value <= 12) {
                    saveSetting.mutate({ "home.highlights.intervalSeconds": value });
                  } else {
                    event.target.value = String(
                      settings.data?.["home.highlights.intervalSeconds"] ?? 6,
                    );
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">{t("intervalHelp")}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="rounded-2xl">
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="grid gap-1">
                <h2 className="text-lg font-semibold">{t("slidesTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("slidesHelp", { count: items.length })}
                </p>
              </div>
              <Button type="button" variant="cta" onClick={startNew}>
                <Plus aria-hidden className="size-4" />
                {t("addSlide")}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border/60 bg-secondary/20 p-8 text-center">
                <p className="text-sm font-medium">{t("emptyTitle")}</p>
                <p className="max-w-sm text-sm text-muted-foreground">{t("emptyBody")}</p>
                <Button type="button" variant="cta" onClick={startNew}>
                  <Plus aria-hidden className="size-4" />
                  {t("emptyAction")}
                </Button>
              </div>
            ) : (
              <ul className="grid gap-2">
                {items.map((row, index) => {
                  const status = statusOf(row);
                  return (
                    <li
                      key={row.id}
                      draggable
                      onDragStart={() => setDragId(row.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => commitDrop(row.id)}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-2.5"
                    >
                      <GripVertical aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                    <img
                          src={row.imageUrl}
                          alt=""
                          className="h-12 w-20 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <span className="h-12 w-20 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="grid min-w-0 flex-1 gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {row.headlineEn || row.headlineBn || row.title || t("untitled")}
                          </span>
                          <Badge variant={status === "active" ? "default" : "outline"}>
                            {t(`status.${status}`)}
                          </Badge>
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {row.linkUrl || row.buttonHref || t("noLink")}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("moveUp")}
                          disabled={index === 0 || reorder.isPending}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("moveDown")}
                          disabled={index === items.length - 1 || reorder.isPending}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={row.isActive ? t("hide") : t("show")}
                          onClick={() =>
                            adminApi
                              .updateHighlight(row.id, { isActive: !row.isActive })
                              .then(invalidate)
                              .catch((error) => toastApiError(error, tErrors))
                          }
                        >
                          {row.isActive ? t("hideShort") : t("showShort")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("edit")}
                          onClick={() => startEdit(row)}
                        >
                          <Pencil aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("duplicate")}
                          disabled={duplicate.isPending}
                          onClick={() => duplicate.mutate(row.id)}
                        >
                          <Copy aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("delete")}
                          onClick={() => setDeleteId(row.id)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {items.length > 5 ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                {t("recommendation")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {editing ? t("editSlide") : t("newSlide")}
              </h2>
              <Button
                type="button"
                variant="cta"
                disabled={saveDisabled}
                onClick={() => save.mutate()}
              >
                {save.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                {t("save")}
              </Button>
            </div>
            {dirty ? <p className="text-xs text-warning-foreground">{t("unsaved")}</p> : null}
            {warnings.length > 0 ? (
              <ul className="grid gap-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <section className="grid gap-3">
              <h3 className="font-heading text-base font-semibold">{t("images")}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 rounded-xl border border-border/60 p-3">
                  <p className="text-sm font-medium">{t("desktopImage")}</p>
                  <p className="text-xs text-muted-foreground">{t("desktopHelp")}</p>
                  {draft.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.imageUrl}
                      alt=""
                      className="aspect-3/1 w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="grid aspect-3/1 place-items-center rounded-md bg-muted/40 text-xs text-muted-foreground">
                      {t("noImage")}
                    </div>
                  )}
                  <input
                    ref={desktopFile}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => upload(event.target.files?.[0], "desktop")}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading !== null}
                      onClick={() => desktopFile.current?.click()}
                    >
                      {uploading === "desktop" ? (
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus aria-hidden className="size-4" />
                      )}
                      {t("upload")}
                    </Button>
                    {draft.imageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft({ ...draft, imageUrl: "", imagePublicId: "" })}
                      >
                        {t("remove")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2 rounded-xl border border-border/60 p-3">
                  <p className="text-sm font-medium">{t("mobileImage")}</p>
                  <p className="text-xs text-muted-foreground">{t("mobileHelp")}</p>
                  {draft.mobileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.mobileImageUrl}
                      alt=""
                      className="aspect-3/2 w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="grid aspect-3/2 place-items-center rounded-md bg-muted/40 text-xs text-muted-foreground">
                      {t("optional")}
                    </div>
                  )}
                  <input
                    ref={mobileFile}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => upload(event.target.files?.[0], "mobile")}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading !== null}
                      onClick={() => mobileFile.current?.click()}
                    >
                      {uploading === "mobile" ? (
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus aria-hidden className="size-4" />
                      )}
                      {t("upload")}
                    </Button>
                    {draft.mobileImageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDraft({ ...draft, mobileImageUrl: "", mobileImagePublicId: "" })
                        }
                      >
                        {t("remove")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label={t("altBn")}
                  lang="bn"
                  maxLength={120}
                  value={draft.imageAltBn}
                  placeholder={t("altBn")}
                  onChange={(event) => setDraft({ ...draft, imageAltBn: event.target.value })}
                />
                <Input
                  aria-label={t("altEn")}
                  lang="en"
                  maxLength={120}
                  value={draft.imageAltEn}
                  placeholder={t("altEn")}
                  onChange={(event) => setDraft({ ...draft, imageAltEn: event.target.value })}
                />
              </div>
              <div className="grid gap-2 rounded-xl border border-border/60 p-3">
                <p className="text-sm font-medium">{t("focal")}</p>
                <p className="text-xs text-muted-foreground">{t("focalHelp")}</p>
                <button
                  type="button"
                  className="relative aspect-3/1 overflow-hidden rounded-md bg-muted"
                  onClick={(event) => {
                    const box = event.currentTarget.getBoundingClientRect();
                    setDraft({
                      ...draft,
                      focalX: Math.round(((event.clientX - box.left) / box.width) * 100),
                      focalY: Math.round(((event.clientY - box.top) / box.height) * 100),
                    });
                  }}
                >
                  {draft.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.imageUrl}
                      alt=""
                      className="size-full object-cover"
                      style={{ objectPosition: `${draft.focalX}% ${draft.focalY}%` }}
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cta shadow"
                    style={{ left: `${draft.focalX}%`, top: `${draft.focalY}%` }}
                  />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.focalX}
                    aria-label={`${t("focal")} X`}
                    onChange={(event) => setDraft({ ...draft, focalX: Number(event.target.value) })}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.focalY}
                    aria-label={`${t("focal")} Y`}
                    onChange={(event) => setDraft({ ...draft, focalY: Number(event.target.value) })}
                  />
                </div>
              </div>
              {imageError ? <p className="text-xs text-destructive">{t("imageRequired")}</p> : null}
            </section>

            <section className="grid gap-3 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading text-base font-semibold">{t("content")}</h3>
                  <p className="text-xs text-muted-foreground">{t("contentHelp")}</p>
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Switch
                    checked={draft.overlayEnabled}
                    onCheckedChange={(checked) => setDraft({ ...draft, overlayEnabled: checked })}
                    aria-label={t("overlayEnabled")}
                  />
                  {t("overlayEnabled")}
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs">
                  {t("headlineBn")} ({draft.headlineBn.length}/60)
                  <Input
                    lang="bn"
                    maxLength={60}
                    value={draft.headlineBn}
                    onChange={(event) => setDraft({ ...draft, headlineBn: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  {t("headlineEn")} ({draft.headlineEn.length}/60)
                  <Input
                    lang="en"
                    maxLength={60}
                    value={draft.headlineEn}
                    onChange={(event) => setDraft({ ...draft, headlineEn: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  {t("subtextBn")} ({draft.subtextBn.length}/140)
                  <Textarea
                    lang="bn"
                    maxLength={140}
                    rows={2}
                    value={draft.subtextBn}
                    onChange={(event) => setDraft({ ...draft, subtextBn: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  {t("subtextEn")} ({draft.subtextEn.length}/140)
                  <Textarea
                    lang="en"
                    maxLength={140}
                    rows={2}
                    value={draft.subtextEn}
                    onChange={(event) => setDraft({ ...draft, subtextEn: event.target.value })}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["desktop", "mobile"] as const).map((variant) => (
                  <div key={variant} className="grid gap-2 rounded-xl border border-border/60 p-3">
                    <p className="text-xs font-medium">
                      {variant === "desktop" ? t("desktopPosition") : t("mobilePosition")}
                    </p>
                    <div className="grid w-fit grid-cols-3 gap-1">
                      {POSITIONS.map((position) => {
                        const selected =
                          (variant === "desktop" ? draft.desktopPosition : draft.mobilePosition) ===
                          position;
                        return (
                          <button
                            key={position}
                            type="button"
                            aria-label={t(`position.${position}`)}
                            aria-pressed={selected}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                ...(variant === "desktop"
                                  ? { desktopPosition: position }
                                  : { mobilePosition: position }),
                              })
                            }
                            className={`grid size-9 place-items-center rounded-md border text-[10px] ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {t(`positionShort.${position}`)}
                          </button>
                        );
                      })}
                    </div>
                    <label className="grid gap-1 text-xs">
                      {t("align")}
                      <select
                        className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                        value={variant === "desktop" ? draft.desktopAlign : draft.mobileAlign}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            ...(variant === "desktop"
                              ? { desktopAlign: event.target.value }
                              : { mobileAlign: event.target.value }),
                          })
                        }
                      >
                        {ALIGNS.map((align) => (
                          <option key={align} value={align}>
                            {t(`alignValue.${align}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1 text-xs">
                  <span>{t("textColor")}</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={color}
                        onClick={() => setDraft({ ...draft, textColor: color })}
                        className={`size-7 rounded-full border ${
                          draft.textColor === color ? "ring-2 ring-ring" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label={t("customColor")}
                      value={isHexColor(draft.textColor) ? draft.textColor : "#EFE7D2"}
                      onChange={(event) => setDraft({ ...draft, textColor: event.target.value })}
                      className="h-8 w-10 rounded border border-border"
                    />
                    <Input
                      className="h-8 w-24"
                      value={draft.textColor}
                      onChange={(event) => setDraft({ ...draft, textColor: event.target.value })}
                    />
                  </div>
                  <span className={overlayRatio < 4.5 ? "text-destructive" : "text-muted-foreground"}>
                    {t("contrast", { ratio: overlayRatio.toFixed(1) })}
                  </span>
                </div>
                <div className="grid gap-1 text-xs">
                  <span>{t("scrim")}</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {SCRIM_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={color}
                        onClick={() => setDraft({ ...draft, scrimColor: color })}
                        className={`size-7 rounded-full border ${
                          draft.scrimColor === color ? "ring-2 ring-ring" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label={t("customColor")}
                      value={isHexColor(draft.scrimColor) ? draft.scrimColor : "#0B2116"}
                      onChange={(event) => setDraft({ ...draft, scrimColor: event.target.value })}
                      className="h-8 w-10 rounded border border-border"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    {t("scrimOpacity")}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={draft.scrimOpacity}
                      onChange={(event) =>
                        setDraft({ ...draft, scrimOpacity: Number(event.target.value) })
                      }
                      className="flex-1"
                    />
                    <span className="w-8 text-right">{draft.scrimOpacity}%</span>
                  </label>
                </div>
              </div>
            </section>

            <section className="grid gap-3 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-base font-semibold">{t("buttonSection")}</h3>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Switch
                    checked={draft.buttonEnabled}
                    onCheckedChange={(checked) =>
                      setDraft({ ...draft, buttonEnabled: checked })
                    }
                    aria-label={t("buttonEnabled")}
                  />
                  {t("buttonEnabled")}
                </label>
              </div>
              {draft.buttonEnabled ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      aria-label={t("buttonLabelBn")}
                      lang="bn"
                      maxLength={24}
                      value={draft.buttonLabelBn}
                      placeholder={t("buttonLabelBn")}
                      onChange={(event) => setDraft({ ...draft, buttonLabelBn: event.target.value })}
                    />
                    <Input
                      aria-label={t("buttonLabelEn")}
                      lang="en"
                      maxLength={24}
                      value={draft.buttonLabelEn}
                      placeholder={t("buttonLabelEn")}
                      onChange={(event) => setDraft({ ...draft, buttonLabelEn: event.target.value })}
                    />
                    <Input
                      aria-label={t("buttonLink")}
                      value={draft.buttonHref}
                      placeholder="/products"
                      onChange={(event) => setDraft({ ...draft, buttonHref: event.target.value })}
                    />
                    <select
                      aria-label={t("buttonStyle")}
                      className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                      value={draft.buttonStyle}
                      onChange={(event) => setDraft({ ...draft, buttonStyle: event.target.value })}
                    >
                      {BUTTON_STYLES.map((style) => (
                        <option key={style} value={style}>
                          {t(`buttonStyles.${style}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {draft.buttonStyle === "custom" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs">
                        {t("buttonBg")}
                        <input
                          type="color"
                          value={isHexColor(draft.buttonBgColor) ? draft.buttonBgColor : "#2E4B2B"}
                          onChange={(event) =>
                            setDraft({ ...draft, buttonBgColor: event.target.value })
                          }
                          className="h-9 w-full rounded border border-border"
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        {t("buttonText")}
                        <input
                          type="color"
                          value={
                            isHexColor(draft.buttonTextColor) ? draft.buttonTextColor : "#FFFFFF"
                          }
                          onChange={(event) =>
                            setDraft({ ...draft, buttonTextColor: event.target.value })
                          }
                          className="h-9 w-full rounded border border-border"
                        />
                      </label>
                      <p
                        className={
                          buttonTextRatio !== null && buttonTextRatio < 3
                            ? "text-xs text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {t("contrast", { ratio: (buttonTextRatio ?? 0).toFixed(1) })}
                      </p>
                    </div>
                  ) : null}
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.openInNewTab}
                      onCheckedChange={(checked) =>
                        setDraft({ ...draft, openInNewTab: checked === true })
                      }
                    />
                    {t("openInNewTab")}
                  </label>
                </>
              ) : (
                <div className="grid gap-2">
                  <Input
                    aria-label={t("slideLink")}
                    value={draft.linkUrl}
                    placeholder="/products"
                    onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("slideLinkHelp")}</p>
                </div>
              )}
              <div className="grid gap-2 rounded-xl border border-border/60 p-3">
                <p className="text-xs font-medium">{t("linkHelper")}</p>
                <select
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                  value=""
                  onChange={(event) => {
                    if (!event.target.value) return;
                    setDraft({
                      ...draft,
                      ...(draft.buttonEnabled
                        ? { buttonHref: event.target.value }
                        : { linkUrl: event.target.value }),
                    });
                  }}
                >
                  <option value="">{t("pickPage")}</option>
                  <option value="/">{t("pageHome")}</option>
                  <option value="/products">{t("pageProducts")}</option>
                  <option value="/products?sort=newest">{t("pageNew")}</option>
                  {(categories.data ?? []).map((category: AdminCategory) => (
                    <option key={category.id} value={`/products?category=${category.slug}`}>
                      {t("pageCategory", { name: category.name })}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input
                    aria-label={t("productSlug")}
                    placeholder={t("productSlug")}
                    value={draft.linkUrl.startsWith("/products/") ? draft.linkUrl.slice(10) : ""}
                    onChange={(event) => {
                      const slug = event.target.value.trim();
                      const href = slug ? `/products/${slug}` : "";
                      setDraft({
                        ...draft,
                        ...(draft.buttonEnabled ? { buttonHref: href } : { linkUrl: href }),
                      });
                    }}
                  />
                </div>
              </div>
              {linkError ? <p className="text-xs text-destructive">{t("invalidLink")}</p> : null}
            </section>

            <section className="grid gap-3 border-t border-border/60 pt-4">
              <h3 className="font-heading text-base font-semibold">{t("schedule")}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs">
                  {t("startsAt")}
                  <Input
                    type="datetime-local"
                    value={draft.startsAt}
                    onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  {t("endsAt")}
                  <Input
                    type="datetime-local"
                    value={draft.endsAt}
                    onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })}
                  />
                </label>
              </div>
              {scheduleError ? <p className="text-xs text-destructive">{t("scheduleError")}</p> : null}
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.isActive}
                  onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked === true })}
                />
                {t("visibility")}
              </label>
            </section>

            <section className="grid gap-3 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-base font-semibold">{t("preview")}</h3>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewVariant === "desktop" ? "default" : "outline"}
                    onClick={() => setPreviewVariant("desktop")}
                  >
                    {t("previewDesktop")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewVariant === "mobile" ? "default" : "outline"}
                    onClick={() => setPreviewVariant("mobile")}
                  >
                    {t("previewMobile")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewLocale(previewLocale === "bn" ? "en" : "bn")}
                  >
                    {previewLocale === "bn" ? "বাংলা" : "English"}
                  </Button>
                </div>
              </div>
              <div className="pointer-events-none">
                <HighlightSlideView
                  slide={previewSlide(draft)}
                  locale={previewLocale}
                  preview
                  forceVariant={previewVariant}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="cta"
                disabled={saveDisabled}
                onClick={() => save.mutate()}
              >
                {save.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (dirty && !window.confirm(t("unsavedConfirm"))) return;
                  setEditing(null);
                  setDraft(EMPTY);
                  setBaseline(JSON.stringify(EMPTY));
                  setWarnings([]);
                }}
              >
                {t("cancel")}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleteId(editing.id)}
                >
                  <Trash2 aria-hidden className="size-4" />
                  {t("delete")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteId && remove.mutate(deleteId)}
            >
              {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

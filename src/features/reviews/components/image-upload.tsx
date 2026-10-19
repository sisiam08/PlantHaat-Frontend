"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadsApi } from "@/features/uploads/api";

const MAX_IMAGES = 5;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DOWNSCALE_ABOVE_BYTES = 1.5 * 1024 * 1024;
const MAX_EDGE = 2000;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

async function downscale(file: File): Promise<File> {
  if (file.size <= DOWNSCALE_ABOVE_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

interface UploadItem {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  url?: string;
}

export function MultiImageUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const t = useTranslations("engagement");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);

  const commit = (next: UploadItem[]) => {
    setItems(next);
    onChange(next.filter((item) => item.status === "done" && item.url).map((item) => item.url!));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    let list = [...items];
    const remaining = MAX_IMAGES - value.length - list.filter((i) => i.status !== "done").length;
    const picked = Array.from(files).slice(0, Math.max(0, remaining));
    for (const file of picked) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(t("unsupportedType"));
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(t("tooLarge"));
        continue;
      }
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      list = [...list, { id, name: file.name, previewUrl, status: "uploading" }];
      commit(list);
      try {
        const prepared = await downscale(file);
        const stored = await uploadsApi.image(prepared, "review");
        list = list.map((item) =>
          item.id === id ? { ...item, status: "done" as const, url: stored.url } : item,
        );
        commit(list);
      } catch {
        list = list.map((item) =>
          item.id === id ? { ...item, status: "error" as const } : item,
        );
        commit(list);
        toast.error(t("uploadFailed"));
      }
    }
  };

  const remove = (id: string) => {
    commit(items.filter((item) => item.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative size-20 overflow-hidden rounded-xl ring-1 ring-border/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.previewUrl} alt={item.name} className="size-full object-cover" />
            {item.status === "uploading" ? (
              <span className="absolute inset-0 grid place-items-center bg-background/70">
                <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
              </span>
            ) : null}
            {item.status === "error" ? (
              <span className="absolute inset-0 grid place-items-center bg-destructive/20 text-[10px] text-destructive">
                !
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={t("removePhoto")}
              className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-background/90 text-foreground shadow"
            >
              <X aria-hidden className="size-3" />
            </button>
          </div>
        ))}
        {items.length + value.length < MAX_IMAGES ? (
          <Button
            type="button"
            variant="outline"
            className="size-20 flex-col gap-1 rounded-xl border-dashed p-0 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus aria-hidden className="size-5" />
            {t("addPhotos")}
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
    </div>
  );
}

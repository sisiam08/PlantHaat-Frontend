"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatLatinDateTime } from "@/lib/format/date";
import { fetchAdminSellerDocument } from "../api";
import type { AdminSellerDocument } from "../types";

export function DocumentViewer({
  sellerId,
  documents,
}: {
  sellerId: string;
  documents: AdminSellerDocument[];
}) {
  const t = useTranslations("admin.sellers");
  const tDoc = useTranslations("admin.documentType");
  const [urls, setUrls] = useState<Record<string, { url: string; type: string }>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const created = urlsRef.current;
    return () => {
      Object.values(created).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const load = useCallback(
    async (id: string) => {
      if (urls[id]) return;
      setLoadingId(id);
      setError(null);
      try {
        const { blob, contentType } = await fetchAdminSellerDocument(sellerId, id);
        const url = URL.createObjectURL(blob);
        urlsRef.current[id] = url;
        setUrls((prev) => ({ ...prev, [id]: { url, type: contentType } }));
      } catch {
        setError(t("documentError"));
      } finally {
        setLoadingId(null);
      }
    },
    [sellerId, urls, t],
  );

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>;
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {documents.map((doc) => {
        const loaded = urls[doc.id];
        const isPdf = loaded?.type.includes("pdf");
        return (
          <div key={doc.id} className="grid gap-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{tDoc(doc.type)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatLatinDateTime(doc.createdAt)}
                </span>
              </div>
              {!loaded ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingId === doc.id}
                  onClick={() => load(doc.id)}
                >
                  {loadingId === doc.id ? t("loadingDocument") : t("viewDocument")}
                </Button>
              ) : (
                <a
                  href={loaded.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {t("openDocument")}
                </a>
              )}
            </div>
            {loaded && !isPdf ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={loaded.url}
                alt={tDoc(doc.type)}
                className="max-h-64 w-fit rounded-lg object-contain"
              />
            ) : null}
            {loaded && isPdf ? (
              <iframe
                src={loaded.url}
                title={tDoc(doc.type)}
                className="h-80 w-full rounded-lg border border-border"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

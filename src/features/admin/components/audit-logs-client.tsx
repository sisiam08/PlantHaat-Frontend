"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { Pager } from "./pager";

export function AuditLogsClient({
  initialEntityType,
  initialAction,
  initialActorId,
  initialPage,
}: {
  initialEntityType: string;
  initialAction: string;
  initialActorId: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.auditLogs");
  const router = useRouter();
  const page = Math.max(1, initialPage);
  const [entityType, setEntityType] = useState(initialEntityType);
  const [action, setAction] = useState(initialAction);
  const [actorId, setActorId] = useState(initialActorId);

  const query = useQuery({
    queryKey: queryKeys.admin.auditLogs({ entityType, action, actorId, page }),
    queryFn: () =>
      adminApi.listAuditLogs({
        entityType: entityType || undefined,
        action: action || undefined,
        actorId: actorId || undefined,
        page,
        limit: 30,
      }),
    retry: false,
  });

  const apply = (nextPage: number) => {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (actorId) params.set("actorId", actorId);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/audit-logs?${qs}` : "/admin/audit-logs");
  };

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="auditEntity">{t("entityType")}</Label>
          <Input
            id="auditEntity"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auditAction">{t("action")}</Label>
          <Input id="auditAction" value={action} onChange={(event) => setAction(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="auditActor">{t("actor")}</Label>
          <Input id="auditActor" value={actorId} onChange={(event) => setActorId(event.target.value)} />
        </div>
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => apply(1)}>
          {t("apply")}
        </Button>
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((log) => (
          <Card key={log.id} className="rounded-2xl">
            <CardContent className="grid gap-1 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{log.action}</span>
                <span className="text-xs text-muted-foreground">
                  {formatLatinDateTime(log.createdAt)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {log.entityType}
                {log.entityId ? ` · ${log.entityId}` : ""}
                {log.actorRole ? ` · ${log.actorRole}` : ""}
                {log.ipAddress ? ` · ${log.ipAddress}` : ""}
              </span>
              {log.after !== null && log.after !== undefined ? (
                <pre className="overflow-x-auto rounded-lg bg-muted p-2 text-xs">
                  {JSON.stringify(log.after, null, 2)}
                </pre>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? <Pager page={meta.page} totalPages={meta.totalPages} onPage={apply} /> : null}
    </div>
  );
}

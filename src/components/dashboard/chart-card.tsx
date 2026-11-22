"use client";

import { BarChart3, Download, Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ChartSummary } from "./chart-summary";
import { ChartSkeleton } from "./skeletons";

export interface ChartTableColumn {
  key: string;
  label: string;
  align?: "start" | "end";
}

export interface ChartTable {
  columns: ChartTableColumn[];
  rows: Record<string, string | number>[];
}

function toCsv(table: ChartTable): string {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    table.columns.map((column) => escape(column.label)).join(","),
    ...table.rows.map((row) => table.columns.map((column) => escape(row[column.key] ?? "")).join(",")),
  ].join("\n");
}

/**
 * One card for every chart: title/subtitle, optional actions, loading, empty and
 * error states, a one-sentence text summary, a data-table toggle and CSV export.
 */
export function ChartCard({
  title,
  subtitle,
  summary,
  actions,
  children,
  table,
  csvName,
  loading,
  error,
  empty,
  labels,
  className,
}: {
  title: string;
  subtitle?: string;
  summary?: string;
  actions?: ReactNode;
  children: ReactNode;
  table?: ChartTable;
  csvName?: string;
  loading?: boolean;
  error?: { message: string; retryLabel: string; onRetry: () => void };
  empty?: { message: string; action?: ReactNode };
  labels: { viewData: string; viewChart: string; exportCsv: string };
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();

  function exportCsv() {
    if (!table || !csvName) return;
    const blob = new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = csvName.endsWith(".csv") ? csvName : `${csvName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      aria-labelledby={headingId}
      className={cn(
        "grid grid-cols-1 min-w-0 gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="grid gap-0.5">
            <h2 id={headingId} className="font-heading text-base font-semibold">
              {title}
            </h2>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {table ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-pressed={showTable}
                onClick={() => setShowTable((value) => !value)}
                className="min-h-9"
              >
                {showTable ? (
                  <BarChart3 aria-hidden className="me-1 size-4" />
                ) : (
                  <Table2 aria-hidden className="me-1 size-4" />
                )}
                {showTable ? labels.viewChart : labels.viewData}
              </Button>
            ) : null}
            {table && csvName ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={exportCsv}
                className="min-h-9"
              >
                <Download aria-hidden className="me-1 size-4" />
                {labels.exportCsv}
              </Button>
            ) : null}
          </div>
        </div>
        {summary ? <ChartSummary text={summary} /> : null}
      </header>

      {loading ? (
        <ChartSkeleton className="border-0 p-0 shadow-none" height={200} />
      ) : error ? (
        <div role="alert" className="grid justify-items-start gap-2 rounded-xl bg-muted/60 p-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button type="button" size="sm" variant="outline" onClick={error.onRetry}>
            {error.retryLabel}
          </Button>
        </div>
      ) : empty ? (
        <div className="grid justify-items-center gap-2 rounded-xl bg-muted/40 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{empty.message}</p>
          {empty.action}
        </div>
      ) : showTable && table ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-border/60">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                {table.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "border-b border-border/60 px-3 py-2 font-medium text-muted-foreground",
                      column.align === "end" ? "text-end" : "text-start",
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index} className="even:bg-muted/30">
                  {table.columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "border-b border-border/40 px-3 py-1.5 tabular-nums",
                        column.align === "end" ? "text-end" : "text-start",
                      )}
                    >
                      {row[column.key] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

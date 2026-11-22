"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Rows3 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: "start" | "end";
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  /** Hide from the mobile card layout (e.g. secondary metadata). */
  cardHidden?: boolean;
}

type Direction = "asc" | "desc";

/**
 * Lightweight dashboard table: sticky header, sortable columns, density toggle
 * and a card layout below `md`. Keeps the page-level lists' existing tables
 * untouched; this is the shared surface for the redesigned dashboards.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyText,
  caption,
  labels,
  defaultDensity = "comfortable",
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyText: string;
  caption: string;
  labels: { density: string; sortBy: string };
  defaultDensity?: "comfortable" | "compact";
  className?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: Direction } | null>(null);
  const [density, setDensity] = useState(defaultDensity);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((entry) => entry.key === sort.key);
    if (!column) return rows;
    const value = (row: T) => (column.sortValue ? column.sortValue(row) : String(getRowKey(row)));
    return [...rows].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort, columns, getRowKey]);

  function toggleSort(column: DataColumn<T>) {
    setSort((current) => {
      if (!current || current.key !== column.key) return { key: column.key, direction: "asc" };
      return { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  const cellPadding = density === "compact" ? "py-1.5" : "py-2.5";

  return (
    <div className={cn("grid grid-cols-1 min-w-0 gap-2", className)}>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setDensity((value) => (value === "compact" ? "comfortable" : "compact"))}
          aria-label={labels.density}
          aria-pressed={density === "compact"}
          className="min-h-8"
        >
          <Rows3 aria-hidden className="me-1 size-4" />
          {labels.density}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <>
          <div className="hidden max-h-[32rem] overflow-auto rounded-xl border border-border/60 md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  {columns.map((column) => {
                    const active = sort?.key === column.key;
                    const SortIcon = active
                      ? sort?.direction === "asc"
                        ? ArrowUp
                        : ArrowDown
                      : ChevronsUpDown;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={
                          active ? (sort?.direction === "asc" ? "ascending" : "descending") : "none"
                        }
                        className={cn(
                          "border-b border-border/60 px-3 text-xs font-medium text-muted-foreground",
                          cellPadding,
                          column.align === "end" ? "text-end" : "text-start",
                        )}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column)}
                            aria-label={`${labels.sortBy}: ${column.header}`}
                            className="inline-flex min-h-8 items-center gap-1 rounded px-1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {column.header}
                            <SortIcon aria-hidden className="size-3.5" />
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={getRowKey(row)} className="even:bg-muted/30">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "border-b border-border/40 px-3 tabular-nums",
                          cellPadding,
                          column.align === "end" ? "text-end" : "text-start",
                        )}
                      >
                        {column.render ? column.render(row) : String(getRowKey(row))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label={caption} className="grid gap-2 md:hidden">
            {sorted.map((row) => (
              <li
                key={getRowKey(row)}
                className="grid gap-1 rounded-xl border border-border/60 bg-card p-3 text-sm"
              >
                {columns
                  .filter((column) => !column.cardHidden)
                  .map((column) => (
                    <div key={column.key} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{column.header}</span>
                      <span className={cn("text-end", column.align === "end" && "tabular-nums")}>
                        {column.render ? column.render(row) : ""}
                      </span>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

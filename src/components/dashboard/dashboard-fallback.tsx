import { ChartSkeleton, KpiSkeleton, TableSkeleton } from "./skeletons";

/** Sized first-paint placeholder while a dashboard's data streams in. */
export function DashboardFallback() {
  return (
    <div className="grid grid-cols-1 gap-5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
      <ChartSkeleton height={240} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartSkeleton height={200} />
        <ChartSkeleton height={200} />
      </div>
    </div>
  );
}

/** Sized list placeholder used while a table's first page streams in. */
export function ListFallback({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4" aria-hidden>
      <TableSkeleton rows={rows} />
    </div>
  );
}

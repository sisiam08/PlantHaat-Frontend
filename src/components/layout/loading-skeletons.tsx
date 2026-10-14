import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared content-area skeleton for dashboard route groups. Mounted via each
 * group's `loading.tsx`, so every nested customer/seller/admin route shows an
 * instant fallback while its page streams in. The surrounding layout (sidebar,
 * header) stays interactive.
 */
export function DashboardGroupLoading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 rounded-2xl border border-border/60 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

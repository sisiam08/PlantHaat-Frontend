import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic content fallback for routes whose body reads runtime/locale data.
 * Used as the `<Suspense>` fallback so the route still produces a static shell
 * (see the "static shell" note in `layout.tsx`).
 */
export function PageLoading() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-10">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

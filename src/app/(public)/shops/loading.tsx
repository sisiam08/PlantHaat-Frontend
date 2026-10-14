import { Skeleton } from "@/components/ui/skeleton";

export default function ShopsLoading() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:py-12">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}

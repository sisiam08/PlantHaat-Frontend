import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_1fr] lg:py-12">
      <Skeleton className="h-96 w-full rounded-2xl" />
      <div className="grid content-start gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function ShopDetailLoading() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:py-12">
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}

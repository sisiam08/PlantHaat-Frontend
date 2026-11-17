import { Skeleton } from "@/components/ui/skeleton";
import { ProductRailSkeleton } from "@/features/catalog/components/product-card";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="grid grid-cols-1 content-start gap-6">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
      <div className="mt-14 grid gap-4">
        <Skeleton className="h-7 w-56" />
        <ProductRailSkeleton count={8} />
      </div>
    </div>
  );
}

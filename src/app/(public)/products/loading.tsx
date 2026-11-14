import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_GRID_CLASS, PRODUCT_PAGE_SIZE } from "@/features/catalog/components/product-grid";

export default function ProductsLoading() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_1fr] lg:py-12">
      <Skeleton className="h-96 w-full rounded-2xl" />
      <div className="grid content-start gap-6">
        <Skeleton className="h-24 w-full" />
        <div data-product-grid className={PRODUCT_GRID_CLASS}>
          {Array.from({ length: PRODUCT_PAGE_SIZE.catalog }).map((_, index) => (
            <Skeleton
              data-product-skeleton
              key={index}
              className="aspect-[4/5] w-full rounded-2xl"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

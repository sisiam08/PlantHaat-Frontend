import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_GRID_CLASS, PRODUCT_PAGE_SIZE } from "@/features/catalog/components/product-grid";

export default function ShopDetailLoading() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:py-12">
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div data-product-grid className={PRODUCT_GRID_CLASS}>
        {Array.from({ length: PRODUCT_PAGE_SIZE.shop }).map((_, index) => (
          <Skeleton data-product-skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

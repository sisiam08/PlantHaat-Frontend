import { notFound } from "next/navigation";

import { ProductQuickView } from "@/features/catalog/components/product-quick-view";
import { QuickViewModal } from "@/features/catalog/components/quick-view-modal";
import { getProduct } from "@/features/catalog/server";

export default async function InterceptedProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  return (
    <QuickViewModal>
      <ProductQuickView product={product} />
    </QuickViewModal>
  );
}

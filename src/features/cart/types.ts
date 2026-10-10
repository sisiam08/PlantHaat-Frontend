export interface CartIssue {
  code: string;
  available?: number;
}

export interface CartItemView {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  slug: string;
  image: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  stockQty: number;
  issues: CartIssue[];
}

export interface CartShopView {
  shopId: string;
  shopName: string;
  shopSlug: string;
  items: CartItemView[];
  subtotal: string;
  deliveryCharge: string | null;
}

export interface CartView {
  shops: CartShopView[];
  subtotal: string;
  deliveryTotal: string;
  grandTotal: string;
  itemCount: number;
}

export const MAX_CART_QUANTITY = 20;

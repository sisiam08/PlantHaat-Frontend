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
  priceChanged: boolean;
  priceChangedFrom: string | null;
  priceChangedTo: string | null;
  issues: CartIssue[];
}

export interface CartShopInfo {
  logoUrl: string | null;
  district: string | null;
  verified: boolean;
}

export interface CartShopView {
  shopId: string;
  shopName: string;
  shopSlug: string;
  shop: CartShopInfo;
  items: CartItemView[];
  subtotal: string;
  priceChanged: boolean;
  /**
   * null = no district chosen yet, false = district chosen but this shop does
   * not deliver there, true = deliverable. Present once the API ships it.
   */
  deliverable?: boolean | null;
  deliveryCharge: string | null;
  courierCharge?: string | null;
  sellerExtraCharge?: string | null;
  deliveryQuoteSource?: string | null;
  deliveryQuoteEstimated?: boolean;
  deliveryReason?: string | null;
  parcelWeightKg?: string | null;
  freeDeliveryApplied?: boolean;
  freeDeliveryEnabled?: boolean | null;
  /** Present when the cart API returns the zone's free-delivery threshold. */
  freeDeliveryAbove?: string | null;
  /** Present when a matching delivery zone was found. */
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  deliveryCondition?: "INSIDE_DHAKA" | "OUTSIDE_DHAKA" | null;
  codAllowed?: boolean | null;
  advanceAllowed?: boolean | null;
}

export interface CartView {
  shops: CartShopView[];
  subtotal: string;
  deliveryTotal: string;
  grandTotal: string;
  itemCount: number;
  priceChanged: boolean;
  changedLineCount: number;
}

export const MAX_CART_QUANTITY = 20;


export interface OrderItemView {
  id: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderStatusHistoryView {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByRole: string | null;
  note: string | null;
  createdAt: string;
}

export interface ReplacementRefView {
  id: string;
  orderId: string;
  shopOrderNumber: string;
}

export interface ShopOrderView {
  id: string;
  shopOrderNumber: string;
  kind: string;
  parentShopOrderId: string | null;
  parent?: ReplacementRefView | null;
  replacements?: ReplacementRefView[];
  status: string;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  commissionAmount: string;
  sellerNetAmount: string;
  courierName: string | null;
  trackingCode: string | null;
  estimatedDeliveryFrom: string | null;
  estimatedDeliveryTo: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  deliveredAt: string | null;
  releaseAt?: string | null;
  fundsReleasedAt?: string | null;
  deliveryNote: string | null;
  deliveryProofs?: { id: string; url: string; createdAt: string }[];
  deliveryProofUrl?: string | null;
  delayNotifiedAt: string | null;
  stuckReminderCount: number;
  stuckFlaggedAt: string | null;
  items: OrderItemView[];
  statusHistory: OrderStatusHistoryView[];
  shop: { id: string; name: string; slug: string };
}

export interface OrderDetailView {
  id: string;
  orderNumber: string;
  overallStatus: string;
  subtotal: string;
  deliveryTotal: string;
  grandTotal: string;
  paymentMethod: string;
  paymentStatus: string;
  placedAt: string;
  createdAt: string;
  contactName: string;
  contactPhone: string;
  shippingDistrictName: string;
  shippingArea: string;
  shippingAddressLine: string;
  shopOrders: ShopOrderView[];
}

export interface OrderSummaryView {
  id: string;
  orderNumber: string;
  overallStatus: string;
  grandTotal: string;
  paymentStatus: string;
  paymentMethod: string;
  placedAt: string;
  shopOrders: { status: string; shopId: string; kind: string; parentShopOrderId: string | null }[];
}

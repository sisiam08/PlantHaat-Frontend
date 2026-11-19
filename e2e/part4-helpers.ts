import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

export const BASE = process.env.PAYMENTS_TEST_BASE_URL ?? "";
export const API = process.env.PAYMENTS_TEST_API_URL ?? "";
export const BUYER = { email: "buyer1@teststack.local", password: "TestBuyer123!" };
export const BUYER2 = { email: "buyer2@teststack.local", password: "TestBuyer123!" };
export const SELLER = { email: "seller1@teststack.local", password: "TestSeller123!" };
export const SELLER2 = { email: "seller2@teststack.local", password: "TestSeller123!" };
export const SELLER3 = { email: "seller3@teststack.local", password: "TestSeller123!" };
export const ADMIN = { email: "admin@teststack.local", password: "TestAdmin123!" };
export const SHOP = "Test Fern House";
export const SHOP2 = "Test Cactus Corner";
export const SHOP3 = "Test Herb Garden";

export function requireStack() {
  test.skip(
    !BASE || !API,
    "Set PAYMENTS_TEST_BASE_URL=http://localhost:3002 and PAYMENTS_TEST_API_URL=http://127.0.0.1:5001",
  );
}

export async function loginApi(
  playwright: {
    request: {
      newContext: (options?: {
        baseURL?: string;
        extraHTTPHeaders?: Record<string, string>;
      }) => Promise<APIRequestContext>;
    };
  },
  account: { email: string; password: string },
) {
  const context = await playwright.request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Origin: BASE },
  });
  const response = await context.post("/api/v1/auth/login", { data: account });
  expect(response.ok()).toBeTruthy();
  return context;
}

export async function loginBrowser(
  context: BrowserContext,
  account: { email: string; password: string },
  locale: "en" | "bn" = "en",
) {
  await context.addCookies([{ name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" }]);
  const response = await context.request.post(`${BASE}/api/v1/auth/login`, {
    data: account,
    headers: { origin: BASE },
  });
  expect(response.ok()).toBeTruthy();
}

interface ProductDetail {
  variants: { id: string; stockQty: number }[];
}

export async function productFor(api: APIRequestContext, shopName = SHOP): Promise<ProductDetail> {
  const response = await api.get("/api/v1/products?q=Test&limit=50");
  expect(response.ok(), await response.text()).toBeTruthy();
  const list = await response.json();
  const candidates = (list.data as { slug: string; minPrice: string; shop: { name: string } }[])
    .filter((row) => row.shop.name === shopName)
    .sort((a, b) => Number(b.minPrice) - Number(a.minPrice));
  for (const entry of candidates) {
    const detail = await (await api.get(`/api/v1/products/${entry.slug}`)).json();
    const product = detail.data as ProductDetail;
    if (product.variants.some((variant) => variant.stockQty > 0)) return product;
  }
  throw new Error(`No in-stock product for ${shopName}`);
}

export async function placeOrder(
  buyer: APIRequestContext,
  method: "ADVANCE" | "COD",
  shopName = SHOP,
) {
  await buyer.delete("/api/v1/cart");
  const product = await productFor(buyer, shopName);
  const variant = product.variants.find((row) => row.stockQty > 0);
  expect(variant).toBeTruthy();
  await buyer.put("/api/v1/cart/items", { data: { variantId: variant!.id, quantity: 1 } });
  const addresses = await (await buyer.get("/api/v1/addresses")).json();
  const order = await buyer.post("/api/v1/checkout", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { addressId: addresses.data[0].id, paymentMethod: method },
  });
  expect(order.ok()).toBeTruthy();
  return (await order.json()).data as {
    id: string;
    orderNumber: string;
    grandTotal: string;
    shopOrders: { id: string; total: string }[];
  };
}

export async function payAdvance(
  buyer: APIRequestContext,
  admin: APIRequestContext,
  order: { id: string; grandTotal: string },
) {
  const info = await (await buyer.get(`/api/v1/advance-payments/orders/${order.id}`)).json();
  await buyer.post(`/api/v1/advance-payments/orders/${order.id}/submissions`, {
    data: {
      provider: "BKASH",
      trxId: `T${Date.now().toString(36).toUpperCase()}`,
      senderNumber: "01712345678",
    },
  });
  const verified = await admin.post(`/api/v1/admin/advance-payments/${info.data.id}/verify`, {
    data: { amountReceived: Number(order.grandTotal) },
  });
  expect(verified.ok()).toBeTruthy();
}

export async function deliver(seller: APIRequestContext, shopOrderId: string) {
  for (const status of ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"]) {
    const response = await seller.post(`/api/v1/seller/orders/${shopOrderId}/status`, {
      data: { status },
    });
    expect(response.ok(), status).toBeTruthy();
  }
}

export async function openDispute(
  buyer: APIRequestContext,
  shopOrderId: string,
  type = "DAMAGED_PLANT",
) {
  const response = await buyer.post("/api/v1/complaints", {
    data: {
      shopOrderId,
      type,
      description: "The plant arrived damaged in the box",
      attachments: ["/uploads/test-evidence.png"],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data.id as string;
}

export async function setPublicReturnWindow(admin: APIRequestContext, hours = 2) {
  const response = await admin.patch("/api/v1/admin/settings", {
    data: {
      values: {
        "return.windowHours": hours,
        "return.earlyRelease": true,
        "return.photoRequired": true,
        "return.maxEvidencePhotos": 5,
        "return.disputeSellerHours": 48,
      },
    },
  });
  expect(response.ok()).toBeTruthy();
}

export async function ensurePayoutProfile(seller: APIRequestContext) {
  const response = await seller.put("/api/v1/seller/wallet/payout-profile", {
    data: { method: "BKASH", accountNumber: "01712345678", accountName: "Test Seller One" },
  });
  expect([200, 422]).toContain(response.status());
}

export async function clearPendingWithdrawals(admin: APIRequestContext) {
  const list = await (await admin.get("/api/v1/admin/withdrawals?status=PENDING&limit=50")).json();
  for (const row of list.data as { id: string }[]) {
    await admin.post(`/api/v1/admin/withdrawals/${row.id}/reject`, {
      data: { reason: "Test cleanup before scenario" },
    });
  }
}

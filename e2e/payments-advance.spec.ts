import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

type RequestFactory = {
  request: {
    newContext: (options?: {
      baseURL?: string;
      extraHTTPHeaders?: Record<string, string>;
    }) => Promise<APIRequestContext>;
  };
};

test.describe.configure({ mode: "serial" });

const BASE = process.env.PAYMENTS_TEST_BASE_URL ?? "";
const API = process.env.PAYMENTS_TEST_API_URL ?? "";
const BACKEND = "E:/Development/Projects/PlantHaat/backend";

const BUYER = { email: "buyer1@teststack.local", password: "TestBuyer123!" };
const BUYER2 = { email: "buyer2@teststack.local", password: "TestBuyer123!" };
const ADMIN = { email: "admin@teststack.local", password: "TestAdmin123!" };
const SELLERS = [
  { email: "seller1@teststack.local", password: "TestSeller123!", shop: "Test Fern House" },
  { email: "seller2@teststack.local", password: "TestSeller123!", shop: "Test Cactus Corner" },
  { email: "seller3@teststack.local", password: "TestSeller123!", shop: "Test Herb Garden" },
];
const SELLER = SELLERS[0];

function sellerFor(shopName: string) {
  return SELLERS.find((entry) => entry.shop === shopName) ?? SELLER;
}

test.setTimeout(300_000);
test.skip(!BASE || !API, "Set PAYMENTS_TEST_BASE_URL=http://localhost:3002 and PAYMENTS_TEST_API_URL=http://127.0.0.1:5001");

function trx(suffix: string) {
  return `T${Date.now().toString(36).toUpperCase()}${suffix}`.slice(0, 40);
}

async function loginApi(playwright: RequestFactory, account: { email: string; password: string }) {
  const context = await playwright.request.newContext({ baseURL: API, extraHTTPHeaders: { Origin: BASE } });
  const response = await context.post("/api/v1/auth/login", {
    data: { email: account.email, password: account.password },
  });
  expect(response.ok(), `login ${account.email}`).toBeTruthy();
  return context;
}

async function loginBrowser(context: BrowserContext, account: { email: string; password: string }) {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" }]);
  const response = await context.request.post(`${BASE}/api/v1/auth/login`, {
    data: { email: account.email, password: account.password },
    headers: { origin: BASE },
    timeout: 120_000,
  });
  expect(response.ok()).toBeTruthy();
}

async function product(api: APIRequestContext) {
  const list = await api.get("/api/v1/products?q=Test&limit=20");
  const json = await list.json();
  return json.data[0] as { id: string; slug: string; minPrice: string };
}

async function placeAdvance(api: APIRequestContext, shops = 1) {
  await api.delete("/api/v1/cart");
  const products = await (await api.get("/api/v1/products?q=Test&limit=20")).json();
  const perShop = new Map<string, { slug: string }>();
  for (const entry of products.data as { slug: string; shop: { id: string } }[]) {
    if (!perShop.has(entry.shop.id)) perShop.set(entry.shop.id, entry);
    if (perShop.size >= shops) break;
  }
  const chosen = [...perShop.values()];
  for (const entry of chosen) {
    const detail = await (await api.get(`/api/v1/products/${entry.slug}`)).json();
    const variant = detail.data.variants.find((row: { stockQty: number }) => row.stockQty > 0);
    const added = await api.put("/api/v1/cart/items", { data: { variantId: variant.id, quantity: 1 } });
    expect(added.ok()).toBeTruthy();
  }
  const addresses = await (await api.get("/api/v1/addresses")).json();
  const order = await api.post("/api/v1/checkout", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { addressId: addresses.data[0].id, paymentMethod: "ADVANCE" },
  });
  expect(order.ok()).toBeTruthy();
  return (await order.json()).data as {
    id: string;
    orderNumber: string;
    grandTotal: string;
    shopOrders: { id: string; shopId: string }[];
  };
}

async function addToCart(api: APIRequestContext, quantity = 1) {
  await api.delete("/api/v1/cart");
  const products = await (await api.get("/api/v1/products?q=Test&limit=5")).json();
  const detail = await (await api.get(`/api/v1/products/${products.data[0].slug}`)).json();
  const added = await api.put("/api/v1/cart/items", {
    data: { variantId: detail.data.variants[0].id, quantity },
  });
  expect(added.ok()).toBeTruthy();
}

async function paymentInfo(api: APIRequestContext, orderId: string) {
  const response = await api.get(`/api/v1/advance-payments/orders/${orderId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

async function submitPayment(
  api: APIRequestContext,
  orderId: string,
  tx: string,
  extra: Record<string, string> = {},
) {
  return api.post(`/api/v1/advance-payments/orders/${orderId}/submissions`, {
    data: { provider: "BKASH", trxId: tx, senderNumber: "01712345678", ...extra },
  });
}

async function adminVerify(api: APIRequestContext, intentId: string, amount: number) {
  const response = await api.post(`/api/v1/admin/advance-payments/${intentId}/verify`, {
    data: { amountReceived: amount },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

function runTestScript(script: string, args: string[]) {
  return execFileSync(process.execPath, ["--import", "tsx", join(BACKEND, "scripts", script), ...args], {
    cwd: BACKEND,
    encoding: "utf8",
  });
}

test("COD order still works end to end", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const products = await (await buyerApi.get("/api/v1/products?q=Test&limit=5")).json();
  const detail = await (await buyerApi.get(`/api/v1/products/${products.data[0].slug}`)).json();
  const variant = detail.data.variants[0];
  await buyerApi.delete("/api/v1/cart");
  await buyerApi.put("/api/v1/cart/items", { data: { variantId: variant.id, quantity: 1 } });
  const order = await buyerApi.post("/api/v1/checkout", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { addressId: addresses.data[0].id, paymentMethod: "COD" },
  });
  expect(order.ok()).toBeTruthy();
  const placed = (await order.json()).data;

  await loginBrowser(page.context(), BUYER);
  await page.goto(`${BASE}/orders/${placed.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(placed.orderNumber)).toBeVisible();
  await expect(page.locator("[data-order-payment]")).toHaveCount(0);
});

test("ADVANCE: checkout → payment page → submit → admin verify → seller unlock → paid", async ({
  page,
  playwright,
}) => {
  const buyerApi = await loginApi(playwright, BUYER);
  await buyerApi.delete("/api/v1/cart");
  const products = await (await buyerApi.get("/api/v1/products?q=Test&limit=5")).json();
  const detail = await (await buyerApi.get(`/api/v1/products/${products.data[0].slug}`)).json();
  await buyerApi.put("/api/v1/cart/items", {
    data: { variantId: detail.data.variants[0].id, quantity: 1 },
  });

  await loginBrowser(page.context(), BUYER);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.getByRole("radio", { name: /advance payment/i }).check();
  await page.locator("[data-place-order]").click();
  await page.waitForURL(/\/checkout\/payment\//, { timeout: 60_000 });
  const orderId = page.url().split("/").pop()!;
  await expect(page.locator("[data-payment-number]")).toHaveText("01700000000");
  await expect(page.getByText("Amount due").first()).toBeVisible();

  await page.getByRole("button", { name: /copy number/i }).click();
  await expect(page.getByRole("button", { name: /copied/i })).toBeVisible();
  await page.getByRole("button", { name: /payment made/i }).click();
  await page.getByLabel(/your mobile number/i).fill("01712345678");
  const tx = trx("A");
  await page.getByLabel(/transaction id/i).fill(tx);
  await page.locator('input[type="file"]').setInputFiles(
    "E:/Development/Projects/PlantHaat/frontend/public/placeholders/plant-placeholder.webp",
  );
  await expect(page.getByText(/screenshot attached/i)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /^submit payment/i }).click();
  await expect(page.getByText(/verifying your payment/i)).toBeVisible({ timeout: 60_000 });

  const info = await paymentInfo(buyerApi, orderId);
  expect(info.status).toBe("PENDING_VERIFICATION");
  expect(info.submissions[0].proofUrl).toContain("/payments/");

  const adminPage = await (await page.context().browser()!.newContext()).newPage();
  await loginBrowser(adminPage.context(), ADMIN);
  await adminPage.goto(`${BASE}/admin/advance-payments`, { waitUntil: "domcontentloaded" });
  const row = adminPage.locator("tr", { hasText: tx });
  await expect(row).toBeVisible({ timeout: 60_000 });
  await row.getByRole("button", { name: /^verify$/i }).click();
  await adminPage.locator("#amountReceived").fill(String(Number(info.amountDue)));
  await adminPage.getByRole("button", { name: /confirm verification/i }).click();
  await expect(adminPage.getByText(/payment verified/i)).toBeVisible({ timeout: 60_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/payment complete/i)).toBeVisible({ timeout: 60_000 });

  const orderDetail = (await (await buyerApi.get(`/api/v1/orders/${orderId}`)).json()).data;
  const orderShop = orderDetail.shopOrders[0];
  const sellerApi = await loginApi(playwright, sellerFor(orderShop.shop.name));
  const confirmed = await sellerApi.post(`/api/v1/seller/orders/${orderShop.id}/status`, {
    data: { status: "CONFIRMED" },
  });
  expect(confirmed.ok()).toBeTruthy();
  const packed = await sellerApi.post(`/api/v1/seller/orders/${orderShop.id}/status`, {
    data: { status: "PACKED" },
  });
  expect(packed.ok()).toBeTruthy();
  expect(info.status).toBe("PENDING_VERIFICATION");
});

test("rejection with reason, then resubmission", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  const order = await placeAdvance(buyerApi);
  const info = await paymentInfo(buyerApi, order.id);
  const tx = trx("R");
  expect((await submitPayment(buyerApi, order.id, tx)).status()).toBe(201);
  const reject = await adminApi.post(`/api/v1/admin/advance-payments/${info.id}/reject`, {
    data: { reason: "TrxID not found in our statement" },
  });
  expect(reject.ok()).toBeTruthy();

  await loginBrowser(page.context(), BUYER);
  await page.goto(`${BASE}/checkout/payment/${order.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/submission rejected/i)).toBeVisible();
  await expect(page.getByText(/TrxID not found/i)).toBeVisible();
  const tx2 = trx("R2");
  await submitPayment(buyerApi, order.id, tx2);
  await expect.poll(async () => (await paymentInfo(buyerApi, order.id)).status).toBe("PENDING_VERIFICATION");
});

test("duplicate TrxID is rejected with a clear message", async ({ playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const first = await placeAdvance(buyerApi);
  const second = await placeAdvance(buyerApi);
  const tx = trx("D");
  expect((await submitPayment(buyerApi, first.id, tx)).status()).toBe(201);
  const duplicate = await submitPayment(buyerApi, second.id, tx);
  expect(duplicate.status()).toBe(409);
  expect((await duplicate.json()).error.code).toBe("PAYMENT_SUBMISSION_DUPLICATE");
});

test("underpayment allows a second TrxID for the difference", async ({ playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  const order = await placeAdvance(buyerApi);
  const info = await paymentInfo(buyerApi, order.id);
  const due = Number(info.amountDue);
  const tx = trx("U");
  await submitPayment(buyerApi, order.id, tx);
  const result = await adminVerify(adminApi, info.id, due - 250);
  expect(result.status).toBe("UNDERPAID");
  expect(result.remainingAmount).toBe("250");
  const after = await paymentInfo(buyerApi, order.id);
  expect(after.status).toBe("REJECTED");
  expect(after.remainingAmount).toBe("250");
  await submitPayment(buyerApi, order.id, trx("U2"), {});
  const final = await adminVerify(adminApi, info.id, 250);
  expect(final.status).toBe("PAID");
});

test("overpayment is recorded for refund", async ({ playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  const order = await placeAdvance(buyerApi);
  const info = await paymentInfo(buyerApi, order.id);
  await submitPayment(buyerApi, order.id, trx("O"));
  const result = await adminVerify(adminApi, info.id, Number(info.amountDue) + 100);
  expect(result.status).toBe("PAID");
  expect(result.overpaidAmount).toBe("100");
  const refunds = await (await adminApi.get("/api/v1/admin/advance-refunds")).json();
  expect(refunds.data.some((row: { status: string; amount: string }) => row.status === "REFUND_PAYABLE" && row.amount === "100")).toBe(true);
});

test("UNPAID expires and returns stock; PENDING_VERIFICATION never expires", async ({ playwright }) => {
  test.setTimeout(900_000);
  const buyerApi = await loginApi(playwright, BUYER);
  const order = await placeAdvance(buyerApi);
  const before = await (await buyerApi.get(`/api/v1/products/${(await product(buyerApi)).slug}`)).json();
  const stockBefore = before.data.variants[0].stockQty;
  const output = JSON.parse(runTestScript("test-expire-intent.ts", [order.id]).trim().split("\n").pop()!);
  expect(output.status).toBe("EXPIRED");
  const after = await (await buyerApi.get(`/api/v1/products/${(await product(buyerApi)).slug}`)).json();
  expect(after.data.variants[0].stockQty).toBe(stockBefore + 1);

  const pendingOrder = await placeAdvance(buyerApi);
  await submitPayment(buyerApi, pendingOrder.id, trx("P"));
  runTestScript("test-expire-intent.ts", [pendingOrder.id]);
  expect((await paymentInfo(buyerApi, pendingOrder.id)).status).toBe("PENDING_VERIFICATION");
});

test("late payment inside the grace window reinstates the order", async ({ playwright }) => {
  test.setTimeout(900_000);
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  const order = await placeAdvance(buyerApi);
  runTestScript("test-expire-intent.ts", [order.id]);
  const info = await paymentInfo(buyerApi, order.id);
  expect(info.status).toBe("EXPIRED");
  expect((await submitPayment(buyerApi, order.id, trx("G"))).status()).toBe(201);
  const verified = await adminVerify(adminApi, info.id, Number(info.amountDue));
  expect(verified.status).toBe("PAID");
  expect(verified.reinstated).toBe(true);
});

test("cancelling one shop of a PAID order creates a partial refund obligation", async ({ playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  const order = await placeAdvance(buyerApi, 2);
  const info = await paymentInfo(buyerApi, order.id);
  await submitPayment(buyerApi, order.id, trx("C"));
  await adminVerify(adminApi, info.id, Number(info.amountDue));
  const target = order.shopOrders[0];
  const cancel = await buyerApi.post(`/api/v1/orders/shop-orders/${target.id}/cancel`, {
    data: { reason: "Changed mind" },
  });
  expect(cancel.ok()).toBeTruthy();
  const refunds = await (await adminApi.get("/api/v1/admin/advance-refunds")).json();
  const obligation = refunds.data.find(
    (row: { status: string; intent: { orderId: string } }) =>
      row.status === "REFUND_REQUIRED" && row.intent.orderId === order.id,
  );
  expect(obligation).toBeTruthy();
  const complete = await adminApi.post(`/api/v1/admin/advance-refunds/${obligation.id}/complete`, {
    data: { refundTrxId: "REF12345" },
  });
  expect(complete.ok()).toBeTruthy();
  await expect
    .poll(async () => (await paymentInfo(buyerApi, order.id)).status, { timeout: 30_000 })
    .toBe("PARTIALLY_REFUNDED");
});

test("permissions: other buyer cannot open the payment page; seller sees no numbers", async ({
  page,
  playwright,
}) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const otherApi = await loginApi(playwright, BUYER2);
  const order = await placeAdvance(buyerApi);
  expect((await otherApi.get(`/api/v1/advance-payments/orders/${order.id}`)).status()).toBe(404);

  const detail = (await (await buyerApi.get(`/api/v1/orders/${order.id}`)).json()).data;
  const sellerApi = await loginApi(playwright, sellerFor(detail.shopOrders[0].shop.name));

  await loginBrowser(page.context(), BUYER2);
  await page.goto(`${BASE}/checkout/payment/${order.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/could not load this payment/i)).toBeVisible({ timeout: 60_000 });

  const info = await paymentInfo(buyerApi, order.id);
  const sellerView = await sellerApi.get(`/api/v1/seller/orders/${order.shopOrders[0].id}/advance-payment`);
  expect(sellerView.ok()).toBeTruthy();
  const sellerJson = (await sellerView.json()).data;
  expect(JSON.stringify(sellerJson)).not.toContain("01700000000");
  expect(sellerJson.status).toBe("UNPAID");
  expect(info.instructions.providers[0].number).toBe("01700000000");
});

test("settings snapshot: new payments use the new number; provider toggle hides it", async ({
  page,
  playwright,
}) => {
  const adminApi = await loginApi(playwright, ADMIN);
  const buyerApi = await loginApi(playwright, BUYER);
  const baselineReauth = await adminApi.post("/api/v1/admin/settings/reauth", {
    data: { keys: ["payment.bkash.number"], password: ADMIN.password },
  });
  expect(baselineReauth.ok()).toBeTruthy();
  const baseline = await adminApi.patch("/api/v1/admin/settings", {
    headers: { "x-settings-reauth": (await baselineReauth.json()).data.token as string },
    data: { values: { "payment.bkash.number": "01700000000", "payment.bkash.enabled": true } },
  });
  expect(baseline.ok()).toBeTruthy();
  const reauth = await adminApi.post("/api/v1/admin/settings/reauth", {
    data: { keys: ["payment.bkash.number"], password: ADMIN.password },
  });
  expect(reauth.ok()).toBeTruthy();
  const token = (await reauth.json()).data.token as string;
  const old = await placeAdvance(buyerApi);
  const oldInfo = await paymentInfo(buyerApi, old.id);
  const updated = await adminApi.patch("/api/v1/admin/settings", {
    headers: { "x-settings-reauth": token },
    data: { values: { "payment.bkash.number": "01700000009" } },
  });
  expect(updated.ok()).toBeTruthy();
  const fresh = await placeAdvance(buyerApi);
  const freshInfo = await paymentInfo(buyerApi, fresh.id);
  expect(oldInfo.instructions.providers[0].number).toBe("01700000000");
  expect(freshInfo.instructions.providers[0].number).toBe("01700000009");

  await addToCart(buyerApi);
  await loginBrowser(page.context(), BUYER);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.getByRole("radio", { name: /advance payment/i }).check();
  await page.locator("[data-place-order]").click();
  await page.waitForURL(/\/checkout\/payment\//, { timeout: 60_000 });
  await expect(page.locator("[data-payment-number]")).toHaveText("01700000009");

  const disable = await adminApi.patch("/api/v1/admin/settings", {
    data: { values: { "payment.bkash.enabled": false } },
  });
  expect(disable.ok()).toBeTruthy();
  await buyerApi.delete("/api/v1/cart");
  const products = await (await buyerApi.get("/api/v1/products?q=Test&limit=5")).json();
  const detail = await (await buyerApi.get(`/api/v1/products/${products.data[0].slug}`)).json();
  await buyerApi.put("/api/v1/cart/items", {
    data: { variantId: detail.data.variants[0].id, quantity: 1 },
  });
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("radio", { name: /advance payment/i })).toBeVisible();
  await page.getByRole("radio", { name: /advance payment/i }).check();
  await page.locator("[data-place-order]").click();
  await page.waitForURL(/\/checkout\/payment\//, { timeout: 60_000 });
  await expect(page.getByRole("radio", { name: "bKash" })).toHaveCount(0);

  const restore = await adminApi.patch("/api/v1/admin/settings", {
    headers: { "x-settings-reauth": (await (await adminApi.post("/api/v1/admin/settings/reauth", { data: { keys: ["payment.bkash.number"], password: ADMIN.password } })).json()).data.token },
    data: { values: { "payment.bkash.number": "01700000000", "payment.bkash.enabled": true } },
  });
  expect(restore.ok()).toBeTruthy();
});

test("captures checkout selector and seller gating screenshots", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const order = await placeAdvance(buyerApi);
  const products = await (await buyerApi.get("/api/v1/products?q=Test&limit=5")).json();
  const detail = await (await buyerApi.get(`/api/v1/products/${products.data[0].slug}`)).json();
  await buyerApi.put("/api/v1/cart/items", {
    data: { variantId: detail.data.variants[0].id, quantity: 2 },
  });
  await loginBrowser(page.context(), BUYER);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-payment-option="ADVANCE"]').waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "../.artifacts/payments/checkout-selector-1280.png" });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.screenshot({ path: "../.artifacts/payments/checkout-selector-360.png" });

  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "bn", domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-payment-option="ADVANCE"]').waitFor({ state: "visible", timeout: 120_000 });
  await page.screenshot({ path: "../.artifacts/payments/checkout-selector-bn-1280.png" });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.screenshot({ path: "../.artifacts/payments/checkout-selector-bn-360.png" });

  await page.goto(`${BASE}/checkout/payment/${order.id}`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-payment-number]").waitFor({ state: "visible", timeout: 120_000 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "../.artifacts/payments/payment-unpaid-bn-1280.png" });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.screenshot({ path: "../.artifacts/payments/payment-unpaid-bn-360.png" });
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);

  const seller = await loginApi(playwright, sellerFor(
    (await (await buyerApi.get(`/api/v1/orders/${order.id}`)).json()).data.shopOrders[0].shop.name,
  ));
  const shopOrder = order.shopOrders[0];
  const blocked = await seller.post(`/api/v1/seller/orders/${shopOrder.id}/status`, { data: { status: "CONFIRMED" } });
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error.code).toBe("PAYMENT_REQUIRED");

  await page.setViewportSize({ width: 1280, height: 900 });
  await loginBrowser(page.context(), sellerFor((await (await buyerApi.get(`/api/v1/orders/${order.id}`)).json()).data.shopOrders[0].shop.name));
  await page.goto(`${BASE}/seller/orders/${shopOrder.id}`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: "../.artifacts/payments/seller-gating-1280.png" });
});

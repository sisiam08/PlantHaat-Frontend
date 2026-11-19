import { expect, test } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SHOP, SHOP2, loginApi, loginBrowser,
  payAdvance, productFor, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
requireStack();

test("multi-shop partial cancellation refund completed with a TrxID in the admin UI", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  await setPublicReturnWindow(adminApi, 24);

  await buyerApi.delete("/api/v1/cart");
  for (const shopName of [SHOP, SHOP2]) {
    const product = await productFor(buyerApi, shopName);
    const variant = product.variants.find((row) => row.stockQty > 0);
    await buyerApi.put("/api/v1/cart/items", {
      data: { variantId: variant!.id, quantity: 1 },
    });
  }
  const addresses = await (await buyerApi.get("/api/v1/addresses")).json();
  const created = await buyerApi.post("/api/v1/checkout", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { addressId: addresses.data[0].id, paymentMethod: "ADVANCE" },
  });
  expect(created.ok()).toBeTruthy();
  const order = (await created.json()).data as {
    id: string;
    orderNumber: string;
    grandTotal: string;
    shopOrders: { id: string }[];
  };
  expect(order.shopOrders.length).toBeGreaterThanOrEqual(2);
  await payAdvance(buyerApi, adminApi, order);

  const cancelled = await buyerApi.post(
    `/api/v1/orders/shop-orders/${order.shopOrders[0].id}/cancel`,
    { data: { reason: "Changed mind about this shop" } },
  );
  expect(cancelled.ok()).toBeTruthy();

  const adminContext = await page.context().browser()!.newContext();
  await loginBrowser(adminContext, ADMIN);
  const admin = await adminContext.newPage();
  await admin.goto(`${BASE}/admin/advance-refunds`, { waitUntil: "domcontentloaded" });
  const row = admin.locator("div.rounded-2xl").filter({ hasText: order.orderNumber }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole("button", { name: "Complete refund" }).click();
  await admin.getByLabel("Refund TrxID").fill("BKASHPARTIAL1");
  const submit = admin.getByRole("button", { name: "Record refund" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await admin.screenshot({ path: "../.artifacts/part4/multi-shop-refund-1280.png", fullPage: true });

  const buyerContext = await page.context().browser()!.newContext();
  await expect
    .poll(
      async () =>
        (await (await buyerApi.get(`/api/v1/advance-payments/orders/${order.id}`)).json()).data
          .status,
      { timeout: 30_000 },
    )
    .toBe("PARTIALLY_REFUNDED");
  const info = await (await buyerApi.get(`/api/v1/advance-payments/orders/${order.id}`)).json();
  expect(info.data.status).toBe("PARTIALLY_REFUNDED");
  expect(Number(info.data.refundedAmount)).toBeGreaterThan(0);
  await loginBrowser(buyerContext, BUYER);
  const buyer = await buyerContext.newPage();
  await buyer.goto(`${BASE}/orders/${order.id}`, { waitUntil: "domcontentloaded" });
  await expect(buyer.getByText(/partially refunded|refunded/i).first()).toBeVisible({ timeout: 30_000 });
});

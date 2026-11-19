import { expect, test } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SELLER, SHOP, clearPendingWithdrawals, ensurePayoutProfile, loginApi, loginBrowser,
  placeOrder, payAdvance, deliver, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
requireStack();

test("withdrawal rejected in the admin UI returns the reserve with a reason", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);
  const adminApi = await loginApi(playwright, ADMIN);
  await setPublicReturnWindow(adminApi, 2);
  await ensurePayoutProfile(sellerApi);
  await clearPendingWithdrawals(adminApi);
  const order = await placeOrder(buyerApi, "ADVANCE", SHOP);
  await payAdvance(buyerApi, adminApi, order);
  await deliver(sellerApi, order.shopOrders[0].id);
  await buyerApi
    .post(`/api/v1/orders/shop-orders/${order.shopOrders[0].id}/confirm-receipt`, {})
    .then((response) => expect(response.ok()).toBeTruthy());
  const withdrawal = await sellerApi.post("/api/v1/seller/wallet/withdrawals", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { amount: 500 },
  });
  const withdrawalBody = await withdrawal.json();
  const withdrawalId = withdrawalBody.data.id as string;
  const payoutNumber = withdrawalBody.data.payoutNumber as string;

  const sellerContext = await page.context().browser()!.newContext();
  await loginBrowser(sellerContext, SELLER);
  const sellerPage = await sellerContext.newPage();
  await sellerPage.goto(`${BASE}/seller/earnings`, { waitUntil: "domcontentloaded" });
  await expect(sellerPage.getByText("Total withdrawn", { exact: true }).first()).toBeVisible();

  const adminContext = await page.context().browser()!.newContext();
  await loginBrowser(adminContext, ADMIN);
  const admin = await adminContext.newPage();
  await admin.goto(`${BASE}/admin/withdrawals?status=PENDING`, { waitUntil: "domcontentloaded" });
  const row = admin.locator('[data-slot="card"]').filter({ hasText: payoutNumber }).first();
  await row.getByRole("button", { name: "Reject" }).click();
  await admin.locator(`#reason-${withdrawalId}`).fill("Account holder name does not match");
  await admin.getByRole("button", { name: "Reject request" }).first().click();
  await expect(admin.getByText("Withdrawal rejected")).toBeVisible({ timeout: 30_000 });
  await admin.screenshot({ path: "../.artifacts/part4/withdrawal-reject-1280.png", fullPage: true });

  const wallet = await (await sellerApi.get("/api/v1/seller/wallet")).json();
  expect(Number(wallet.data.balances.withdrawalReserved)).toBe(0);
  expect(Number(wallet.data.balances.available)).toBeGreaterThanOrEqual(500);

  await sellerPage.reload({ waitUntil: "domcontentloaded" });
  await expect(sellerPage.getByText("Rejected").first()).toBeVisible();
  await expect(sellerPage.getByText(/Account holder name does not match/).last()).toBeVisible();
  await sellerPage.screenshot({ path: "../.artifacts/part4/withdrawal-reject-seller-360.png", fullPage: true });

  const sellerNotifications = await (await sellerApi.get("/api/v1/notifications?limit=20")).json();
  expect(JSON.stringify(sellerNotifications.data)).toContain(withdrawalId);
});

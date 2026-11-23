import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SELLER, SHOP, clearPendingWithdrawals, ensurePayoutProfile,
  loginApi, loginBrowser, placeOrder, payAdvance, deliver, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);
requireStack();

async function reauthSetting(admin: APIRequestContext, key: string, value: unknown) {
  const token = await admin.post("/api/v1/admin/settings/reauth", {
    data: { keys: [key], password: ADMIN.password },
  });
  expect(token.ok()).toBeTruthy();
  const response = await admin.patch("/api/v1/admin/settings", {
    headers: { "x-settings-reauth": (await token.json()).data.token },
    data: { values: { [key]: value } },
  });
  expect(response.ok()).toBeTruthy();
}

test("withdrawal and payout-profile validation messages in the UI", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);
  const adminApi = await loginApi(playwright, ADMIN);
  await setPublicReturnWindow(adminApi, 2);
  await reauthSetting(adminApi, "payout.cooldownHours", 24);
  await reauthSetting(adminApi, "payout.maxPendingRequests", 3);
  await reauthSetting(adminApi, "wallet.codDuesLimit", 1000);
  await reauthSetting(adminApi, "wallet.codCommissionDeduct", true);
  await clearPendingWithdrawals(adminApi);
  await ensurePayoutProfile(sellerApi);
  const order = await placeOrder(buyerApi, "ADVANCE", SHOP);
  await payAdvance(buyerApi, adminApi, order);
  await deliver(sellerApi, order.shopOrders[0].id);
  await buyerApi
    .post(`/api/v1/orders/shop-orders/${order.shopOrders[0].id}/confirm-receipt`, {})
    .then((response) => expect(response.ok()).toBeTruthy());

  const context = await page.context().browser()!.newContext();
  await loginBrowser(context, SELLER);
  const seller = await context.newPage();
  await seller.goto(`${BASE}/seller/earnings`, { waitUntil: "domcontentloaded" });
  const wallet = await (await sellerApi.get("/api/v1/seller/wallet")).json();
  const available = Number(wallet.data.balances.available);
  expect(available).toBeGreaterThanOrEqual(500);

  await seller.getByRole("button", { name: "Withdraw" }).first().click();
  await seller.getByLabel("Amount").fill("100");
  await expect(seller.getByText(/below the minimum/i)).toBeVisible();
  await seller.getByLabel("Amount").fill(String(available + 1000));
  await expect(seller.getByText(/more than your available/i)).toBeVisible();
  await seller.getByRole("button", { name: "Cancel" }).click();

  // The canonical destination editor is /seller/payout-accounts. The profile
  // cooldown is enforced by the profile endpoint; the UI only adds accounts.
  const profileChange = await sellerApi.put("/api/v1/seller/wallet/payout-profile", {
    data: { method: "BKASH", accountName: "Another Holder", accountNumber: "01812345678" },
  });
  expect(profileChange.ok()).toBeFalsy();
  expect((await profileChange.json()).error.code).toBe("PAYOUT_PROFILE_COOLDOWN");

  // Invalid BD number in the canonical add-account form (cooldown disabled).
  await reauthSetting(adminApi, "payout.cooldownHours", 0);
  await seller.goto(`${BASE}/seller/payout-accounts`, { waitUntil: "domcontentloaded" });
  await seller.getByLabel("Account number").fill("123456");
  await seller.getByLabel("Account holder name").fill("Bad Number");
  await seller.getByRole("button", { name: "Save account", exact: true }).click();
  await expect(seller.getByText(/valid Bangladeshi mobile number/i)).toBeVisible({
    timeout: 30_000,
  });
  await reauthSetting(adminApi, "payout.cooldownHours", 24);

  // Back to the wallet for the withdrawal limits.
  await seller.goto(`${BASE}/seller/earnings`, { waitUntil: "domcontentloaded" });

  // Pending-request limit (set to 1 for this test).
  await reauthSetting(adminApi, "payout.maxPendingRequests", 1);
  const first = await sellerApi.post("/api/v1/seller/wallet/withdrawals", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { amount: 500 },
  });
  expect(first.status()).toBe(201);
  await seller.reload({ waitUntil: "domcontentloaded" });
  await seller.getByRole("button", { name: "Withdraw" }).first().click();
  await seller.getByLabel("Amount").fill("500");
  await seller.getByRole("button", { name: "Request withdrawal" }).click();
  await expect(seller.getByText(/maximum number of pending/i)).toBeVisible({ timeout: 30_000 });
  await clearPendingWithdrawals(adminApi);
  await reauthSetting(adminApi, "payout.maxPendingRequests", 3);

  // Double-submit uses one idempotency key and must return the same request.
  const key = crypto.randomUUID();
  const one = await sellerApi.post("/api/v1/seller/wallet/withdrawals", {
    headers: { "Idempotency-Key": key },
    data: { amount: 500 },
  });
  const two = await sellerApi.post("/api/v1/seller/wallet/withdrawals", {
    headers: { "Idempotency-Key": key },
    data: { amount: 500 },
  });
  expect(one.status()).toBe(201);
  expect((await two.json()).data.id).toBe((await one.json()).data.id);
  await clearPendingWithdrawals(adminApi);
  await reauthSetting(adminApi, "wallet.codCommissionDeduct", false);
  await reauthSetting(adminApi, "wallet.codDuesLimit", 1);
  const cod = await placeOrder(buyerApi, "COD", SHOP);
  await deliver(sellerApi, cod.shopOrders[0].id);
  await seller.reload({ waitUntil: "domcontentloaded" });
  await seller.getByRole("button", { name: "Withdraw" }).first().click();
  await seller.getByLabel("Amount").fill("500");
  await seller.getByRole("button", { name: "Request withdrawal" }).click();
  await expect(seller.getByText(/COD commission dues are above the limit/i)).toBeVisible({
    timeout: 30_000,
  });
  await expect(seller.getByText(/Pay the COD dues/i)).toBeVisible();
  await reauthSetting(adminApi, "wallet.codDuesLimit", 1000);
  await reauthSetting(adminApi, "wallet.codCommissionDeduct", true);
});

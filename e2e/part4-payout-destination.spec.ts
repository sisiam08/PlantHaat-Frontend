import { expect, test } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SELLER, SHOP, clearPendingWithdrawals, ensurePayoutProfile, loginApi, loginBrowser,
  placeOrder, payAdvance, deliver, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
requireStack();

const ACCOUNT_PATTERN = /01\d{9}/;

test("admin reveals a withdrawal destination only after re-auth, with copy and auto-hide", async ({ page, playwright }) => {
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
  expect(withdrawal.status(), await withdrawal.text()).toBe(201);
  const payoutNumber = (await withdrawal.json()).data.payoutNumber as string;

  const adminContext = await page.context().browser()!.newContext();
  await loginBrowser(adminContext, ADMIN);
  await adminContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const admin = await adminContext.newPage();
  await admin.goto(`${BASE}/admin/withdrawals?status=PENDING`, { waitUntil: "domcontentloaded" });
  const row = admin.locator('[data-slot="card"]').filter({ hasText: payoutNumber }).first();
  await expect(row.getByText(/017\*+78/)).toBeVisible();
  const bodyText = await admin.evaluate(() => document.body.innerText);
  expect(ACCOUNT_PATTERN.test(bodyText)).toBe(false);

  await admin.clock.install();
  await row.getByRole("button", { name: "Show payout details" }).click();
  await expect(admin.getByText("Confirm your password")).toBeVisible();
  await admin.locator("#destination-password").fill("wrong-password");
  await admin.getByRole("button", { name: "Show details" }).click();
  await expect(admin.getByText(/Incorrect email or password/i)).toBeVisible();
  await admin.locator("#destination-password").fill("TestAdmin123!");
  await admin.getByRole("button", { name: "Show details" }).click();
  await expect(admin.getByText("Account holder")).toBeVisible({ timeout: 30_000 });
  const revealedText = await admin.evaluate(() => document.body.innerText);
  expect(ACCOUNT_PATTERN.test(revealedText)).toBe(true);
  await admin.getByRole("button", { name: "Copy" }).click();
  await expect(admin.getByRole("button", { name: "Copied" })).toBeVisible();
  await admin.screenshot({ path: "../.artifacts/part4/payout-destination-1280.png", fullPage: true });

  await admin.getByRole("button", { name: "Hide now" }).click();
  await expect(admin.getByText("Account holder")).toBeHidden();

  await row.getByRole("button", { name: "Show payout details" }).click();
  await admin.locator("#destination-password").fill("TestAdmin123!");
  await admin.getByRole("button", { name: "Show details" }).click();
  await expect(admin.getByText("Account holder")).toBeVisible();
  await admin.waitForTimeout(61_000);
  await expect(admin.getByText("Account holder")).toBeHidden();

  await adminContext.addCookies([{ name: "NEXT_LOCALE", value: "bn", domain: "localhost", path: "/" }]);
  await admin.reload({ waitUntil: "domcontentloaded" });
  await admin.getByRole("button", { name: "পেআউটের বিবরণ দেখুন" }).first().click();
  await expect(admin.getByText("পাসওয়ার্ড নিশ্চিত করুন")).toBeVisible();
});

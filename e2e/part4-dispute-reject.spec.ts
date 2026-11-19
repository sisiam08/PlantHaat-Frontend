import { expect, test } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SELLER, ensurePayoutProfile, loginApi, loginBrowser, openDispute,
  placeOrder, payAdvance, deliver, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
requireStack();

test("dispute rejected by admin returns funds, notifies and blocks a stale tab", async ({
  page,
  playwright,
}) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);
  const adminApi = await loginApi(playwright, ADMIN);
  await setPublicReturnWindow(adminApi, 2);
  await ensurePayoutProfile(sellerApi);
  const order = await placeOrder(buyerApi, "ADVANCE");
  await payAdvance(buyerApi, adminApi, order);
  await deliver(sellerApi, order.shopOrders[0].id);
  const complaintId = await openDispute(buyerApi, order.shopOrders[0].id);
  await sellerApi.post(`/api/v1/seller/complaints/${complaintId}/comments`, {
    data: { body: "We packed it carefully; please check the courier photos." },
  });
  const walletBefore = await (await sellerApi.get("/api/v1/seller/wallet")).json();

  const adminA = await page.context().browser()!.newContext();
  await loginBrowser(adminA, ADMIN);
  const stale = await adminA.newPage();
  await stale.goto(`${BASE}/admin/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
  await expect(stale.getByText("Money decision")).toBeVisible();

  const adminB = await page.context().browser()!.newContext();
  await loginBrowser(adminB, ADMIN);
  const admin = await adminB.newPage();
  await admin.goto(`${BASE}/admin/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
  await admin.getByLabel("Decision").selectOption("REJECTED");
  await admin.getByLabel("Reason").fill("Photos do not show damage at delivery");
  await admin.getByRole("button", { name: "Confirm decision" }).click();
  await expect(admin.getByText("Dispute decision saved")).toBeVisible({ timeout: 30_000 });
  await expect(admin.getByText(/Already decided/)).toBeVisible();
  await admin.screenshot({ path: "../.artifacts/part4/dispute-reject-1280.png", fullPage: true });

  const walletAfter = await (await sellerApi.get("/api/v1/seller/wallet")).json();
  expect(Number(walletAfter.data.balances.onHold)).toBeLessThan(
    Number(walletBefore.data.balances.onHold),
  );
  expect(Number(walletAfter.data.balances.pending)).toBeGreaterThan(
    Number(walletBefore.data.balances.pending),
  );
  expect(Number(walletBefore.data.balances.onHold)).toBeGreaterThan(0);

  const sellerNotifications = await (await sellerApi.get("/api/v1/notifications?limit=20")).json();
  expect(JSON.stringify(sellerNotifications.data)).toContain(complaintId);
  const buyerNotifications = await (await buyerApi.get("/api/v1/notifications?limit=20")).json();
  expect(JSON.stringify(buyerNotifications.data)).toContain(complaintId);

  // A tab opened before the decision now gets a clear conflict, not a second post.
  await stale.getByLabel("Decision").selectOption("REFUND_FULL");
  await stale.getByLabel("Reason").fill("Stale tab attempts a second decision");
  await stale.getByRole("button", { name: "Confirm decision" }).click();
  await expect(stale.getByText(/already decided in another tab/i)).toBeVisible({ timeout: 30_000 });

  const buyerContext = await page.context().browser()!.newContext();
  await loginBrowser(buyerContext, BUYER);
  const buyer = await buyerContext.newPage();
  await buyer.goto(`${BASE}/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
  await expect(buyer.getByText(/Admin decision/i)).toBeVisible();
});


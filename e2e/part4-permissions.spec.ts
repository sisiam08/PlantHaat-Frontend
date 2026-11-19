import { expect, test } from "@playwright/test";

import { ADMIN, BASE, BUYER, SELLER, SELLER2, loginApi, loginBrowser, requireStack } from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);
requireStack();

test("role and direct-URL permission re-check", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);

  expect((await buyerApi.get("/api/v1/seller/wallet")).status()).toBe(403);
  expect((await sellerApi.get("/api/v1/admin/withdrawals")).status()).toBe(403);
  expect(
    (await buyerApi.post("/api/v1/admin/withdrawals/00000000-0000-0000-0000-000000000000/destination", { data: {} })).status(),
  ).toBe(403);

  const buyerContext = await page.context().browser()!.newContext();
  await loginBrowser(buyerContext, BUYER);
  const buyer = await buyerContext.newPage();
  await buyer.goto(`${BASE}/admin/withdrawals`, { waitUntil: "domcontentloaded" });
  await expect(buyer).not.toHaveURL(/\/admin\/withdrawals/);
  await expect(buyer.getByRole("heading", { name: "Withdrawals" })).toHaveCount(0);

  const sellerContext = await page.context().browser()!.newContext();
  await loginBrowser(sellerContext, SELLER2);
  const seller = await sellerContext.newPage();
  await seller.goto(`${BASE}/admin/complaints`, { waitUntil: "domcontentloaded" });
  await expect(seller).not.toHaveURL(/\/admin\/complaints/);

  // Two sellers see only their own wallet (balance is per authenticated seller).
  const seller2Api = await loginApi(playwright, SELLER2);
  const w1 = await (await sellerApi.get("/api/v1/seller/wallet")).json();
  const w2 = await (await seller2Api.get("/api/v1/seller/wallet")).json();
  expect(JSON.stringify(w1.data)).not.toBe(JSON.stringify(w2.data));
  expect((await adminDestinationAsAdmin(playwright)).status()).toBe(400);
});

async function adminDestinationAsAdmin(playwright: Parameters<typeof loginApi>[0]) {
  const admin = await loginApi(playwright, ADMIN);
  return admin.post("/api/v1/admin/withdrawals/00000000-0000-0000-0000-000000000000/destination", {
    data: {},
  });
}

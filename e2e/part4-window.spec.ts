import { expect, test } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SELLER, loginApi, loginBrowser, placeOrder, payAdvance,
  deliver, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
requireStack();

test("buyer early release closes the window and hides report/early actions", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);
  const adminApi = await loginApi(playwright, ADMIN);
  await setPublicReturnWindow(adminApi, 2);
  const order = await placeOrder(buyerApi, "ADVANCE");
  await payAdvance(buyerApi, adminApi, order);
  await deliver(sellerApi, order.shopOrders[0].id);

  const buyerContext = await page.context().browser()!.newContext();
  await loginBrowser(buyerContext, BUYER);
  const buyer = await buyerContext.newPage();
  await buyer.goto(`${BASE}/orders/${order.id}`, { waitUntil: "domcontentloaded" });
  await expect(buyer.getByText("Problem window is open")).toBeVisible();
  await buyer.getByRole("button", { name: "Everything is fine" }).click();
  await buyer.getByRole("button", { name: "Yes, release" }).click();
  await expect(buyer.getByText("Problem window closed")).toBeVisible({ timeout: 30_000 });
  await expect(buyer.getByRole("button", { name: "Everything is fine" })).toHaveCount(0);
  await expect(buyer.getByRole("link", { name: "Report a problem" })).toHaveCount(0);
  await buyer.screenshot({ path: "../.artifacts/part4/window-closed-1280.png", fullPage: true });
});

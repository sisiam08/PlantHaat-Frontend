import { expect, test } from "@playwright/test";

import {
  ADMIN, BASE, BUYER, SELLER, loginApi, loginBrowser, openDispute,
  placeOrder, payAdvance, deliver, requireStack, setPublicReturnWindow,
} from "./part4-helpers";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
requireStack();

test("admin dispute list filters by seller, age and amount", async ({ page, playwright }) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);
  const adminApi = await loginApi(playwright, ADMIN);
  await setPublicReturnWindow(adminApi, 2);
  const order = await placeOrder(buyerApi, "ADVANCE");
  await payAdvance(buyerApi, adminApi, order);
  await deliver(sellerApi, order.shopOrders[0].id);
  const complaintId = await openDispute(buyerApi, order.shopOrders[0].id);
  const detail = await (await adminApi.get(`/api/v1/admin/complaints/${complaintId}`)).json();
  const ticketNumber = detail.data.ticketNumber as string;

  const adminContext = await page.context().browser()!.newContext();
  await loginBrowser(adminContext, ADMIN);
  const admin = await adminContext.newPage();
  await admin.goto(`${BASE}/admin/complaints`, { waitUntil: "domcontentloaded" });
  await admin.getByLabel("Seller or shop").fill("Test Fern House");
  await admin.getByLabel("Min age (hours)").fill("0");
  await admin.getByLabel("Max age (hours)").fill("720");
  await admin.getByLabel("Min order total").fill("1");
  await admin.getByLabel("Max order total").fill("1000000");
  await admin.getByRole("button", { name: "Apply filters" }).click();
  await expect(admin.getByText(ticketNumber)).toBeVisible({ timeout: 30_000 });

  await admin.getByLabel("Seller or shop").fill("no-such-seller-xyz");
  await admin.getByRole("button", { name: "Apply filters" }).click();
  await expect(admin.getByText("No complaints.")).toBeVisible({ timeout: 30_000 });
  await admin.getByRole("button", { name: "Reset" }).click();
  await expect(admin.getByText(ticketNumber)).toBeVisible({ timeout: 30_000 });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { resolve } from "node:path";

import {
  ADMIN,
  BUYER,
  SELLER,
  BASE,
  loginApi,
  loginBrowser,
  placeOrder,
  requireStack,
} from "./part4-helpers";

test.setTimeout(240_000);
test.describe.configure({ mode: "serial" });
requireStack();

const PHOTO = resolve("public/placeholders/plant-placeholder.webp");

async function markShipped(seller: APIRequestContext, shopOrderId: string) {
  for (const status of ["CONFIRMED", "PACKED", "SHIPPED"]) {
    const response = await seller.post(`/api/v1/seller/orders/${shopOrderId}/status`, { data: { status } });
    expect(response.ok(), status).toBe(true);
  }
}

async function loginPage(page: Page, account: { email: string; password: string }) {
  await loginBrowser(page.context(), account);
}

test("seller uploads delivery proof and dispute response photos; buyer and admin see them", async ({
  page,
  playwright,
}) => {
  const sellerApi = await loginApi(playwright, SELLER);
  const buyerApi = await loginApi(playwright, BUYER);
  const adminApi = await loginApi(playwright, ADMIN);
  await adminApi.patch("/api/v1/admin/settings", {
    data: {
      values: {
        "return.photoRequired": false,
        "return.maxEvidencePhotos": 5,
        "order.deliveryProofRequired": false,
      },
    },
  });

  const order = await placeOrder(buyerApi, "COD", "Test Fern House");
  const shopOrderId = order.shopOrders[0].id;
  await markShipped(sellerApi, shopOrderId);

  await loginPage(page, SELLER);
  await page.goto(`${BASE}/seller/orders/${shopOrderId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /mark delivered/i }).click();
  await page.locator("#deliveryProof").setInputFiles(PHOTO);
  await expect(page.locator("#deliveryProof + div img").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /confirm: delivered/i }).click();
  await expect(page.locator("[data-delivery-proofs] img").first()).toBeVisible({ timeout: 30_000 });

  const adminOrder = await adminApi.get(`/api/v1/admin/orders/${shopOrderId}`);
  const orderView = (await adminOrder.json()).data as {
    deliveryProofs: { url: string }[];
  };
  expect(orderView.deliveryProofs.length).toBe(1);

  const complaintResponse = await buyerApi.post("/api/v1/complaints", {
    data: {
      shopOrderId,
      type: "WRONG_ITEM",
      description: "The delivered plant is a different variety",
    },
  });
  expect(complaintResponse.status()).toBe(201);
  const complaintId = (await complaintResponse.json()).data.id as string;

  await page.goto(`${BASE}/seller/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/write a message/i).fill("Packing photo attached");
  await page.locator("#responsePhotos").setInputFiles(PHOTO);
  await expect(page.locator("#responsePhotos + div img").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByText("Packing photo attached")).toBeVisible({ timeout: 30_000 });

  let buyerView: { comments: { attachments: { url: string }[] }[] } = { comments: [] };
  await expect
    .poll(async () => {
      const response = await buyerApi.get(`/api/v1/complaints/${complaintId}`);
      buyerView = (await response.json()).data as typeof buyerView;
      return buyerView.comments.length;
    }, { timeout: 30_000 })
    .toBe(1);
  expect(buyerView.comments[0].attachments.length).toBe(1);

  for (const width of [1280, 360] as const) {
    await page.setViewportSize({ width, height: width === 360 ? 900 : 1000 });
    await page.goto(`${BASE}/seller/orders/${shopOrderId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-delivery-proofs]")).toBeVisible({ timeout: 30_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `seller order ${width}`).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `../.artifacts/evidence-proof/seller-order-${width}.png`, fullPage: true });
    const axe = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      axe.violations.map((violation) => ({ width, id: violation.id, nodes: violation.nodes.length })),
    ).toEqual([]);
    await page.goto(`${BASE}/seller/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
    const complaintAxe = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      complaintAxe.violations.map((violation) => ({
        width,
        id: violation.id,
        nodes: violation.nodes.length,
      })),
    ).toEqual([]);
    await page.screenshot({ path: `../.artifacts/evidence-proof/seller-complaint-${width}.png`, fullPage: true });
  }

  // Buyer and admin read views for the same order/complaint.
  await page.context().clearCookies();
  await loginBrowser(page.context(), BUYER);
  await page.goto(`${BASE}/orders/${order.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-delivery-proofs] img").first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "../.artifacts/evidence-proof/buyer-order-1280.png", fullPage: true });
  await page.goto(`${BASE}/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Packing photo attached")).toBeVisible({ timeout: 30_000 });

  await page.context().clearCookies();
  await loginBrowser(page.context(), ADMIN);
  await page.goto(`${BASE}/admin/complaints/${complaintId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("The delivered plant is a different variety")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("[data-delivery-proofs] img").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Packing photo attached")).toBeVisible({ timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: "../.artifacts/evidence-proof/admin-complaint-1280.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.screenshot({ path: "../.artifacts/evidence-proof/admin-complaint-360.png", fullPage: true });
  const adminAxe = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    adminAxe.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })),
  ).toEqual([]);
});

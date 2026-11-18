import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const BASE = process.env.PAYMENTS_TEST_BASE_URL ?? "";
const API = process.env.PAYMENTS_TEST_API_URL ?? "";
test.skip(!BASE || !API, "Set PAYMENTS_TEST_BASE_URL=http://localhost:3002 and PAYMENTS_TEST_API_URL=http://127.0.0.1:5001");

const BUYER = { email: "buyer1@teststack.local", password: "TestBuyer123!" };
const SELLER = { email: "seller1@teststack.local", password: "TestSeller123!" };
const ADMIN = { email: "admin@teststack.local", password: "TestAdmin123!" };
const SHOP = "Test Fern House";

async function expectNoMobileOverflow(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 360, height: 900 });
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function expectNoAxe(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${JSON.stringify(node.target)}`)),
  ).toEqual([]);
}


async function loginApi(
  playwright: { request: { newContext: (options?: { baseURL?: string; extraHTTPHeaders?: Record<string, string> }) => Promise<APIRequestContext> } },
  account: { email: string; password: string },
) {
  const context = await playwright.request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Origin: BASE },
  });
  const response = await context.post("/api/v1/auth/login", { data: account });
  expect(response.ok()).toBeTruthy();
  return context;
}

async function loginBrowser(context: BrowserContext, account: { email: string; password: string }) {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" }]);
  const response = await context.request.post(`${BASE}/api/v1/auth/login`, {
    data: account,
    headers: { origin: BASE },
  });
  expect(response.ok()).toBeTruthy();
}

async function productFor(api: APIRequestContext) {
  const list = await (await api.get("/api/v1/products?q=Test&limit=40")).json();
  const entry = (list.data as { slug: string; shop: { name: string } }[]).find(
    (row) => row.shop.name === SHOP,
  );
  expect(entry).toBeTruthy();
  const detail = await (await api.get(`/api/v1/products/${entry!.slug}`)).json();
  return detail.data as {
    id: string;
    variants: { id: string; stockQty: number }[];
  };
}

async function placeOrder(buyer: APIRequestContext, method: "ADVANCE" | "COD") {
  await buyer.delete("/api/v1/cart");
  const product = await productFor(buyer);
  const variant = product.variants.find((row) => row.stockQty > 0);
  expect(variant).toBeTruthy();
  await buyer.put("/api/v1/cart/items", {
    data: { variantId: variant!.id, quantity: 1 },
  });
  const addresses = await (await buyer.get("/api/v1/addresses")).json();
  const order = await buyer.post("/api/v1/checkout", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { addressId: addresses.data[0].id, paymentMethod: method },
  });
  expect(order.ok()).toBeTruthy();
  return (await order.json()).data as {
    id: string;
    grandTotal: string;
    shopOrders: { id: string; total: string }[];
  };
}

async function payAdvance(
  buyer: APIRequestContext,
  admin: APIRequestContext,
  order: { id: string; grandTotal: string },
) {
  const info = await (await buyer.get(`/api/v1/advance-payments/orders/${order.id}`)).json();
  const trx = `T${Date.now().toString(36).toUpperCase()}`;
  await buyer.post(`/api/v1/advance-payments/orders/${order.id}/submissions`, {
    data: { provider: "BKASH", trxId: trx, senderNumber: "01712345678" },
  });
  const verified = await admin.post(`/api/v1/admin/advance-payments/${info.data.id}/verify`, {
    data: { amountReceived: Number(order.grandTotal) },
  });
  expect(verified.ok()).toBeTruthy();
}

async function deliver(seller: APIRequestContext, shopOrderId: string) {
  for (const status of ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"]) {
    const response = await seller.post(`/api/v1/seller/orders/${shopOrderId}/status`, {
      data: { status },
    });
    expect(response.ok(), status).toBeTruthy();
  }
}

test("Part 4 wallet, early release, withdrawal, COD dues and dispute decision", async ({
  page,
  playwright,
}) => {
  const buyerApi = await loginApi(playwright, BUYER);
  const sellerApi = await loginApi(playwright, SELLER);
  const adminApi = await loginApi(playwright, ADMIN);

  console.log("STEP settings");
  await adminApi.patch("/api/v1/admin/settings", {
    data: {
      values: {
        "return.windowHours": 2,
        "return.earlyRelease": true,
        "return.photoRequired": true,
        "return.maxEvidencePhotos": 5,
        "return.disputeSellerHours": 48,
      },
    },
  });

  console.log("STEP place advance");
  const order = await placeOrder(buyerApi, "ADVANCE");
  await payAdvance(buyerApi, adminApi, order);
  const shopOrderId = order.shopOrders[0].id;
  await deliver(sellerApi, shopOrderId);

  console.log("STEP seller wallet");
  const profile = await sellerApi.put("/api/v1/seller/wallet/payout-profile", {
    data: { method: "BKASH", accountNumber: "01712345678", accountName: "Test Seller One" },
  });
  expect(profile.ok()).toBeTruthy();
  await loginBrowser(page.context(), SELLER);
  await page.goto(`${BASE}/seller/earnings`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Wallet", level: 1 }).last()).toBeVisible();
  await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Releases /).first()).toBeVisible();
  await expectNoAxe(page);
  await expectNoMobileOverflow(page);

  console.log("STEP buyer page");
  const buyerContext = await page.context().browser()!.newContext();
  await loginBrowser(buyerContext, BUYER);
  const buyer = await buyerContext.newPage();
  await buyer.goto(`${BASE}/orders/${order.id}`, { waitUntil: "domcontentloaded" });
  await expect(buyer.getByText("Problem window is open")).toBeVisible();
  await expectNoAxe(buyer);
  await expectNoMobileOverflow(buyer);
  await buyer.getByRole("button", { name: "Everything is fine" }).click();
  await buyer.getByRole("button", { name: "Yes, release" }).click();
  await expect(buyer.getByText("Problem window closed")).toBeVisible({ timeout: 30_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Available", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).first().click();
  await page.getByLabel("Amount").fill("500");
  await page.getByRole("button", { name: "Request withdrawal" }).click();
  await expect(page.getByText("Withdrawal requested")).toBeVisible({ timeout: 30_000 });

  console.log("STEP admin withdrawals");
  const adminContext = await page.context().browser()!.newContext();
  await loginBrowser(adminContext, ADMIN);
  const admin = await adminContext.newPage();
  await admin.goto(`${BASE}/admin/withdrawals?status=PENDING`, {
    waitUntil: "domcontentloaded",
  });
  await expect(admin.getByRole("heading", { name: "Withdrawals", level: 1 }).last()).toBeVisible();
  await expectNoAxe(admin);
  await expectNoMobileOverflow(admin);
  await admin.getByRole("button", { name: "Mark paid" }).first().click();
  await admin.getByLabel("Transaction reference").fill("BKASH-TEST-1");
  await admin.getByRole("button", { name: "Confirm paid" }).click();
  await expect(admin.getByText("Withdrawal marked paid")).toBeVisible({ timeout: 30_000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Total withdrawn", { exact: true }).first()).toBeVisible();

  const reauth = await adminApi.post("/api/v1/admin/settings/reauth", {
    data: { keys: ["wallet.codCommissionDeduct"], password: ADMIN.password },
  });
  expect(reauth.ok()).toBeTruthy();
  const reauthToken = (await reauth.json()).data.token as string;
  await adminApi.patch("/api/v1/admin/settings", {
    headers: { "x-settings-reauth": reauthToken },
    data: { values: { "wallet.codCommissionDeduct": false } },
  });
  console.log("STEP COD");
  // COD dues
  const cod = await placeOrder(buyerApi, "COD");
  await deliver(sellerApi, cod.shopOrders[0].id);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Cash-on-delivery commission due")).toBeVisible();

  console.log("STEP dispute");
  // Dispute on a new delivered advance order
  const disputed = await placeOrder(buyerApi, "ADVANCE");
  await payAdvance(buyerApi, adminApi, disputed);
  await deliver(sellerApi, disputed.shopOrders[0].id);
  const complaint = await buyerApi.post("/api/v1/complaints", {
    data: {
      shopOrderId: disputed.shopOrders[0].id,
      type: "DAMAGED_PLANT",
      description: "The plant arrived with broken leaves in the box",
      attachments: ["/uploads/test-evidence.png"],
    },
  });
  expect(complaint.status()).toBe(201);
  const complaintId = (await complaint.json()).data.id as string;
  await sellerApi.post(`/api/v1/seller/complaints/${complaintId}/comments`, {
    data: { body: "We packed it carefully; checking the courier photos." },
  });
  const decision = await adminApi.post(`/api/v1/admin/complaints/${complaintId}/decision`, {
    data: {
      decision: "REFUND_PARTIAL",
      reason: "Courier damage confirmed on two leaves",
      refundAmount: 200,
      refundTrxId: "BKASHREF-TEST-1",
    },
  });
  expect(decision.ok()).toBeTruthy();

  await admin.goto(`${BASE}/admin/complaints/${complaintId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(admin.getByText("Money decision")).toBeVisible();
  await expect(admin.getByText(/Already decided/)).toBeVisible();

  console.log("STEP recon");
  await admin.goto(`${BASE}/admin/reconciliation`, { waitUntil: "domcontentloaded" });
  await admin.getByRole("button", { name: "Run check" }).click();
  await expect(admin.getByText("Settlement conservation")).toBeVisible();
  await expect(admin.getByText("Balanced").first()).toBeVisible();
});

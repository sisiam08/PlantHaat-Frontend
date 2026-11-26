import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
const ORIGIN = BASE;
const BUYER1 = {
  email: process.env.TEST_BUYER_EMAIL ?? "buyer1@teststack.local",
  password: process.env.TEST_BUYER_PASSWORD ?? "TestBuyer123!",
};
const BUYER2 = { email: "buyer2@teststack.local", password: "TestBuyer123!" };
const SELLER = { email: "seller1@teststack.local", password: "TestSeller123!" };
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@teststack.local",
  password: process.env.ADMIN_PASSWORD ?? "TestAdmin123!",
};
const V_MONSTERA = "00000000-0000-4000-8000-000000000000";
const V_SYLHET = "00000000-0000-4000-8000-000000000099";

test.setTimeout(180_000);
test.describe.configure({ mode: "serial" });

let runtimeErrors: string[] = [];
test.beforeEach(async ({ page }, testInfo) => {
  runtimeErrors = [];
  if (testInfo.project.name === "mobile-chromium") {
    await page.setViewportSize({ width: 360, height: 800 });
  }
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Known isolated-stack issue: the realtime client still targets :5000 and
    // the production CSP blocks ws://localhost:5000. Tracked in FRONTEND_CONTEXT.
    if (
      text.includes("ws://localhost:5000/socket.io") &&
      text.includes("Content Security Policy")
    ) {
      return;
    }
    runtimeErrors.push(`console: ${text}`);
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "";
    if (failure.includes("ERR_ABORTED")) return;
    if (request.url().includes("localhost:5000/socket.io")) return;
    runtimeErrors.push(`request: ${request.url()} ${failure}`);
  });
});
test.afterEach(async () => {
  expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const status = await page.evaluate(
    async (creds) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creds),
      });
      return response.status;
    },
    { email, password },
  );
  expect(status).toBe(200);
}

async function setLocale(page: Page, locale: "bn" | "en") {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
}

async function apiContext(playwright: {
  request: {
    newContext: (options?: {
      baseURL?: string;
      extraHTTPHeaders?: Record<string, string>;
    }) => Promise<APIRequestContext>;
  };
}) {
  return playwright.request.newContext({
    baseURL: BASE,
    extraHTTPHeaders: { Origin: ORIGIN },
  });
}

async function assertNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, "horizontal overflow").toBe(false);
}

async function assertAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function clearCart(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/v1/cart", { method: "DELETE" });
  });
}

async function addToCart(page: Page, variantId: string, quantity: number) {
  const status = await page.evaluate(
    async ({ variantId, quantity }) => {
      const response = await fetch("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });
      return response.status;
    },
    { variantId, quantity },
  );
  expect(status).toBe(200);
}

test.describe("delivery quotes", () => {
  test("logged-in cart shows two shops, courier + extra, and is axe-clean", async ({
    page,
  }) => {
    await setLocale(page, "en");
    await signIn(page, BUYER1.email, BUYER1.password);
    await clearCart(page);
    await addToCart(page, V_MONSTERA, 3);
    await addToCart(page, V_SYLHET, 1);

    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-shop-total]")).toHaveCount(2);
    const breakdown = page.getByText("Courier charge + seller extra").first();
    await expect(breakdown).toBeVisible();
    await breakdown.click();
    await expect(page.getByText("Courier charge", { exact: true })).toBeVisible();

    await assertNoOverflow(page);
    await assertAxe(page);

    await page.setViewportSize({ width: 360, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertNoOverflow(page);
  });

  test("guest cart picks district and thana without login, hides placeholder thanas", async ({
    page,
  }) => {
    await setLocale(page, "bn");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/products/test-monstera", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /কার্টে যোগ|Add to cart/i }).click();
    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    const dhakaId = await page.evaluate(async () => {
      const response = await fetch("/api/v1/locations/districts");
      const body = await response.json();
      return body.data.find(
        (district: { name: string }) => district.name === "Dhaka",
      )?.id as number | undefined;
    });
    expect(dhakaId).toBeTruthy();
    await page.selectOption("#guest-district", String(dhakaId));
    await page.selectOption("#guest-thana", { label: "Mirpur" });
    const options = await page.locator("#guest-thana option").allTextContents();
    expect(options).not.toContain("Zone Not Clear");
    await expect(page.getByText("ফ্রি ডেলিভারি")).toHaveCount(0);
    await assertNoOverflow(page);
    await assertAxe(page);
  });

  test("a saved Dhaka address without a thana blocks checkout with a clear prompt", async ({
    page,
  }) => {
    await setLocale(page, "en");
    await signIn(page, BUYER2.email, BUYER2.password);
    await clearCart(page);
    await addToCart(page, V_MONSTERA, 1);
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("This Dhaka address has no thana yet."),
    ).toBeVisible();
    const place = page.getByRole("button", { name: /Place order/i }).first();
    await expect(place).toBeDisabled();
    await assertNoOverflow(page);
  });

  test("COD_ONLY removes Advance at checkout and is restored afterwards", async ({
    page,
    playwright,
  }) => {
    const sellerApi = await apiContext(playwright);
    const login = await sellerApi.post("/api/v1/auth/login", { data: SELLER });
    expect(login.ok()).toBeTruthy();
    const setMode = (paymentMode: "COD_ONLY" | "COD_AND_ADVANCE") =>
      sellerApi.put("/api/v1/seller/delivery-conditions/INSIDE_DHAKA", {
        data: {
          paymentMode,
          estimatedDaysMin: 1,
          estimatedDaysMax: 3,
          freeDeliveryEnabled: false,
          isActive: true,
        },
      });
    const condition = await setMode("COD_ONLY");
    expect(condition.ok()).toBeTruthy();

    try {
      await setLocale(page, "en");
      await signIn(page, BUYER1.email, BUYER1.password);
      await clearCart(page);
      await addToCart(page, V_MONSTERA, 1);
      await page.goto("/checkout", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-payment-option="COD"]')).toBeVisible();
      await expect(page.locator('[data-payment-option="ADVANCE"]')).toHaveCount(0);
    } finally {
      const restore = await setMode("COD_AND_ADVANCE");
      expect(restore.ok()).toBeTruthy();
      await sellerApi.dispose();
    }
  });

  test("seller product weight/extra example, pickup thana and delivery-zones info", async ({
    page,
  }) => {
    await setLocale(page, "en");
    await signIn(page, SELLER.email, SELLER.password);
    const productId = await page.evaluate(async () => {
      const response = await fetch("/api/v1/seller/products");
      const body = await response.json();
      return body.data.find((product: { slug: string }) => product.slug === "test-monstera")
        ?.id as string;
    });
    expect(productId).toBeTruthy();
    await page.goto(`/seller/products/${productId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#weightKg")).toBeVisible();
    await expect(page.locator("#extraChargeAfterQty")).toHaveValue("2");
    await expect(page.locator("#extraChargePerUnit")).toHaveValue("10");
    await page.locator("#extraChargeAfterQty").fill("10");
    await page.locator("#extraChargePerUnit").fill("10");
    await expect(page.getByText(/13 in cart/)).toContainText("3 × 10 = 30");
    await assertNoOverflow(page);

    await page.goto("/seller/shop", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#pickupDistrictId")).toBeVisible();
    await expect(page.locator("#pickupThanaId")).toHaveValue(/.+/);
    await expect(page.getByText("Add a pickup district to enable delivery quotes.")).toHaveCount(0);

    await page.goto("/seller/delivery-zones", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Delivery charge is set by the courier rate")).toBeVisible();
    await expect(page.locator('input[id$="-charge"]')).toHaveCount(0);
    await expect(page.getByText("Offer seller-funded free delivery").first()).toBeVisible();
    await assertAxe(page);
  });

  test("admin delivery-rates shows ids, unverified zones, override and CSV dry-run", async ({
    page,
  }) => {
    await setLocale(page, "en");
    await signIn(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/delivery-rates", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("Quote engine health").filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Zone Not Clear").filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("Steadfast id").first()).toBeVisible();
    await expect(page.getByText("Default (unverified)").first()).toBeVisible();
    await expect(page.getByText("Override", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("CSV import / export")).toBeVisible();
    await expect(page.getByText("No rate source is configured")).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertNoOverflow(page);
    await assertAxe(page);
  });

  test("admin shop-order detail shows the delivery snapshot", async ({
    page,
    playwright,
  }) => {
    const buyerApi = await apiContext(playwright);
    const login = await buyerApi.post("/api/v1/auth/login", { data: BUYER1 });
    expect(login.ok()).toBeTruthy();
    await buyerApi.delete("/api/v1/cart");
    await buyerApi.put("/api/v1/cart/items", {
      data: { variantId: V_MONSTERA, quantity: 1 },
    });
    const addresses = await buyerApi.get("/api/v1/addresses");
    const body = await addresses.json();
    const addressId = body.data.find((address: { isDefault: boolean }) => address.isDefault)?.id;
    expect(addressId).toBeTruthy();
    const checkout = await buyerApi.post("/api/v1/checkout", {
      headers: { "Idempotency-Key": randomUUID() },
      data: { addressId, paymentMethod: "COD" },
    });
    expect(checkout.ok()).toBeTruthy();
    const order = await checkout.json();
    const shopOrderId = order.data.shopOrders[0].id as string;
    await buyerApi.dispose();

    await setLocale(page, "en");
    await signIn(page, ADMIN.email, ADMIN.password);
    await page.goto(`/admin/orders/${shopOrderId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Courier charge", { exact: true })).toBeVisible();
    await expect(page.getByText("Parcel weight")).toBeVisible();
    await expect(page.getByText("Quote source")).toBeVisible();
    await assertNoOverflow(page);
    await assertAxe(page);
  });
});



















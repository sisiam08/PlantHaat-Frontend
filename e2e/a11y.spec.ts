import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Axe gate for every customer-facing route. Guest pages use a clean context;
 * authenticated pages log in through the gateway so the cookies are the same
 * ones the browser would receive. Requires the API on :5000 and this app on
 * :3000 (the production build for release checks).
 */
const GUEST_ROUTES = [
  "/",
  "/products",
  "/products/money-tree-bonsai-xokk",
  "/shops",
  "/about",
  "/contact",
  "/how-it-works",
  "/sell-with-us",
  "/cart",
  "/login",
  "/register",
  "/register/seller",
  "/forgot-password",
  "/policies/delivery",
  "/this-page-does-not-exist",
];

const AUTH_ROUTES = [
  "/account",
  "/account/addresses",
  "/account/sessions",
  "/orders",
  "/wishlist",
  "/notifications",
  "/complaints",
  "/complaints/new",
  "/checkout",
  "/not-allowed",
];

test.setTimeout(240_000);

for (const locale of ["bn", "en"] as const) {
  for (const width of [1440, 390] as const) {
    test(`axe ${locale} ${width}`, async ({ browser }) => {
      const guest = await browser.newContext();
      await guest.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      const guestPage = await guest.newPage();
      await guestPage.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const route of GUEST_ROUTES) {
        await guestPage.goto(route, { waitUntil: "networkidle", timeout: 90000 });
        await guestPage.waitForTimeout(250);
        const results = await new AxeBuilder({ page: guestPage }).analyze();
        expect(
          results.violations.map((violation) => ({
            route,
            id: violation.id,
            nodes: violation.nodes.length,
          })),
          `${locale} ${width} ${route}`,
        ).toEqual([]);
      }
      await guest.close();

      const auth = await browser.newContext();
      await auth.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      const authPage = await auth.newPage();
      await authPage.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await authPage.goto("/", { waitUntil: "domcontentloaded" });
      const loginStatus = await authPage.evaluate(async () => {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "customer1@planthaat.test", password: "CustomerDemo1" }),
        });
        return response.status;
      });
      expect(loginStatus).toBe(200);
      const orderId = await authPage.evaluate(async () => {
        const response = await fetch("/api/v1/orders?limit=5");
        if (!response.ok) return undefined;
        const body = (await response.json()) as {
          data?: { id: string; paymentMethod: string }[];
        };
        return (
          body.data?.find((order) => order.paymentMethod === "ADVANCE")?.id ??
          body.data?.[0]?.id
        );
      });
      const routes = [...AUTH_ROUTES];
      if (orderId) {
        routes.push(`/orders/${orderId}`, `/checkout/payment/${orderId}`);
      }

      for (const route of routes) {
        await authPage.goto(route, { waitUntil: "networkidle", timeout: 90000 });
        await authPage.waitForTimeout(250);
        const results = await new AxeBuilder({ page: authPage }).analyze();
        expect(
          results.violations.map((violation) => ({
            route,
            id: violation.id,
            nodes: violation.nodes.length,
          })),
          `${locale} ${width} ${route}`,
        ).toEqual([]);
      }
      await auth.close();
    });
  }
}

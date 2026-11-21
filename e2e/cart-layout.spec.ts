import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer1@planthaat.test", password: "CustomerDemo1" }),
    });
    return response.status;
  });
  expect(status).toBe(200);
}

async function seedCart(page: import("@playwright/test").Page, shops: number) {
  return page.evaluate(async (count) => {
    await fetch("/api/v1/cart", { method: "DELETE" });
    const list = await fetch("/api/v1/products?limit=50").then((r) => r.json());
    const seen = new Set<string>();
    for (const item of list.data) {
      if (seen.size >= count) break;
      const product = await fetch(`/api/v1/products/${item.slug}`).then((r) => r.json());
      const shop = product.data.shop?.id ?? product.data.shopId;
      if (!shop || seen.has(shop)) continue;
      const variant = product.data.variants.find(
        (entry: { stockQty: number }) => entry.stockQty > 0,
      );
      if (!variant) continue;
      seen.add(shop);
      const quantity = product.data.name.includes("Spray Bottle") ? 7 : 1;
      await fetch("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity }),
      });
    }
    return seen.size;
  }, shops);
}

async function measurements(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const summaries = [...document.querySelectorAll("[data-cart-summary]")];
    const checkouts = [
      ...new Set(document.querySelectorAll('a[href="/checkout"], [data-cart-checkout]')),
    ].filter(visible);
    const card = summaries[0]?.closest("[data-slot=card]");
    const content = card?.querySelector("[data-slot=card-content]");
    const children = content
      ? [...content.children].map((element) => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, height: rect.height };
        })
      : [];
    const gaps = children
      .slice(1)
      .map((child, index) =>
        Math.round(child.top - (children[index].top + children[index].height)),
      );
    const lines = [...document.querySelectorAll("[data-cart-line]")].map((line) => {
      const rect = (selector: string) =>
        line.querySelector(selector)?.getBoundingClientRect() ?? null;
      const info = rect("[data-cart-info]")!;
      const stepper = rect("[data-cart-stepper]")!;
      const unit = rect("[data-cart-unit]")!;
      const total = rect("[data-cart-line-total]")!;
      const unitNode = line.querySelector("[data-cart-unit]") as HTMLElement;
      return {
        overlap: !(
          stepper.right <= unit.left ||
          stepper.left >= unit.right ||
          stepper.bottom <= unit.top ||
          stepper.top >= unit.bottom
        ),
        clipped: unitNode.scrollWidth > unitNode.clientWidth + 1,
        stepperRightOfInfo: stepper.left >= info.right - 1,
        stepperLeftOfTotal: stepper.right <= total.left + 1,
      };
    });
    return {
      summaries: summaries.length,
      visibleSummaries: summaries.filter(visible).length,
      checkouts: checkouts.length,
      cardHeight: card ? Math.round(card.getBoundingClientRect().height) : null,
      contentHeight: content ? Math.round(content.scrollHeight) : null,
      gaps,
      lines,
      overflowX: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

for (const locale of ["en", "bn"] as const) {
  for (const width of [1024, 1280, 1440]) {
    test(`cart layout ${locale} ${width}`, async ({ page, context }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      await page.setViewportSize({ width, height: 900 });
      await login(page);
      expect(await seedCart(page, 3)).toBe(3);
      await page.goto("/cart", { waitUntil: "networkidle" });
      await page.waitForTimeout(1800);

      const metrics = await measurements(page);
      expect(metrics.summaries).toBe(1);
      expect(metrics.visibleSummaries).toBe(1);
      expect(metrics.checkouts).toBe(1);
      expect(metrics.cardHeight! - metrics.contentHeight!).toBeLessThanOrEqual(8);
      expect(Math.max(...metrics.gaps)).toBeLessThanOrEqual(28);
      expect(metrics.overflowX).toBe(false);
      for (const line of metrics.lines) {
        expect(line.overlap).toBe(false);
        expect(line.clipped).toBe(false);
        expect(line.stepperRightOfInfo).toBe(true);
        expect(line.stepperLeftOfTotal).toBe(true);
      }
      if (width === 1280) {
        await page.screenshot({
          path: `../.artifacts/cart-checkout/cart-after-owner-scenario-${locale}-1280.png`,
        });
      }
    });
  }
}

for (const width of [360, 390]) {
  test(`cart line mobile overlap ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await seedCart(page, 3);
    await page.goto("/cart", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const metrics = await measurements(page);
    expect(metrics.overflowX).toBe(false);
    for (const line of metrics.lines) {
      expect(line.overlap).toBe(false);
      expect(line.clipped).toBe(false);
    }
    await page.screenshot({ path: `../.artifacts/cart-checkout/cart-mobile-${width}.png` });
  });
}

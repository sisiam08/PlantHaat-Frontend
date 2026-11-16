import { expect, test } from "@playwright/test";

test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

const OWNER_CART = [
  ["spray-bottle-2l-adli", 7],
  ["seed-starter-tray-8372", 1],
  ["garden-gloves-lkcw", 1],
] as const;

async function prepare(page: import("@playwright/test").Page, shops: number, locale: string) {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const loggedIn = await page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer5@planthaat.test", password: "CustomerDemo1" }),
    });
    return response.status;
  });
  expect(loggedIn).toBe(200);

  const seeded = await page.evaluate(
    async ({ count, lines }) => {
      await fetch("/api/v1/cart", { method: "DELETE" });
      const wanted = lines.slice(0, count);
      for (const [slug, quantity] of wanted) {
        const product = await fetch(`/api/v1/products/${slug}`).then((r) => r.json());
        const variant = product.data.variants.find(
          (entry: { stockQty: number }) => entry.stockQty > 0,
        );
        const response = await fetch("/api/v1/cart/items", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ variantId: variant.id, quantity }),
        });
        if (!response.ok) return { lines: 0 };
      }
      return { lines: wanted.length };
    },
    { count: shops, lines: OWNER_CART },
  );
  expect(seeded.lines).toBe(Math.min(shops, OWNER_CART.length));

  if (shops === 6) {
    await page.route("**/api/v1/cart*", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      if (json?.data?.shops?.length === 3) {
        const base = json.data.shops;
        json.data.shops = [
          ...base,
          ...base.map((shop: { shopId: string; shopName: string }, index: number) => ({
            ...shop,
            shopId: `${shop.shopId}-copy-${index}`,
            shopName: `${shop.shopName} ${index + 2}`,
          })),
        ].slice(0, 6);
      }
      await route.fulfill({ response, json });
    });
  }

  await page.goto("/checkout", { waitUntil: "networkidle" });
  await expect(page.locator("[data-checkout-summary]")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function measurements(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const rect = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        width: box.width,
        height: box.height,
      };
    };
    const gap = (first: Element | null, second: Element | null) => {
      const a = rect(first);
      const b = rect(second);
      return a && b ? Math.round(b.top - a.bottom) : null;
    };
    const visible = (element: Element | null) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.top < innerHeight
      );
    };

    const sections = [...document.querySelectorAll("[data-checkout-section]")];
    const title = document.querySelector("main h1");
    const sectionGaps = sections.slice(1).map((section, index) => gap(sections[index], section));
    const headingGaps = sections.map((section) =>
      gap(section.querySelector("h2"), section.querySelector("[data-section-card]")),
    );
    const cards = [...document.querySelectorAll("[data-section-card]")].map((card) => ({
      height: Math.round(card.getBoundingClientRect().height),
      scrollHeight: card.scrollHeight,
    }));
    const place = document.querySelectorAll("[data-place-order], [data-place-order-bar]");
    const summary = document.querySelector("[data-cart-summary]");
    return {
      titleToFirst: gap(title, sections[0] ?? null),
      sectionGaps,
      headingGaps,
      cards,
      summaries: summary ? 1 : 0,
      visibleSummaries: visible(summary) ? 1 : 0,
      visiblePlaceButtons: [...place].filter(visible).length,
      shopGroups: document.querySelectorAll("[data-summary-shop]").length,
      quantityTexts: [...document.querySelectorAll("[data-quantity-line]")].map(
        (element) => element.textContent ?? "",
      ),
      overflowX: document.documentElement.scrollWidth > innerWidth,
      mojibake: /\uFFFD|\u00c3|\u00c2|\u00e2\u20ac|\u00e0\u00a6|\u00e0\u00a7/.test(
        document.body.innerText,
      ),
    };
  });
}

async function stickyChecks(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const points = [0, document.documentElement.scrollHeight / 2, document.documentElement.scrollHeight];
    const results = [];
    for (const y of points) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const place = document.querySelector("[data-place-order]") as HTMLElement | null;
      const back = document.querySelector("[data-back-to-cart]") as HTMLElement | null;
      const hit = (element: HTMLElement | null) => {
        if (!element) return false;
        const box = element.getBoundingClientRect();
        const node = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return node === element || element.contains(node);
      };
      const inside = (element: HTMLElement | null) => {
        if (!element) return false;
        const box = element.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight;
      };
      results.push({
        scrollY: Math.round(window.scrollY),
        placeHit: hit(place),
        backHit: hit(back),
        placeInside: inside(place),
        backInside: inside(back),
      });
    }
    window.scrollTo(0, 0);
    return results;
  });
}

for (const locale of ["en", "bn"] as const) {
  for (const width of [1024, 1280, 1440]) {
    for (const shops of [1, 3, 6]) {
      test(`checkout layout ${locale} ${width} ${shops} shop(s)`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "mobile-chromium", "viewport is set explicitly");
        await page.setViewportSize({ width, height: 800 });
        await prepare(page, shops, locale);

        const metrics = await measurements(page);
        expect(metrics.titleToFirst).toBe(24);
        for (const value of metrics.sectionGaps) expect(value).toBeLessThanOrEqual(40);
        for (const value of metrics.headingGaps) expect(value).toBeLessThanOrEqual(20);
        for (const card of metrics.cards) {
          expect(card.height).toBeLessThanOrEqual(card.scrollHeight + 8);
        }
        expect(metrics.summaries).toBe(1);
        expect(metrics.visibleSummaries).toBe(1);
        expect(metrics.visiblePlaceButtons).toBe(1);
        expect(metrics.shopGroups).toBe(Math.min(shops, 3));
        expect(metrics.overflowX).toBe(false);
        expect(metrics.mojibake).toBe(false);
        const quantityPattern =
          locale === "bn" ? /^পরিমাণ [0-9]+ · প্রতিটি ৳[0-9]/ : /^Qty \d+ · ৳[\d,]+ each$/;
        for (const text of metrics.quantityTexts) {
          expect(text.replace(/\s+/g, " ").trim()).toMatch(quantityPattern);
        }

        if (shops === 6) {
          await expect(
            page.getByRole("button", { name: locale === "bn" ? /সব 6টি দোকান/ : /Show all 6 shops/ }),
          ).toBeVisible();
        }

        const sticky = await stickyChecks(page);
        for (const result of sticky) {
          expect(result.placeHit).toBe(true);
          expect(result.backHit).toBe(true);
          expect(result.placeInside).toBe(true);
          expect(result.backInside).toBe(true);
        }

        if (width === 1280) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(150);
          await page.screenshot({
            path: `../docs/design-review/cart-checkout/checkout-after-fix-${locale}-1280-${shops}shops.png`,
          });
        }
      });
    }
  }

  for (const width of [360, 390]) {
    for (const shops of [1, 3, 6]) {
      test(`checkout mobile ${locale} ${width} ${shops} shop(s)`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "mobile-chromium", "viewport is set explicitly");
        await page.setViewportSize({ width, height: 800 });
        await prepare(page, shops, locale);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(700);

        const metrics = await measurements(page);
        expect(metrics.summaries).toBe(1);
        expect(metrics.visibleSummaries).toBe(1);
        expect(metrics.visiblePlaceButtons).toBe(1);
        expect(metrics.overflowX).toBe(false);
        expect(metrics.mojibake).toBe(false);
        for (const text of metrics.quantityTexts) {
          expect(text.replace(/\s+/g, " ").trim()).toMatch(
            locale === "bn" ? /^পরিমাণ [0-9]+ · প্রতিটি ৳[0-9]/ : /^Qty \d+ · ৳[\d,]+ each$/,
          );
        }

        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(400);
        const top = await page.evaluate(() => {
          const visible = (element: Element | null) => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              box.width > 0 &&
              box.height > 0 &&
              box.bottom > 0 &&
              box.top < innerHeight
            );
          };
          return {
            bar: visible(document.querySelector("[data-place-order-bar]")),
            inFlow: visible(document.querySelector("[data-place-order]")),
          };
        });
        expect(top.bar).toBe(true);
        expect(top.inFlow).toBe(false);

        await page.locator("[data-summary-footer]").scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        const footer = await page.evaluate(() => {
          const visible = (element: Element | null) => {
            if (!element) return false;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              box.width > 0 &&
              box.height > 0 &&
              box.bottom > 0 &&
              box.top < innerHeight
            );
          };
          return {
            bar: visible(document.querySelector("[data-place-order-bar]")),
            inFlow: visible(document.querySelector("[data-place-order]")),
          };
        });
        expect(footer.bar).toBe(false);
        expect(footer.inFlow).toBe(true);

        if (width === 360) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(200);
          await page.screenshot({
            path: `../docs/design-review/cart-checkout/checkout-after-fix-${locale}-360-${shops}shops.png`,
          });
        }
      });
    }
  }
}

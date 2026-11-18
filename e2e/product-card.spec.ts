import { expect, test, type APIRequestContext } from "@playwright/test";

test.setTimeout(180_000);

interface ListProduct {
  name: string;
  slug: string;
  ratingAvg: string;
  ratingCount: number;
}

const NO_REVIEWS = { en: "No reviews yet", bn: "এখনও রিভিউ নেই" } as const;

async function listProducts(request: APIRequestContext): Promise<ListProduct[]> {
  const response = await request.get("/api/v1/products?limit=50&sort=popular");
  expect(response.ok()).toBeTruthy();
  const json = (await response.json()) as { data: ListProduct[] };
  return json.data;
}

for (const locale of ["en", "bn"] as const) {
  for (const width of [360, 1280]) {
    test(`product cards ${locale} ${width}: real rating rows`, async ({ page, context, request }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      await page.setViewportSize({ width, height: 900 });

      const products = await listProducts(request);
      const rated = products.find(
        (product) => product.ratingCount > 0 && Number(product.ratingAvg) > 0,
      );
      const unrated = products.find((product) => product.ratingCount === 0);
      expect(rated, "demo reviews must be seeded (npm run db:seed:demo:reviews)").toBeTruthy();
      expect(unrated, "an unreviewed product is required").toBeTruthy();
      if (!rated || !unrated) throw new Error("rating fixtures are missing");

      // Home rails: at least one reviewed product shows star + average + count.
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const ratedRows = page.locator("[data-card-rating]:not([data-card-rating-empty])");
      await expect(ratedRows.first()).toBeVisible({ timeout: 30_000 });
      const ratedText = (await ratedRows.first().innerText()).replace(/\s+/g, " ").trim();
      expect(ratedText).toMatch(/^[0-5]\.\d ?\(\d+\)$/);
      const ratedAria = await ratedRows.first().getAttribute("aria-label");
      const [average, count] = ratedText.match(/^([0-5]\.\d) ?\((\d+)\)$/)!.slice(1);
      expect(ratedAria).toContain(average);
      expect(ratedAria).toContain(count);
      const filledStar = ratedRows.first().locator("svg").first();
      await expect(filledStar).toHaveClass(/fill-cta/);

      // Unreviewed cards show the muted "No reviews yet" row instead of blank space.
      const emptyRows = page.locator("[data-card-rating-empty]");
      await expect(emptyRows.first()).toBeVisible();
      await expect(emptyRows.first()).toContainText(NO_REVIEWS[locale]);
      await expect(emptyRows.first()).toHaveAttribute("aria-label", NO_REVIEWS[locale]);
      await expect(emptyRows.first().locator("svg").first()).not.toHaveClass(/fill-cta/);

      // Catalog + search: the same rows render for the specific products.
      await page.goto(`/products?q=${encodeURIComponent("aloe")}`, {
        waitUntil: "networkidle",
      });
      const ratedCard = page
        .locator(`a[href$="/products/${rated.slug}"] [data-card-rating]`)
        .first();
      await expect(ratedCard).toBeVisible({ timeout: 30_000 });
      await expect(ratedCard).toContainText(`${Number(rated.ratingAvg).toFixed(1)}`);
      await expect(ratedCard).toContainText(`(${rated.ratingCount})`);

      await page.goto("/products", { waitUntil: "networkidle" });
      const emptyCard = page
        .locator(`a[href$="/products/${unrated.slug}"] [data-card-rating]`)
        .first();
      if (await emptyCard.count()) {
        await expect(emptyCard).toHaveAttribute("data-card-rating-empty", "true");
      }

      // Card heights stay equal across a row (rating row always reserves space).
      const boxes = await page.locator("[data-product-grid] > *").evaluateAll((nodes) => {
        const visible = nodes
          .map((node) => node.getBoundingClientRect())
          .filter((box) => box.width > 0 && box.height > 0);
        if (visible.length === 0) return [];
        const firstTop = visible[0].top;
        return visible
          .filter((box) => Math.abs(box.top - firstTop) < 2)
          .map((box) => box.height);
      });
      expect(boxes.length).toBeGreaterThan(1);
      expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(2);

      await page.goto("/", { waitUntil: "networkidle" });
      await page.screenshot({
        path: `../.artifacts/product-card/home-${locale}-${width}.png`,
      });

      await page.goto("/products?q=aloe", { waitUntil: "networkidle" });
      await page.screenshot({
        path: `../.artifacts/product-card/catalog-${locale}-${width}.png`,
      });
    });
  }
}

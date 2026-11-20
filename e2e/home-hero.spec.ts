import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.setTimeout(180_000);
test.describe.configure({ mode: "default" });

async function openHero(page: Page, locale: "bn" | "en", width: number) {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  await page.addInitScript(() => {
    (window as unknown as { __heroCls?: number }).__heroCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!entry.hadRecentInput) {
          (window as unknown as { __heroCls: number }).__heroCls += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await expect(page.locator("[data-home-hero] h1").first()).toBeVisible({ timeout: 30000 });
}

for (const locale of ["bn", "en"] as const) {
  for (const width of [1440, 768, 390] as const) {
    test(`hero restores the editorial left side at ${width}px (${locale})`, async ({ page }) => {
      await openHero(page, locale, width);

      const audit = await page.evaluate(() => {
        const hero = document.querySelector<HTMLElement>("[data-home-hero]")!;
        const form = hero.querySelector("form")!;
        const card = document.querySelector<HTMLElement>("[data-product-card]");
        return {
          heroHeight: Math.round(hero.getBoundingClientRect().height),
          heading: hero.querySelector("h1")?.textContent?.trim() ?? "",
          formAction: form.getAttribute("action"),
          formMethod: form.getAttribute("method"),
          hasInput: Boolean(hero.querySelector("input[name='q']")),
          hasScope: Boolean(hero.querySelector("select[name='category']")),
          chips: hero.querySelectorAll("a[href^='/products?']").length,
          productCards: hero.querySelectorAll("[data-product-card]").length,
          firstCardTop: card ? Math.round(card.getBoundingClientRect().top) : null,
          overflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cls: (window as unknown as { __heroCls?: number }).__heroCls ?? 0,
          viewport: window.innerHeight,
        };
      });

      expect(audit.heading.length).toBeGreaterThan(0);
      expect(audit.formAction).toBe("/products");
      expect(audit.formMethod).toBe("get");
      expect(audit.hasInput).toBe(true);
      expect(audit.hasScope).toBe(false);
      expect(audit.chips).toBe(0);
      expect(audit.productCards).toBe(0);
      expect(audit.overflow).toBeLessThanOrEqual(1);
      expect(audit.cls).toBeLessThanOrEqual(0.1);
      expect(audit.heroHeight).toBeLessThan(1000);
      if (width <= 390) {
        expect(audit.firstCardTop).not.toBeNull();
        expect(audit.firstCardTop!).toBeLessThan(audit.viewport * 1.55);
      }
    });
  }
}

test("hero search is a native GET form", async ({ page }) => {
  await openHero(page, "en", 390);
  const form = page.locator("[data-home-hero] form");
  await expect(form).toHaveAttribute("action", "/products");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form.locator("input[name='q']")).toHaveAttribute("type", "search");
  await expect(form.locator("button[type='submit']")).toBeVisible();
});

test("hero is axe clean at 1440 and 390", async ({ page }) => {
  for (const width of [1440, 390] as const) {
    await openHero(page, "en", width);
    const results = await new AxeBuilder({ page })
      .include("[data-home-hero]")
      .analyze();
    expect(
      results.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })),
      `hero axe ${width}`,
    ).toEqual([]);
  }
});

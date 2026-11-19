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
    test(`hero is marketplace-first at ${width}px (${locale})`, async ({ page }) => {
      await openHero(page, locale, width);

      const audit = await page.evaluate(() => {
        const hero = document.querySelector<HTMLElement>("[data-home-hero]")!;
        const form = hero.querySelector("form")!;
        const chips = [...hero.querySelectorAll<HTMLAnchorElement>("a[href^='/products?']")];
        const firstProduct = hero.querySelector<HTMLAnchorElement>("a[href^='/products/']");
        return {
          heroTop: Math.round(hero.getBoundingClientRect().top),
          heroHeight: Math.round(hero.getBoundingClientRect().height),
          heading: hero.querySelector("h1")?.textContent?.trim() ?? "",
          formAction: form.getAttribute("action"),
          formMethod: form.getAttribute("method"),
          hasInput: Boolean(hero.querySelector("input[name='q']")),
          hasScope: Boolean(hero.querySelector("select[name='category']")),
          chips: chips.map((chip) => chip.getAttribute("href")),
          firstProductTop: firstProduct
            ? Math.round(firstProduct.getBoundingClientRect().top)
            : null,
          overflow:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cls: (window as unknown as { __heroCls?: number }).__heroCls ?? 0,
        };
      });

      expect(audit.heading.length).toBeGreaterThan(0);
      expect(audit.formAction).toBe("/products");
      expect(audit.formMethod).toBe("get");
      expect(audit.hasInput).toBe(true);
      expect(audit.hasScope).toBe(true);
      expect(audit.chips.length).toBeGreaterThanOrEqual(5);
      expect(audit.overflow).toBeLessThanOrEqual(1);
      expect(audit.cls).toBeLessThanOrEqual(0.1);
      if (width === 390) {
        expect(audit.firstProductTop).not.toBeNull();
        expect(audit.firstProductTop!).toBeLessThan(1000);
        expect(audit.heroHeight).toBeLessThan(560);
      }
      if (width >= 1024) {
        expect(audit.heroHeight).toBeLessThanOrEqual(430);
      } else if (width >= 768) {
        expect(audit.heroHeight).toBeLessThanOrEqual(500);
      }
    });
  }
}

test("hero chips link to real filtered listings", async ({ page }) => {
  await openHero(page, "en", 1280);
  const chip = page.locator("[data-home-hero] a[href='/products?isIndoor=true']").first();
  await expect(chip).toHaveAttribute("href", "/products?isIndoor=true");
  await page.goto("/products?isIndoor=true", { waitUntil: "domcontentloaded", timeout: 90000 });
  await expect(page).toHaveURL(/\/products\?isIndoor=true/);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('main a[href^="/products/"]').first()).toBeVisible({
    timeout: 30000,
  });
});

/**
 * The form itself is a native GET form (no JS submit handler). The app shell is
 * streamed with React Suspense, so a browser with JavaScript fully disabled
 * never reveals streamed sections; that is a framework-level limitation logged
 * in backend/docs/decisions-log.md. The form still works when client JS fails
 * after the HTML is present.
 */
test("hero search is a native GET form", async ({ page }) => {
  await openHero(page, "en", 390);
  const form = page.locator("[data-home-hero] form");
  await expect(form).toHaveAttribute("action", "/products");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form.locator("input[name='q']")).toHaveAttribute("type", "search");
  await expect(form.locator("select[name='category']")).toBeVisible();
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

test("admin hero settings change appears on the home page", async ({ page }) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "ADMIN_EMAIL / ADMIN_PASSWORD are not set for this environment",
  );
  const login = await page.evaluate(
    async ([email, password]) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    [ADMIN_EMAIL, ADMIN_PASSWORD],
  );
  expect(login).toBe(200);

  const original = await page.evaluate(async () => {
    const response = await fetch("/api/v1/admin/settings");
    const json = await response.json();
    return json.data["home.hero.headline"] as { bn: string; en: string };
  });
  const next = { ...original, en: `Marketplace hero ${Date.now()}` };
  try {
    const saved = await page.evaluate(async (value) => {
      const response = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: { "home.hero.headline": value } }),
      });
      return response.status;
    }, next);
    expect(saved).toBe(200);

    await page.context().addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
    await expect(page.locator("[data-home-hero] h1").first()).toHaveText(next.en, { timeout: 30000 });
  } finally {
    await page.evaluate(async (value) => {
      await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: { "home.hero.headline": value } }),
      });
    }, original);
  }
});

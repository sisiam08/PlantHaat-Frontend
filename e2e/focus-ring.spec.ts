import { expect, test, type Page } from "@playwright/test";

/** Reaches an element using real Tab presses so :focus-visible is trustworthy. */
async function tabTo(page: Page, selector: string): Promise<void> {
  for (let index = 0; index < 140; index += 1) {
    await page.keyboard.press("Tab");
    const reached = await page.evaluate(
      (target) => document.activeElement?.matches(target) ?? false,
      selector,
    );
    if (reached) return;
  }
  throw new Error(`tabTo: ${selector} was not reached`);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

function contrastRatio(rgb: string, background = [255, 255, 255]): number {
  const values = rgb.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  const linear = values.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const bg = background.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const bgLuminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  const lighter = Math.max(luminance, bgLuminance);
  const darker = Math.min(luminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test("product card: mouse click then Back leaves no ring", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const card = page.locator('[data-product-card]').first();
  await card.waitFor({ state: "visible" });
  const borderBefore = await card.evaluate((element) => getComputedStyle(element).borderTopColor);

  await card.locator('a[href^="/products/"]').first().click();
  await page.waitForURL(/\/products\//, { timeout: 30_000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await card.waitFor({ state: "visible" });
  await page.waitForTimeout(400);

  const after = await card.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      borderColor: style.borderTopColor,
    };
  });
  expect(after.boxShadow.includes("inset"), "no ring after mouse click + Back").toBe(false);
  expect(after.outlineStyle).toBe("none");
  expect(after.borderColor).toBe(borderBefore);
  await page.screenshot({ path: "../.artifacts/focus-ring/card-after-back-1280.png" });
});

test("product card: Tab shows exactly one inset ring with 3:1 contrast", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const rail = page
    .locator("[data-rail-scroller]")
    .filter({ has: page.locator("[data-product-card]") })
    .first();
  await rail.waitFor({ state: "visible" });
  await page.keyboard.press("Tab");
  const productLink = page.locator('[data-product-card] a[href^="/products/"]').first();
  await productLink.focus();
  await expect(productLink).toBeFocused();

  const wrapper = page.locator('[data-product-card]').first();
  const styles = await wrapper.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      ringColor:
        style.boxShadow.match(/(rgba?\([^)]+\))\s+0px 0px 0px [1-9]\d*px inset/)?.[1] ?? null,
      inset: style.boxShadow.includes("inset"),
      linkOutline: getComputedStyle(element.querySelector("a")!).outlineStyle,
    };
  });
  expect(styles.inset, "ring is inset so the rail cannot clip it").toBe(true);
  expect(styles.boxShadow).not.toBe("none");
  expect(styles.linkOutline, "the anchor must not add a second indicator").toBe("none");
  expect(styles.ringColor).not.toBeNull();
  expect(contrastRatio(styles.ringColor!)).toBeGreaterThanOrEqual(3);

  const fullyInsideRail = await wrapper.evaluate((element) => {
    const rail = element.closest("[data-rail-scroller]");
    if (!rail) return true;
    const card = element.getBoundingClientRect();
    const box = rail.getBoundingClientRect();
    return card.top >= box.top - 1 && card.bottom <= box.bottom + 1;
  });
  expect(fullyInsideRail, "ring is not clipped by the rail").toBe(true);
  await page.screenshot({ path: "../.artifacts/focus-ring/card-keyboard-1280.png" });
});

test("category tile and shop card share the keyboard-only ring", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tabTo(page, "[data-category-tile]");
  const tileRing = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    return {
      shadow: style.boxShadow,
      outline: style.outlineStyle,
      ringColor:
        style.boxShadow.match(/(rgba?\([^)]+\))\s+0px 0px 0px [1-9]\d*px inset/)?.[1] ?? null,
    };
  });
  expect(tileRing.shadow.includes("inset")).toBe(true);
  expect(tileRing.outline).toBe("none");
  expect(tileRing.ringColor).not.toBeNull();
  expect(contrastRatio(tileRing.ringColor!)).toBeGreaterThanOrEqual(3);

  await page.goto("/shops", { waitUntil: "domcontentloaded" });
  const shopCount = await page.locator('a[href^="/shops/"]').count();
  if (shopCount > 0) {
    await tabTo(page, 'a[href^="/shops/"]');
    const shopRing = await page.evaluate(() => {
      const element = (document.activeElement as HTMLElement).parentElement!;
      return getComputedStyle(element).boxShadow;
    });
    expect(shopRing).toContain("inset");
  }
});

test("wishlist heart keeps a single button ring", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tabTo(page, "[data-card-wishlist]");
  const result = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);
    const wrapper = element.closest("[data-product-card]");
    return {
      shadow: style.boxShadow,
      outline: style.outlineStyle,
      wrapperShadow: wrapper ? getComputedStyle(wrapper).boxShadow : "",
    };
  });
  expect(result.shadow).not.toBe("none");
  expect(result.wrapperShadow.includes("inset"), "wrapper must not ring").toBe(false);
});

test.describe("touch", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tap leaves no ring", async ({ page, context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
    ]);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const card = page.locator('[data-product-card]').first();
    await card.waitFor({ state: "visible" });
    const borderBefore = await card.evaluate((element) => getComputedStyle(element).borderTopColor);
    await card.locator('a[href^="/products/"]').first().tap();
    await page.waitForURL(/\/products\//, { timeout: 30_000 });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await card.waitFor({ state: "visible" });
    const after = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
        borderColor: style.borderTopColor,
      };
    });
    expect(after.boxShadow.includes("inset")).toBe(false);
    expect(after.outlineStyle).toBe("none");
    expect(after.borderColor).toBe(borderBefore);
  });
});



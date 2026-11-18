import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

const LABELS = {
  en: { show: "Show password", hide: "Hide password" },
  bn: { show: "পাসওয়ার্ড দেখান", hide: "পাসওয়ার্ড লুকান" },
} as const;

async function clsWhile(page: Page, action: () => Promise<void>) {
  await page.evaluate(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!entry.hadRecentInput) {
          (window as unknown as { __cls: number }).__cls += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await action();
  await page.waitForTimeout(300);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

for (const locale of ["en", "bn"] as const) {
  for (const width of [360, 1280]) {
    test(`password toggle ${locale} ${width}`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 900 });
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const form = document.querySelector("form");
        return form !== null && !form.hasAttribute("inert");
      });

      const input = page.locator('input[autocomplete="current-password"]');
      const toggle = page.locator("[data-password-toggle]");
      await expect(input).toHaveAttribute("type", "password");
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toHaveAttribute("aria-label", LABELS[locale].show);
      await expect(toggle).toHaveAttribute("aria-pressed", "false");

      const box = await toggle.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

      const cls = await clsWhile(page, async () => {
        await input.fill("Sup3rSecretValue");
        await input.focus();
        await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(4, 4));
        await toggle.click();
      });
      expect(cls).toBeLessThanOrEqual(0.01);

      await expect(input).toHaveAttribute("type", "text");
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(toggle).toHaveAttribute("aria-label", LABELS[locale].hide);
      expect(await input.evaluate((element) => document.activeElement === element)).toBe(true);
      expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(4);
      expect(page.url()).not.toContain("Sup3rSecretValue");

      // Space on the focused toggle flips back.
      await toggle.focus();
      await page.keyboard.press("Space");
      await expect(input).toHaveAttribute("type", "password");
      await expect(toggle).toHaveAttribute("aria-pressed", "false");

      // Only one eye: the native Edge reveal is hidden by CSS.
      const hasNativeHider = await page.evaluate(async () => {
        const inline = Array.from(document.querySelectorAll("style")).some((style) =>
          style.textContent?.includes("::-ms-reveal"),
        );
        if (inline) return true;
        for (const link of Array.from(
          document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
        )) {
          try {
            const text = await (await fetch(link.href)).text();
            if (text.includes("::-ms-reveal")) return true;
          } catch {
            // ignore unreachable sheet
          }
        }
        return false;
      });
      expect(hasNativeHider).toBe(true);

      // The toggle must never submit the form, and Enter must submit once.
      let logins = 0;
      await page.route("**/api/v1/auth/login", async (route) => {
        logins += 1;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            statusCode: 401,
            error: { code: "INVALID_CREDENTIALS", message: "Invalid" },
          }),
        });
      });
      await page.locator('input[autocomplete="email"]').fill("someone@example.test");
      await input.fill("Sup3rSecretValue");
      await toggle.click();
      await page.waitForTimeout(400);
      expect(logins).toBe(0);
      await input.press("Enter");
      await expect.poll(() => logins, { timeout: 10_000 }).toBe(1);
    });
  }
}

test("register: both password fields toggle independently", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return form !== null && !form.hasAttribute("inert");
  });

  const fields = page.locator('input[autocomplete="new-password"]');
  await expect(fields).toHaveCount(2);
  const toggles = page.locator("[data-password-toggle]");
  await expect(toggles).toHaveCount(2);

  await fields.nth(0).fill("FirstPass1");
  await fields.nth(1).fill("SecondPass2");
  await toggles.nth(0).click();
  await expect(fields.nth(0)).toHaveAttribute("type", "text");
  await expect(fields.nth(1)).toHaveAttribute("type", "password");
  await expect(fields.nth(0)).toHaveValue("FirstPass1");
  await expect(fields.nth(1)).toHaveValue("SecondPass2");
});

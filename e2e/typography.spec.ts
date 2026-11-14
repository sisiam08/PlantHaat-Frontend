import { expect, test } from "@playwright/test";

const ALLOWED = new Set(["Inter", "Hind Siliguri"]);
const LOCALES = ["bn", "en"] as const;
const SLUG = "spray-bottle-2l-adli";

for (const locale of LOCALES) {
  test.describe(`typography ${locale}`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test.beforeEach(async ({ context }) => {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
      ]);
    });

    for (const [name, path] of [
      ["home", "/"],
      ["catalog", "/products"],
      ["pdp", `/products/${SLUG}`],
      ["cart", "/cart"],
    ] as const) {
      test(`${name}: no italic, no synthesis, only Inter/Hind`, async ({ page, context }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1200);
        await page.evaluate(() => document.fonts.ready);

        const cdp = await context.newCDPSession(page);
        await cdp.send("DOM.enable");
        await cdp.send("CSS.enable");

        const bad = await page.evaluate(() => {
          const out: string[] = [];
          for (const el of Array.from(document.querySelectorAll("body *"))) {
            if (!(el instanceof HTMLElement)) continue;
            if (el.closest("nextjs-portal") || el.tagName.startsWith("NEXTJS")) continue;
            if (["SCRIPT","STYLE","svg","path"].includes(el.tagName)) continue;
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") continue;
            if (style.fontStyle === "italic" || style.fontStyle === "oblique") {
              out.push(`italic: ${el.tagName}.${el.className}`);
            }
            if (style.fontSynthesisStyle !== "none") {
              out.push(`synthesis: ${el.tagName}.${el.className}`);
            }
            if (/Fraunces|Tiro Bangla/i.test(style.fontFamily)) {
              out.push(`removed family: ${el.tagName}.${el.className}`);
            }
          }
          return out.slice(0, 10);
        });
        expect(bad, bad.join("\n")).toEqual([]);

        const selectors = ["h1", "h2", "a[href^='/products/']", "button"];
        for (const selector of selectors) {
          const count = await page.locator(selector).count();
          if (count === 0) continue;
          const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
          const { nodeId } = await cdp.send("DOM.querySelector", {
            nodeId: root.nodeId,
            selector,
          });
          if (!nodeId) continue;
          const fonts = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
          for (const font of fonts.fonts) {
            expect(
              [...ALLOWED].some((name) => font.familyName.startsWith(name)),
              `${selector} rendered with ${font.familyName}`,
            ).toBe(true);
          }
        }
      });
    }
  });
}



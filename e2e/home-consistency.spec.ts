import { expect, test, type Page } from "@playwright/test";

const RHYTHM = { 390: 32, 1280: 64 } as const;

async function openHome(page: Page, locale: "bn" | "en", width: number) {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: locale, domain: "localhost", path: "/" },
  ]);
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#home-categories")).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const locale of ["bn", "en"] as const) {
  for (const width of [1280, 390] as const) {
    test(`home rhythm and headings are consistent at ${width}px (${locale})`, async ({
      page,
    }) => {
      await openHome(page, locale, width);
      await page.waitForTimeout(800);

      const audit = await page.evaluate((expectedPad) => {
        const hero = document.querySelector("[data-home-hero]") as HTMLElement;
        const sections = [...document.querySelectorAll<HTMLElement>("[data-home-section]")].filter(
          (section) => section.offsetHeight > 0,
        );
        const firstContent = (section: HTMLElement) =>
          section.firstElementChild?.firstElementChild as HTMLElement | null;
        const content = (section: HTMLElement) => section.firstElementChild as HTMLElement;

        const pads = sections.map((section) =>
          Math.round(parseFloat(getComputedStyle(content(section)).paddingTop)),
        );
        const gaps = sections.map((section, index) => {
          const previous = index === 0 ? hero : sections[index - 1];
          const node = firstContent(section);
          if (!node) return null;
          return Math.round(
            node.getBoundingClientRect().top - previous.getBoundingClientRect().bottom,
          );
        });
        const headings = [
          ...document.querySelectorAll<HTMLElement>("[data-section-heading]"),
        ].map((heading) => {
          const style = getComputedStyle(heading);
          const rect = heading.getBoundingClientRect();
          return {
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            fontWeight: style.fontWeight,
            left: Math.round(rect.left),
          };
        });
        const actions = [...document.querySelectorAll<HTMLElement>("[data-section-action]")].map(
          (action) => {
            const rect = action.getBoundingClientRect();
            const section = action.closest("[data-home-section]") as HTMLElement;
            const contentNode = content(section);
            const contentBox = contentNode.getBoundingClientRect();
            const padRight = parseFloat(getComputedStyle(contentNode).paddingRight);
            return {
              height: Math.round(rect.height),
              rightGap: Math.round(contentBox.right - padRight - rect.right),
            };
          },
        );
        const heroHeading = hero.querySelector("h1")!.getBoundingClientRect();
        const header = document.querySelector("header > div") as HTMLElement;
        const footer = document.querySelector("footer > div") as HTMLElement;

        return {
          expectedPad,
          pads,
          gaps,
          headings,
          actions,
          heroLeft: Math.round(heroHeading.left),
          headingLeft: headings[0]?.left,
          headerPad: Math.round(parseFloat(getComputedStyle(header).paddingLeft)),
          footerPad: Math.round(parseFloat(getComputedStyle(footer).paddingLeft)),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, RHYTHM[width]);

      expect(audit.overflow).toBeLessThanOrEqual(1);
      expect(new Set(audit.pads)).toEqual(new Set([RHYTHM[width]]));
      expect(audit.gaps.every((gap) => gap !== null && Math.abs(gap - RHYTHM[width]) <= 1)).toBe(
        true,
      );
      expect(audit.headings.length).toBeGreaterThanOrEqual(7);
      expect(new Set(audit.headings.map((heading) => heading.fontSize))).toEqual(
        new Set([width === 390 ? "24px" : "30px"]),
      );
      expect(new Set(audit.headings.map((heading) => heading.fontWeight))).toEqual(
        new Set(["600"]),
      );
      expect(new Set(audit.headings.map((heading) => heading.left))).toEqual(
        new Set([audit.headingLeft]),
      );
      expect(audit.actions.length).toBeGreaterThan(0);
      expect(audit.actions.every((action) => action.height >= 44)).toBe(true);
      expect(new Set(audit.actions.map((action) => action.rightGap))).toEqual(new Set([0]));
      expect(audit.heroLeft).toBe(audit.headingLeft);
      expect(audit.headerPad).toBe(16);
      expect(audit.footerPad).toBe(16);
    });
  }
}

type RowMetric = { count: number; leftGap: number; rightGap: number };

async function measureRows(page: Page): Promise<RowMetric[]> {
  return page.evaluate(() => {
    const rail = document.querySelector<HTMLElement>(
      "#category-fixture [data-rail-scroller]",
    )!;
    const tiles = [...rail.querySelectorAll<HTMLElement>("[data-category-tile], [data-category-all]")];
    const railRect = rail.getBoundingClientRect();
    const rows = new Map<number, HTMLElement[]>();
    for (const tile of tiles) {
      const top = Math.round(tile.getBoundingClientRect().top);
      rows.set(top, [...(rows.get(top) ?? []), tile]);
    }
    return [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, nodes]) => {
        const lefts = nodes.map((node) => node.getBoundingClientRect().left);
        const rights = nodes.map((node) => node.getBoundingClientRect().right);
        return {
          count: nodes.length,
          leftGap: Math.round(Math.min(...lefts) - railRect.left),
          rightGap: Math.round(railRect.right - Math.max(...rights)),
        };
      });
  });
}

function expectCentered(rows: RowMetric[]) {
  for (const row of rows) {
    expect(Math.abs(row.leftGap - row.rightGap)).toBeLessThanOrEqual(2);
  }
}

test("category tiles fill and center the last row for 3/7/11/12 counts", async ({ page }) => {
  await openHome(page, "bn", 1280);
  const section = page.locator('section[aria-labelledby="home-categories"]');
  await expect(section.locator("[data-category-tile]")).toHaveCount(11);
  await expect(section.locator("[data-category-all]")).toHaveCount(1);

  // Clone the live section into a non-React fixture so the count variants can
  // mutate freely without React restoring the original tree.
  await page.evaluate(() => {
    const source = document.querySelector('section[aria-labelledby="home-categories"]')!;
    const fixture = document.createElement("div");
    fixture.id = "category-fixture";
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    fixture.append(clone);
    document.body.append(fixture);
  });

  const live = await measureRows(page);
  expect(live.map((row) => row.count)).toEqual([6, 6]);
  expectCentered(live);

  // The counts below use the cloned live DOM as layout fixtures; React's
  // conditional All-tile plan is covered by tests/category-tiles.test.ts.
  const original = await page.evaluate(
    () => document.querySelector("#category-fixture [data-rail-scroller]")!.innerHTML,
  );
  const reset = async (mutate: "three" | "seven" | "eleven" | "twelve") => {
    await page.evaluate((html) => {
      document.querySelector("#category-fixture [data-rail-scroller]")!.innerHTML = html;
    }, original);
    await page.evaluate((mode) => {
      const rail = document.querySelector("#category-fixture [data-rail-scroller]")!;
      const tiles = [...rail.querySelectorAll<HTMLElement>("[data-category-tile]")];
      if (mode === "three") tiles.slice(3).forEach((tile) => tile.remove());
      if (mode === "seven") tiles.slice(7).forEach((tile) => tile.remove());
      if (mode === "eleven" || mode === "twelve") {
        rail.querySelector("[data-category-all]")?.remove();
        if (mode === "twelve") {
          const last = tiles.at(-1)!;
          last.after(last.cloneNode(true));
        }
      }
    }, mutate);
    await page.waitForTimeout(120);
    return measureRows(page);
  };

  const three = await reset("three");
  expect(three.map((row) => row.count)).toEqual([4]);
  expectCentered(three);

  const seven = await reset("seven");
  expect(seven.map((row) => row.count)).toEqual([6, 2]);
  expectCentered(seven);

  const eleven = await reset("eleven");
  expect(eleven.map((row) => row.count)).toEqual([6, 5]);
  expectCentered(eleven);

  const twelve = await reset("twelve");
  expect(twelve.map((row) => row.count)).toEqual([6, 6]);
  expectCentered(twelve);
});

test("category rail arrows appear on tablet and stay out of the mobile rail", async ({ page }) => {
  await openHome(page, "bn", 768);
  const section = page.locator('section[aria-labelledby="home-categories"]');
  await expect(section.locator('[data-rail-arrow="prev"]')).toBeVisible();
  await expect(section.locator('[data-rail-arrow="next"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(section.locator('[data-rail-arrow="prev"]')).toBeHidden();
  await expect(section.locator('[data-rail-arrow="next"]')).toBeHidden();
});

test("server-rendered home rails are present and never repeat adjacent products", async ({
  page,
}) => {
  await openHome(page, "bn", 1280);

  // The first three rails are server-rendered; keep this assertion deterministic.
  // The two lazy client rails use the same curation helper (unit-tested in
  // tests/home-rail-products.test.ts) and intentionally mount below the fold.
  const rails = await page.evaluate(() => {
    const ids = ["rail-trending", "rail-newArrivals", "rail-under500"];
    return ids.map((id) => {
      const section = document.querySelector<HTMLElement>(
        `section[aria-labelledby="${id}"]`,
      )!;
      return {
        id,
        products: [...section.querySelectorAll<HTMLAnchorElement>('a[href^="/products/"]')].map(
          (link) => link.getAttribute("href"),
        ),
      };
    });
  });

  for (const rail of rails) {
    expect(rail.products.length).toBeGreaterThan(0);
    expect(new Set(rail.products).size).toBe(rail.products.length);
  }
  for (let index = 1; index < rails.length; index += 1) {
    const previous = new Set(rails[index - 1].products);
    const duplicates = rails[index].products.filter((product) => previous.has(product!));
    expect(duplicates, `${rails[index].id} repeats ${rails[index - 1].id}`).toEqual([]);
  }
});

# Customer-facing design audit (consolidated)

Last verified: 2026-11-18 · Branch `redesign/phase2` · Scope: public and customer-facing pages. Seller/admin share components but are intentionally not restyled in this pass.

This is the single canonical audit. It merges the former `consistency/AUDIT.md` and `home-consistency/AUDIT.md`; obsolete before/after screenshot tables were dropped. Screenshots and raw measurements were temporary agent evidence and are not committed.

## 1. Method and evidence

- Headed Playwright at 1440, 1280, 768, 390 and 360 px in bn/en; DOM inventory with `getComputedStyle` and `getBoundingClientRect`; axe-core at 1440/390.
- Research: `ui-ux-pro-max`, Baymard product/checkout/cart guidance, WCAG 2.2 AA, PlantHaat light-only forest/marigold tokens, Inter + Hind Siliguri, Latin digits with the taka sign before amounts.
- Automated gates: `e2e/design-conformance.spec.ts`, `e2e/home-consistency.spec.ts`, `e2e/a11y.spec.ts`, `e2e/overflow.spec.ts`, `e2e/typography.spec.ts`, Vitest message/category/rail tests.

## 2. System decisions (current)

| Pattern | Decision | Rationale |
|---|---|---|
| Page header | `PageHeader`: breadcrumb/back slot + one `h1` (24 px mobile / 30 px md, 700) + description + right actions | Removes 20/24/30/48 px h1 drift; one scannable title |
| Page container | `PageContainer`: shared `mx-auto px-4 py-8 lg:py-12`; widths wide 7xl, reading 5xl, form 3xl, narrow 2xl | Same edge/rhythm; narrow tiers remain intentional for forms |
| Section header | `SectionHeader`: 24/30 px, 600, optional 44 px "View all" + arrow | One section hierarchy on home/related/shop sections |
| Landmarks | `SiteShell` owns the only `<main id="main">`; pages do not nest `<main>` | Fixes invalid nested landmarks and the skip link |
| Auth | `AuthCard` has a real `h1`; forms are inert and Submit disabled until hydration; CTA stays marigold; links 44 px | One-h1, no credentials in the URL before hydration |
| Static/error | `StaticPage` uses `PageHeader`/`PageContainer`; not-found and error are localized with "Back to home" | Consistent title scale and actionable copy |
| Empty/error | `EmptyState` and `QueryError` with a real retry; stale data stays with a retry banner | No plain "No data"/"error" fragments |
| Targets | Primary/nav/footer/auth controls ≥44 px; visible focus rings | WCAG 2.2 + project rule |
| Copy | One term per concept ("Cart", "Log in", "All products"); localized payment labels; one date formatter | Removes contradictory labels and raw enums |

## 3. Current findings by page cluster

- **Home:** one shared rhythm, all 11 categories + All categories, five curated plants-only rails with sparse-rail hiding (`HOME_RAIL_MIN = 4`), one Highlights band, accurate "All products" feed. Remaining weakness is data: category/product images are mostly the shared seed placeholder, and the first product card is below the mobile fold (~1056 px at 390).
- **Catalog/search:** `PageHeader` and filters read as one page; 2-up mobile cards, 44 px filter/sort, rating row, no shop name on the card. Product photos remain data-blocked.
- **PDP:** breadcrumb, one `h1`, price/stock, 44 px marigold Add to cart, visible variant controls, gallery carousel label, mobile sticky CTA clears the bottom nav. Policy/read-more links are 44 px.
- **Shops:** `PageHeader` + grid; localized pagination; shop detail uses the shared card and section header.
- **Cart/checkout:** one summary card, sticky CTA, empty cart uses the shared empty state (no zero-total form), summary capped to the viewport with a focusable scroll area. Detailed cart/checkout findings live in `cart-checkout.md`.
- **Orders/account:** localized payment label and date, 44 px secondary links, shared empty/error states; sessions revoke is 44 px.
- **Notifications:** 44 px title hit area; repeated seeded text is data, not UI.
- **Complaints/wishlist:** shared empty/error; one info-card heading size; review/question forms and wishlist cards consistent.
- **Auth/seller apply:** auth layout owns `<main>`; seller apply has a main landmark; login/register cards use 44 px targets.
- **Seller/admin (out of scope):** dark-ink `DashboardShell`, compact 36 px controls. Shared `Price`/`ProductLine`/`QueryError`/`EmptyState` props are preserved.

## 4. Resolved issues (kept as the finding record)

1. **New arrivals disappeared** because the backend returned the same order for `popular` and `newest` and cross-rail dedupe removed every card. Fixed by fetching 50 candidates, curating plants/in-stock, excluding prior ids and taking 8.
2. **Under-৳500 rail had 2 cards**; fixed to 8 unique cards. Rails were dominated by accessories; fixed with `home-rail-products.ts`.
3. **Home edges/rhythm disagreed** (32 vs 16 px; 24/40/48 gaps); fixed with `HomeSection` (32/48/64) and `px-4`.
4. **Rail headings/actions were 20 px targets**; fixed with `SectionHeader` and 44 px actions with the same arrow/focus ring.
5. **Category orphan row / no tablet arrows** with 11 categories; fixed with centered flex wrapping, conditional All categories tile and shared md arrows.
6. **"All plants" feed contained non-plants**; renamed to **All products** with an honest subtitle.
7. **Nested `<main>` landmarks / missing auth h1 / small auth links**; fixed as described in system decisions.
8. **Pre-hydration auth submit** navigated to `/login` with credentials in the URL; forms are now inert until hydrated and use `method="post"` as a native fallback.
9. **Raw payment enum in order detail**; mapped to the localized Cash on delivery / Advance payment label.
10. **Empty checkout rendered a ৳0 form**; now shows the shared empty state with Browse plants.
11. **Duplicate cart summary at ≥lg** showed two summaries; one summary instance remains, mobile bar is separate and observer-hidden.
12. **Checkout vertical stretch** created 150–240 px perceived gaps; fixed with `items-start`/`self-start`/`content-start`, 24 px section rhythm and content-height cards.
13. **axe issues** (PDP target size, checkout radio label, combobox `aria-controls`, sidebar label contrast, nested main) resolved; the customer routes are axe-clean at 1440/390 bn/en.
14. **Home rails duplicate/sparse**; adjacent-rail dedupe and `HOME_RAIL_MIN = 4` keep only honest, distinct rails (Low light is hidden at 3 unique plants; Pet safe stays at 5).

## 5. Automated/conformance status

- Home: `e2e/home-consistency.spec.ts` (rhythm, category 3/7/11/12, tablet arrows, disjoint rails) and Vitest category/rail tests; axe clean in bn/en at 1440/390.
- Design/a11y: `e2e/design-conformance.spec.ts` (copy/encoding, Latin price digits, taka position, heading scale, header/footer targets, duplicate-free rails) and `e2e/a11y.spec.ts`.
- Overflow/typography: 0 horizontal overflow across the six widths; typography enforced by `e2e/typography.spec.ts` (see `typography.md`).
- Production build and the serial Playwright suites are recorded in `backend/docs/progress.md`.

## 6. Remaining / owner needs

- Real photos: 11 category images (square ≥600×600), hero cutouts/plates, and 6–8 clean 4:5 product photos. Never fabricate or hotlink.
- Owner banner copy still repeats the hero/trust promise.
- Seller/admin adoption of `PageHeader`/`PageContainer` is deferred.
- Cart/checkout CLS (~0.4) and checkout LCP 4.3 s remain performance work; see `performance.md`.
- Mobile fold: the first product card starts around 1056 px at 390 because category discovery is intentionally above the feed.

## 7. Contrast gate (retained values)

Computed WCAG relative-luminance ratios for the final token pairings: ink on paper 15.49, ink on white 16.89, ink on cream 13.70, forest on white 9.73, white on forest 9.73, cream on ink 13.70, marigold-foreground on paper 6.01, ink on CTA 8.22, white on offer 4.98, white on success 5.04, white on info 6.00, warning-fg on warning-bg 6.12, input on paper 4.04, input on white 4.40, input on cream 3.57. Text ≥4.5:1 and control borders ≥3:1 pass.

## 8. Historical QA rounds (written findings only)

- **Phase 2 visual QA (2026-11-13):** fixed PDP 360 overflow, bright-green placeholder blur, dead lazy-rail space, filter-sheet footer padding, duplicate 768 search, admin single-point GMV block, seller 360 KPI density, zero-review rating, combobox/ARIA and target-size issues; 10/10 pages axe-clean; TBT improved from 10.7 s to 1.93 s by delegating card actions. Budgets (LCP, JS) remained missed; see `performance.md`.
- **Home QA round 2 (2026-11-14):** paper-toned placeholders, 6-tile category bento/96 px mobile rail, merged trust/how-it-works band, rail dedupe, full-bleed hero, campaign band, Inter/Hind typography. Remaining weaknesses were seed imagery and sparse rails.
- **Cart/checkout rounds:** see `cart-checkout.md` for the defect/fix record and measured rhythm.

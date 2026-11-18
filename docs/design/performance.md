# Performance findings (consolidated)

Last verified: 2026-11-18 · Production build on `:3000`, API `:5000`, `:3100` off · Branch `redesign/phase2`.

This replaces the earlier standalone PERF/README tables. Raw Lighthouse/PerformanceObserver JSON dumps were temporary evidence and are not committed.

## Method

- Production build (`next build`, Next 16.4.6, Turbopack) served with `next start -p 3000`.
- Chromium via Playwright, headless, mobile viewport 390×844, DPR 1, mobile/touch UA.
- Fresh context per run; cache disabled; 5 runs per route.
- CDP `Network.emulateNetworkConditions`: Slow 4G (1.6 Mbps down, 750 Kbps up, 150 ms RTT).
- CDP `Emulation.setCPUThrottlingRate`: 4×.
- Metrics via buffered `PerformanceObserver` (LCP, layout-shift, longtask) + Resource/Navigation Timing after 5 s settle.
- TBT proxy = Σ(longtask duration − 50 ms). INP was not measured (no interactions during load).
- CPU calibration equivalent to `benchmarkIndex`: fixed 6,000,000-iteration loop; median ~59 ms for both builds.
- Lighthouse CLI was **not installed** (no-new-dependency rule); CDP provided the throttling and calibration. LCP element is reported by the observer; JS/font/image KB are Resource Timing `transferSize`.

## Results — current (`060e368` + owner working tree) vs pre-consistency (`c3a0255`)

| Route | Build | LCP median (min–max) | TBT median | CLS | JS KB | Fonts KB | Images KB | LCP element |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Home `/` | current | **2304 ms** (2236–2592) | 1156 ms | 0.0015 | 392 | 190 | 131 | H1 "আপনার ঘর সবুজে ভরে তুলুন" |
| Home `/` | pre | **2092 ms** (1968–2144) | 906 ms | 0.0015 | 392 | 190 | 176 | same H1 |
| Catalog `/products` | current | **3024 ms** (2976–3416) | 1379 ms | 0.0002 | 423 | 190 | 54 | product-card IMG |
| Catalog `/products` | pre | **3164 ms** (2984–3192) | 1645 ms | 0.0003 | 421 | 190 | 54 | product-card IMG |
| PDP `/products/[slug]` | current | **2148 ms** (2088–3036) | 1120 ms | 0.0005 | 447 | 190 | 0 | gallery IMG |
| PDP `/products/[slug]` | pre | **2356 ms** (2244–2812) | 1673 ms | 0.0008 | 446 | 190 | 0 | gallery IMG |
| Cart `/cart` (logged in) | current | **1768 ms** (1732–1820) | 824 ms | **0.4235** | 487 | 190 | 2 | line/empty-state P |
| Cart `/cart` (pre) | pre | **1816 ms** (1752–1940) | 1166 ms | **0.4171** | 499 | 190 | 2 | same P |
| Checkout `/checkout` (logged in) | current | **4300 ms** (4268–5044) | 968 ms | **0.3984** | 482 | 190 | 0 | summary SPAN |
| Checkout `/checkout` (pre) | pre | **4768 ms** (4660–4844) | 979 ms | **0.4629** | 491 | 190 | 0 | summary SPAN |

## Verdict

- Catalog −140 ms, PDP −208 ms, checkout −468 ms LCP; TBT lower on catalog/PDP and JS slightly smaller. The consistency/merchandising work did **not** cause a broad regression.
- Home is ~+212 ms (+10%) LCP and ~+250 ms TBT versus pre-consistency. A 7-run recheck gave 2344 ms median (2264–2640, one 36.8 s cold-start outlier excluded). The hero H1 is unchanged; the cost is added merchandising DOM/hydration, not fonts/images/JS bytes. Home is still under the 2.5 s LCP target.
- Cart/checkout CLS is genuinely high (~0.42/0.40) in both builds. Checkout improved (0.46 → 0.40) but the root cause remains: client-rendered summary/address/cart content replaces skeletons.

## Above the fold

- Home: H1 + badge + search + hero composition; 131 KB images, 190 KB fonts, 392 KB JS.
- Catalog: first row of product-card images; 54 KB images, 423 KB JS.
- PDP: gallery image (`priority`, responsive `sizes`), 447 KB JS.
- Cart/checkout: no above-fold imagery; 482–487 KB JS; LCP is text that appears after client data.

## Prioritised remaining work

1. **Checkout/cart CLS (~0.4):** reserve summary/address/cart-line geometry and avoid skeleton→content swap without a fixed min-height.
2. **Checkout LCP 4.3 s:** the LCP span is a client-rendered summary line; server-render a stable first summary line or reserve geometry.
3. **Catalog LCP 3.0 s:** first-row product image over Slow 4G; already uses responsive `sizes`; consider `priority` for the first 2–3 cards after verifying it does not delay fonts.
4. **Home +0.2 s:** merchandising DOM/hydration. No low-risk code lever beyond the already-present single font preload per locale and correct `sizes`; reverting approved sections is not appropriate.
5. **Fonts 190 KB:** one Inter variable + one/two Hind weights; subsetting is a larger program.

No code change was made in the re-baseline session. The two low-risk levers (preload the LCP font once per locale; correct `sizes`) are already in place and verified in the shipped HTML/build.

## Earlier batch P measurements (historical, retained as findings)

Lighthouse 12, mobile, CPU 4×, Slow 4G simulated, production `next start`, median of 3. The highest-cost item was font transfer (416→337→192 KB as unused faces were removed). Final batch P numbers: home 47 / LCP 5.27 s / TBT 2.76 s / JS 453 KB / fonts 192 KB; PDP 41 / 7.67 s / 3.33 s / 464 KB. LCP was font- and (on PDP) image/render-delay bound; JS was ~453/464 KB against a 150 KB budget. These older numbers are not directly comparable with the 2026-11-18 table above.

## 2026-11-18 money-path pass - cart/checkout CLS and checkout LCP

Method unchanged (production build served on `:3000`, API `:5000`, `:3100` off, Chromium via Playwright, 390x844 and 1280x800, Slow 4G via CDP + 4x CPU, cache disabled, 5 runs, medians). Working tree on `redesign/phase2`; dev server restored and `.next-prod` deleted afterwards.

| Route | CLS before | CLS after | LCP before | LCP after |
|---|---:|---:|---:|---:|
| Cart en 390 | 0.4594 | **0.0108** | 1768 ms | 1880 ms |
| Cart en 1280 | 0.2272 | **0.0088** | 3468 ms | 1956 ms |
| Cart bn 390 | 0.4600 | **0.0042** | 1674 ms | 3740 ms (text/IMG, not a target) |
| Cart bn 1280 | 0.3847 | **0.0094** | 4370 ms | 2024 ms |
| Checkout en 390 | 0.3997 | **0.0083** | 4078 ms | **1860 ms** |
| Checkout en 1280 | 0.2231 | **0.0073** | 3826 ms | **1832 ms** |
| Checkout bn 390 | 0.3984 | **0.0093** | 4334 ms | **1916 ms** |
| Checkout bn 1280 | 0.2223 | **0.0080** | 4284 ms | **1992 ms** |

Additional checks: guest cart at 390 CLS 0; checkout with 6 shops (client cart response duplicated by route interception) CLS 0.0083; Advance payment page exercised by the 12/12 payments-advance suite on the isolated stack. Every route/ locale is at or below the 0.1 CLS target and all checkout LCP medians are below 2.5 s on this method.

### Root causes (layout-shift sources)

- Cart: the loading state was a single 160 px skeleton. When the 3-shop cart arrived the footer/header moved hundreds of px (largest source, 0.40 on mobile). The per-shop free-delivery bar also appeared after the delivery quote (20-34 px card growth).
- Checkout: addresses rendered as an empty "add address" form before the query resolved and were replaced by address cards; the advance option and the summary appeared after public settings/cart; the summary skeleton was 96 px against a ~430 px card. The dominant source moved the summary from y=0 to ~592 px.
- Fonts: Inter was `swap`, so the H1 repainted larger at ~2.6 s under Slow 4G. It is now `optional` with a metric-matched `Inter Fallback` (size-adjust 107.64%, ascent 90.49%, descent 22.48%).

### Fixes (presentation/loading only)

- Cart/checkout server-render the first paint: cart summary and the delivery-neutral checkout cart preview are fetched server-side with the session cookie, then the district quote refreshes in place (`placeholderData`, no collapse). Addresses and public settings are server-provided too.
- Checkout keeps the previous/preview summary and shows "Updating delivery..." instead of collapsing; Place order is disabled while the quote is a placeholder.
- Reserved geometry: tall cart shell (min one viewport), three shop-card skeletons, 430 px checkout summary skeleton, one address-card skeleton, advance-option placeholder, min-heights on the delivery line and free-delivery bar.
- No quote/address strings are inserted above existing content after first paint; only text values change in place.

### Remaining LCP cost (evidence)

Server streaming measured directly: the checkout HTML body/H1 starts at 0.7-1.4 s (addresses/settings/cart preview are parallel server calls; the old sequential district cart call took up to 2.8 s and was removed from the critical path). The rest of the LCP is render-path cost on Slow 4G: 149 KB uncompressed route CSS, 26 script chunks, and the Bangla logo face (Hind 600, ~75 KB) that is not preloaded in the English locale. That is the next program (CSS/chunk reduction, font preload policy); no product code change was made for it in this pass.

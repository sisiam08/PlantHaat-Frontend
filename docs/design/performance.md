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

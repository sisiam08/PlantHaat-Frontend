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

## 2026-11-19 home hero (marketplace hero)

Method unchanged: production build (`NEXT_DIST_DIR=.next-prod`), `next start -p 3200`, API `:5000`, `:3100` off, Chromium headless, 390x844, DPR 1, mobile UA, Slow 4G + 4x CPU via CDP, cache disabled, 5 runs, medians.

| Home 390 | Before | After |
|---|---:|---:|
| LCP en | 6740 ms | **3288 ms** (2236-3784) |
| LCP bn | 5584 ms | **3584 ms** (2784-4788) |
| CLS | 0 | 0 |
| TBT proxy | 6004 / 6583 ms | **2282 / 1906 ms** |
| JS gzip | 363 KB | 363 KB |
| LCP element | paragraph / H1 text | H1 / subheadline text |

The hero no longer includes the motion/parallax composition, and real product cards replace the decorative plates. LCP improved by ~51% (en) and ~36% (bn) on this method and did not regress; JS bytes are unchanged. The static Highlights banner image (218 KB) was still on the page during this measurement; Part B replaces it with the admin-managed section and image variants.

## 2026-11-19 Home Highlights slider

Method unchanged (production `next start` on `:3200`, API `:5000`, 390x844 and 1440x900, Slow 4G + 4x CPU, 5 runs, medians). Three imported slides were active; the section is below the fold.

| Viewport | LCP en | LCP bn | CLS | TBT proxy | JS gzip | Images |
|---|---:|---:|---:|---:|---:|---:|
| 390 | **2832 ms** | **3044 ms** | 0 | 1872 / 1821 ms | 356 KB | 217 / 191 KB |
| 1440 | **2968 ms** | **3140 ms** | 0 / 0.0001 | 2085 / 1704 ms | 356 KB | 295 / 269 KB |

Compared with the Part A hero measurement (390 en 3288 ms, bn 3584 ms; images 430/404 KB), the
admin-managed slider improved LCP by ~14-15% and image bytes by ~50%; JS bytes stayed flat (356 vs
363 KB). CLS is 0 on mobile and ~0 on desktop.

Section image evidence (Cloudinary `f_auto,q_auto,c_limit`):
- 390: only the mobile variant is requested (`w_640`, ~22 KB for the imported first slide); the
  desktop variant is not requested.
- 1440: only the desktop variant is requested (`w_1920`, ~77 KB for the same slide).
- Off-screen slides 2 and 3 are not requested until selected; the next slide's image is loaded when
  the carousel navigates.

Element/JS checks: the first slide is visible without carousel JavaScript; with 3 slides, the Embla
chunk loads only when the section is within 300 px of the viewport. A single-slide/e2e state produced
zero `embla`/carousel requests.

## 2026-11-20 Real plant hero scene

Method unchanged: production build served on `:3000`, API `:5000`, `:3100` off, Chromium headless, 390x844 and 1440x900, Slow 4G (1.6/0.75 Mbps, 150 ms RTT) + 4x CPU via CDP, cache disabled, 5 runs, medians.

| Home | Before this task (marketplace hero) | Real-plant hero |
|---|---:|---:|
| LCP en 390 | 2832 ms | **2904 ms** (2476-3688) |
| LCP bn 390 | 3044 ms | **3124 ms** (2232-3600) |
| LCP en 1440 | 2968 ms | **3452 ms** (2632-4048) |
| LCP bn 1440 | 3140 ms | **3716 ms** (3480-4272) |
| CLS | 0 / 0.0001 | **0 / 0** |
| TBT proxy 390 | 1872 / 1821 ms | 2240 / 2919 ms |
| TBT proxy 1440 | 2085 / 1704 ms | 2476 / 2813 ms |
| JS gzip | 356 KB | **332 KB** |
| Images 390 | 217 / 191 KB | **111 KB** |
| Images 1440 | 295 / 269 KB | **190 KB** |

- The palm is now the LCP candidate (`/hero/palm*.webp`) and is preloaded with `imageSrcSet`/`imageSizes` plus 287w/383w/480w/639w variants; the 390 network uses the ~25 KB mobile variant, 1440 uses the ~57 KB medium variant. The 1440 LCP is ~15% later than the old text LCP because a large image paints after the hero text; this is the documented trade-off for the requested real-plant scene.
- Static scene bytes: monstera 43.6 KB, palm 104.3 KB, snake 21.1 KB, calathea 35.0 KB = **204 KB desktop** (under the 260 KB budget); mobile/medium variants are 25-57 KB. The source photos are not committed.
- WebGL: no library JS; the island is ~2 KB gzip. Textures upload sequentially with a rAF yield, DPR <=1.5, frame cap 45/30 fps, paused off-screen/hidden, adaptive DPR and static fallback. TBT is higher than the old text hero (texture upload/decode), but no single init task is allowed to become a long task; the scene remains static for reduced motion/save-data/no-WebGL.
- CLS is 0: the stage aspect box and both text/scene columns are reserved before images paint.

## 2026-11-20 Hero fixes: sway longevity, 11:10 stage, AVIF

**Sway (A).** Real Chrome (`channel: chrome`) 60 s logs on dev and production: mode stayed `webgl`,
frames increased every second (prod 14 -> 1806, dev 0 -> 1768), DPR 1, raw rAF EMA ~16.7 ms after
the first second. The old bug was the adaptive monitor reading the interval between *drawn* frames
(33 ms at a 45 fps cap). The monitor now samples raw rAF ticks before the throttle, ignores >250 ms
gaps and the first 3 s, drops DPR after sustained >28 ms for 3 s, and goes static only after
sustained >150 ms for 5 s. The 150/5 s static threshold is a deliberate deviation from the suggested
40 ms/3 s: on this 4x-CPU environment the raw tick is 70-100 ms but 10-17 fps still animates, and the
acceptance test requires webgl after 15 s. Unit tests cover the 60 Hz/45 fps cap (no degrade), 80 ms
(DPR only), 160 ms (static) and warmup/ignore gaps.

**Stage (B).** The plants/shadows now live in a fixed 11:10 inner box; the outer stage is 300 px tall
on phones, 420 px on tablets and the desktop aspect box otherwise, centered. Pot-center/stage-height
ratios at 360/390/412/768/899/1280/1440 differ from 1440 by at most **0.14%** (target 3%). At 360/390
the stage bottom is 772 px against a 774 px bottom-nav top; the visible pot bases sit above the nav
and the search is at ~424 px (above the fold).

**Edge feather (C).** The builder checks the outer 1% alpha bands for every plant. Palm counts:
left 22, right 27, top 57, bottom 348; left/right/top are feathered over 4% (bottom is the pot base
and is intentionally not feathered). 2x cream crops of the palm right side before/after show no hard
vertical cut; the feather is acceptable for the supplied source. If the owner wants the tips that
were beyond the original 1333 px canvas, supply an uncropped palm with >=3% transparent margin on
every side and rerun `node scripts/build-hero-assets.mjs`.

**AVIF (D).** All four plants use `<picture>` with AVIF primary and WebP fallback; palm visible height
600 px (padded 672 px), AVIF q50 (visually checked against the recommended 55-60 because q55/58 were
not smaller than WebP on this alpha-heavy source). Scene bytes: desktop AVIF 136.7 KB (WebP 169.8
KB), mobile palm 19 KB, desktop palm medium 40 KB. The palm preload uses AVIF `imagesrcset`/
`imagesizes`; Chrome downloads only the AVIF variant.

| Home, prod, 5 runs | Before task | After fixes |
|---|---:|---:|
| LCP en/bn 390 | 2832 / 3044 ms | **2632 / 3040 ms** |
| LCP en/bn 1440 | 2968 / 3140 ms | **3116-3208 / 3384-3904 ms** |
| CLS | 0 | **0** |
| JS gzip | 356 KB | **332-358 KB** |
| Images 390 | 217 / 191 KB | **114 KB** |
| Images 1440 | 295 / 269 KB | **193 KB** |

Mobile is flat or better; desktop en is ~5% over the old LCP and bn is ~8-24% over in this noisy
low-end environment. The remaining desktop cost is render delay (the palm paints after the hero
text/fonts), not transfer. Goal within 5% is met for en at the low end of the range but not
consistently; documented rather than cutting the owner-requested palm.

## 2026-11-21 spot check (no code change)

Production `.next-test` on `:3002`, test API `:5001`, Chromium headless, CDP Slow 4G (1.6/0.75 Mbps, 150 ms RTT) + 4x CPU, cache disabled, 5 runs. This is a **spot check**, not a replacement for the full program; no performance code was changed in this pass.

| Home | 390x844 | 1440x900 |
|---|---:|---:|
| LCP median | 2656 ms (2476-3212) | 3240 ms (2516-3692) |
| LCP vs last documented median | 2632 ms (+24 ms) | 3116-3208 ms (+32 ms low end) |
| CLS | 0.0001 | 0.0001 |
| Script transfer (all script responses + headers) | 401 KB | 401 KB |

The 401 KB is the sum of `transferSize` for every script response including headers; the earlier 332-358 KB figure used the build/previous accounting and is not directly comparable. No change was kept because no median improved. P1-1 remains open: the next pass should re-run the full matrix, split first-party bootstrap vs lazy chunks, and try deferring `/auth/me`, the realtime socket and the toaster on public pages with measured deltas.

## 2026-11-21 ITEM 2 performance programme

### Method and baseline

Production build (`NEXT_DIST_DIR=.next-prod`, Next 16.4.6/Turbopack) served with `next start -p 3000` after stopping the dev server; API `:5000`; `:3100` off. Chromium via Playwright, headless, real Chrome channel, fresh context per route/locale/viewport, browser cache disabled through CDP, Slow 4G (1.6 Mbps down / 0.75 up, 150 ms RTT), CPU 4x. Metrics from buffered PerformanceObserver + Resource Timing after 8 s settle; **5 runs**, medians. Routes: home, catalog, PDP (`/products/money-tree-bonsai-xokk`), cart (logged in, 2 shops), checkout (logged in); 390x844 and 1440x900; bn and en.

Baseline (before this programme) and final (after the kept changes) are the same method and the same database/API.

| Route | Viewport | LCP bn before -> after | LCP en before -> after | CLS max | JS gzip before -> after | Fonts (CSS) before -> after | Images before -> after | Chunks |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Home | 390 | 3496 -> **2856 ms** | 3208 -> **2388 ms** | 0.006 | 417 -> 417 KB | 120/146 -> 123/3 KB | 136 KB | 29 |
| Home | 1440 | 4660 -> **2872 ms** | 3160 -> **2868 ms** | 0.0003 | 417 -> 417 KB | 120/146 -> 123/3 KB | 238 KB | 29 |
| Catalog | 390 | 3552 -> **2512 ms** | 2972 -> **2444 ms** | 0.0055 | 432 -> 432 KB | 120/146 -> 123/3 KB | 37 -> 56 KB | 30 |
| Catalog | 1440 | 4072 -> 4256 ms | 3868 -> 4204 ms | 0.0071 | 432 -> 432/404 KB | 120/146 -> 123/3 KB | 240 -> 280 KB | 25-30 |
| PDP | 390 | 3236 -> 3264 ms | 2684 -> 4308 ms | 0.001 | 457 -> 457 KB | 120/146 -> 123/3 KB | 12 -> 30 KB | 33 |
| PDP | 1440 | 2736 -> 3768 ms | 2408 -> 3176 ms | 0.0003 | 457 -> 457 KB | 120/146 -> 123/3 KB | 12 -> 52 KB | 33 |
| Cart | 390 | 3532 -> 4328 ms | 2276 -> 2152 ms | 0.0114 | 402 -> 402 KB | 120/146 -> 123/3 KB | 2 -> 21 KB | 27 |
| Cart | 1440 | 3208 -> 3500 ms | 2204 -> 2260 ms | 0.0057 | 402 -> 402 KB | 120/146 -> 123/3 KB | 2 -> 42 KB | 27 |
| Checkout | 390 | 3540 -> 4092 ms | 2276 -> **2088 ms** | 0.0099 | 467 -> 467 KB | 120/146 -> 123/3 KB | 0 -> 19 KB | 34 |
| Checkout | 1440 | 2580 -> 2716 ms | 2232 -> 2240 ms | 0.0242 | 467 -> 467 KB | 120/146 -> 123/3 KB | 0 -> 40 KB | 34 |

- LCP element: home palm AVIF; catalog product image; PDP gallery image; cart text/line image; checkout summary/address/H1 (locale-dependent). Home LCP breakdown after: load delay 52-100 ms en / 95-2217 ms bn, render delay 1.2-1.6 s. PDP image LCP after 390 en: CDN load delay 4.9 s in the final run (direct Cloudinary TTFB varied 0.4-3.9 s across three checks).
- CSS: one render-blocking stylesheet, 24.4 KB transfer home/checkout, 26.1 KB catalog/PDP/cart. Fonts column is Resource Timing for CSS-initiated font files; Inter is a preload (`link`), so the true English font total fell from **195 KB to 51.6 KB** (Inter 48.6 + Taka 3.0), while Bangla is **198 KB** (Hind 400+600 + Inter + Taka). CLS stayed <= 0.0114 on every measured route.
- The PDP/cart/checkout 1440 regressions are image-CDN/load-delay driven, not code paths changed here: no image URL, `sizes`, cart or checkout code changed, and the same URLs measured 0.4-4 s Cloudinary TTFB during the final window. Kept changes are judged on routes they touch (home/catalog) and on bytes.

### Backend latency, test API `:5001` (`planthaat_test`)

Sequential requests, 20 warm requests each, first request after process start as cold; total response time (not DB-only).

| Endpoint | Cold | p50 | p95 |
|---|---:|---:|---:|
| `/health` | 165 ms | 55 ms | 70 ms |
| `/home` | 107 ms | 106 ms | 112 ms |
| `/categories` | 658 ms | 55 ms | 61 ms |
| `/products?limit=12` | 373 ms | **356 ms** | **385 ms** |
| `/products/test-mint-pot` | 704 ms | 159 ms | 163 ms |
| `/settings/public` | 67 ms | 2 ms | 4 ms |

`/products` is the clear warm endpoint cost; no N+1/index change was made because `BACKEND_CHANGE_REQUESTS.md` contains no verified N+1/index proposal and an index/migration would need EXPLAIN evidence. Home/categories/settings are cached in the Next server; the catalog first page is cached with `use cache` and tagged.

### Bundle analyzer (built-in `next analyze -o`)

Top 10 client contributors by compressed graph size (includes async graph; not the same accounting as transfer bytes):

| Home | Compressed | PDP add-on | Compressed |
|---|---:|---|---:|
| react-dom-client | 62.4 KB | react-dom-client | 62.4 KB |
| Next polyfills | 38.5 KB | Next polyfills | 38.5 KB |
| globals.css | 23.4 KB | globals.css | 23.4 KB |
| react-hook-form | 11.0 KB | react-hook-form | 11.0 KB |
| sonner | 9.2 KB | yet-another-react-lightbox | 10.1 KB |
| zod core schemas | 8.8 KB | sonner | 9.2 KB |
| react-server-dom | 7.6 KB | zod core schemas | 8.8 KB |
| embla-carousel | 6.7 KB | product-engagement (QA) | 8.6 KB |
| segment-cache | 6.3 KB | react-server-dom | 7.6 KB |
| cn engine | 5.6 KB | embla-carousel | 6.7 KB |

### Candidates: kept and reverted

- **Kept - early hero preload.** The palm preload was emitted at byte ~286,885 of the streamed home HTML because it lived inside `HeroScene` after the highlights/settings reads. A static `HeroPreload` now emits it at byte ~302 (head/early shell), and the duplicate link inside the scene was removed. Home LCP: **-18%/-26% at 390 bn/en, -38%/-9% at 1440 bn/en**; load delay fell to 52-100 ms en. Composition unchanged.
- **Kept - Taka/Latin font isolation.** English pages were downloading Hind 400+600 (146 KB) only for `৳` and the `বাং` toggle label. A 3 KB Hind subset (U+09F3 + বাং glyphs) is now the first font for those glyphs and for every price/heading taka; English loads Inter 48.6 + Taka 3.0 KB and **no full Hind**. Bangla keeps Hind as required. No layout/CLS change; typography suite stays green. LCP effect on English was positive on 390 (-216 ms in the isolated font run) and noisy at 1440 before the hero fix.
- **Kept - catalog first-row image priority.** The first four cards use `priority`; catalog 390 LCP improved -29%/-18% (bn/en) and 1440 improved in the isolated run (-328/-128 ms). Final 1440 was slower from a cold Cloudinary variant; mobile remains a clear win and the extra bytes are first-row images.
- **Reverted - session-expired dialog split.** Dynamically importing the dialog+form removed RHF/zod from the graph but Next fetched the dynamic chunk during first load: JS transfer **+11 KB**, chunks 29->30, home LCP 2824/2232 vs 2856/2388 (no improvement), TBT noisy. Reverted rather than keep a chunk-count/byte regression.
- **Not applied - auth/realtime/toaster deferral.** The realtime socket is already created only for authenticated users; `/auth/me` drives the no-flash header and cannot be skipped without a stale-guest window; deferring the toaster/provider only moved code after hydration with no measured win and risked missing early toasts. No safe change kept.
- **Not applied - CSS/chunk reduction.** One render-blocking CSS file (24-26 KB transfer) and 25-34 route chunks; no unused-CSS or manual chunk lever exists without a broad refactor or a new dependency. The session split was the evaluated route-split lever and failed its JS budget.
- **Not applied - server includeTotal/caching/index.** Rails already omit totals; categories/home are `use cache` tagged; the only explicit total is the catalog label. `/products` warm p50 356 ms remains the backend bottleneck but has no verified safe index/N+1 change in the change-request file.

### Guards added

- `npm run check:bundle` (`scripts/check-bundle-budget.mjs`) reads the client-reference manifests + root main files from `NEXT_DIST_DIR`, gzips every referenced chunk and enforces: `/` 400 KB, `/products` 415 KB, `/products/[slug]` 430 KB, `/cart` 395 KB, `/checkout` 385 KB. Current: 372/386/403/371/360 KB.
- `e2e/cls.spec.ts` now also measures home at 390 and 1440 in bn/en (header/auth state included), alongside the existing slowed-API cart/checkout checks.

### Remaining bottlenecks

1. Home render delay (~1.2-1.6 s) and hydration/TBT; React DOM/Next runtime dominate the graph. Further gains need a deliberate hydration/route-splitting programme, not a micro-change.
2. Catalog/PDP image LCP depends on Cloudinary TTFB (0.4-4 s observed); preload/sizes are correct. Use a CDN warm-up or an owner-approved image host/SLA check before launch.
3. English font transfer is now 51.6 KB; Bangla remains 198 KB (Hind 400/600 + Inter). Static Inter weights instead of the variable face is the next safe byte lever.
4. `/products` API warm p50 356 ms; profile with EXPLAIN ANALYZE before adding an index/migration.
5. Checkout 1440 CLS 0.024 (under 0.1) remains the highest CLS route; no regression from this pass.

## 2026-11-22 ITEM 5 - regression bisect and cart LCP

### Method: record-and-replay images

The earlier comparison used live Cloudinary requests; that made image LCP depend on CDN TTFB and could not isolate code. This pass records every image response once into a local cache (`route.fulfill` with the recorded bytes/content-type), then serves it from memory/disk for every measured run. The document TTFB and the LCP resource TTFB are reported separately; measured image TTFB is 0-46 ms after replay. Browser cache remains disabled; Slow 4G 1.6/0.75 Mbps + 150 ms RTT and 4x CPU are unchanged.

- Same `customer1@planthaat.test` session and same cart/product for every commit; API `:5000`; production build per commit; 7 runs, median/min/max; fresh browser context per run.
- LCP element + breakdown: document TTFB, resource start/request/response/end, resource TTFB, resource load duration, render delay.
- CLS, TBT proxy (long tasks > 50 ms), JS/CSS/font/image transfer bytes, chunk count and image request TTFB are recorded.
- Raw result files are temporary `.artifacts/perf5/` evidence and were deleted after the written report.

### Git-worktree bisect (7-run medians, image replay)

| Route / viewport | Commit | LCP bn | LCP en | CLS | Notes |
|---|---|---:|---:|---:|---|
| Catalog 1440 | before font/priority (`a0ab6a7`) | 3064 | 2768 | 0.007 | image load 2737/2637, no priority |
| Catalog 1440 | font/priority commit (`214482e`) | 3396 | 4164 | 0.007 | image load 2881/3484; the isolated run showed a catalog slowdown |
| Catalog 1440 | current tip (`16f17d5`) | **2460** | **2508** | 0.007 | same public priority/font code; regression was not reproducible |
| PDP 1440 | before | 3032 | 2452 | 0.0001 | render delay 2597/1949 |
| PDP 1440 | font commit | 2964 | 2504 | 0.0001 | no regression |
| PDP 1440 | current | **2636** | **2440** | 0.0001 | no regression |
| Cart 390 | before | 2788 | 2232 | 0.0113 | image LCP in bn |
| Cart 390 | font commit | 2688 | 2204 | 0.0113 | no regression |
| Cart 390 | current before cart fix | 3344 | 2268 | 0.0113 | bn image started late |
| Checkout 390 | before | 2260 | 2292 | 0.0100 | text LCP |
| Checkout 390 | font commit | 2436 | 2160 | 0.0099 | within noise |
| Checkout 390 | current | **2424** | **2224** | 0.0099 | within target |

The earlier reported PDP/cart/checkout regressions do **not** reproduce when the image network is replayed. The one font-commit catalog anomaly did not survive on the current tip with the same public font/priority code; it is a server/build/CDN artifact, not a repeatable font or priority cause. The bisect therefore rejects the "font changed every route" hypothesis as the cause of the persistent cart/checkout/PDP numbers.

### Cart fix kept

Cart bn LCP was an image that started after hydration and painted late. A server-side `preload()` for the first cart line image (using the server-rendered cart) plus `priority` on that first line reduced the median from **2600/3344 to 2408 ms** (range 2208-3592), and en stayed at **2172 ms**. This is the only app code change kept in this pass. No other route code was changed.

### Final numbers (current production build, 7 runs)

| Route | 390 bn / en LCP | 390 CLS | 1440 bn / en LCP | 1440 CLS | Target |
|---|---:|---:|---:|---:|---|
| Home | 3116 / 3052 | 0.0019 | 3372 / 3152 (recheck 2924/2896) | 0.0002 | no regression |
| Catalog | 2668 / 2460 | 0.0015 | 2884 / 2976 | 0.007 | desktop back to earlier |
| PDP | 2656 / 2264 | 0.0019 | 2688 / **2532** | 0.0001 | desktop back to earlier |
| Cart | **2408 / 2172** | 0.0048/0.0113 | 2396 / 2172 | 0.007/0.0063 | <=2.5 s 390 |
| Checkout | **2252 / 2128** | 0.0099/0.0089 | 2324 / 2132 | 0.0066/0.0056 | <=2.5 s 390 |

- Cart and checkout now meet the 390 en/bn target; CLS is <=0.0113.
- Catalog 1440 is back below 3.0 s; PDP en 1440 is 2532 ms, 5% above the old 2408 ms median (bn is better) and within the measured run range. PDP LCP is image-render-delay bound (image load 368 ms, render delay 2.2 s), not font/image transfer.
- Home remains in its documented 2.9-3.4 s band; no code in this pass changes home.
- The guard `e2e/performance.spec.ts` enforces cart/checkout 2.75 s (target 2.5 + 10% margin), PDP/catalog 3.3 s, home 3.8 s using the same image replay and CDP settings. It passes 5.3 min serial. `npm run check:bundle` remains green.

### Remaining

- PDP/Catalog desktop LCP is still hydration/render-delay bound; Cloudinary TTFB is controlled in the guard, so this is no longer the explanation for regressions but remains a production risk.
- Cart bn 2408 ms has a 2208-3592 ms range; the target is met by median, not every run.
- Bangla fonts remain 198 KB; static Inter weights are still the next byte lever.

### Admin and seller dashboard baselines (Phase 1, 2026-11-22)

Method unchanged from the table above: production build (`NEXT_DIST_DIR=.next-prod`) served by `next start` on `:3000`, API `:5000`, `:3100` off, real Chrome via Playwright (`channel: chrome`), CDP Slow 4G (1.6/0.75 Mbps, 150 ms RTT) + 4x CPU, cache disabled, `bn` locale, 5 runs, medians. LCP from a buffered `largest-contentful-paint` observer, CLS from `layout-shift` without recent input, TBT proxy = sum(longtask duration - 50 ms), JS = sum of script `transferSize` (compressed transfer, headers included), API p50/p95 from same-origin `/api/v1/*` `PerformanceResourceTiming` durations. Login is a real admin/seller session created against the running API; no credentials are recorded.

| Role | Route | Viewport | LCP | TBT proxy | CLS | JS transfer | API p50 / p95 |
|---|---|---|---:|---:|---:|---:|---:|
| admin | `/admin` | 1440x900 | 1816 ms | 136 ms | 0 | 462 KB | 643 / 2578 ms |
| admin | `/admin` | 390x844 | 1728 ms | 196 ms | 0.001 | 391 KB | 668 / 2267 ms |
| admin | `/admin/orders` | 1440x900 | 7152 ms | 132 ms | 0 | 446 KB | 704 / 2793 ms |
| admin | `/admin/complaints` | 1440x900 | 1856 ms | 301 ms | 0 | 466 KB | 514 / 1511 ms |
| admin | `/admin/reconciliation` | 1440x900 | 5984 ms | 172 ms | 0 | 462 KB | 735 / 2338 ms |
| seller | `/seller/dashboard` | 1440x900 | 1816 ms | 323 ms | 0.004 | 451 KB | 231 / 1853 ms |
| seller | `/seller/dashboard` | 390x844 | 1744 ms | 102 ms | 0.009 | 399 KB | 224 / 1353 ms |
| seller | `/seller/orders` | 390x844 | 5584 ms | 50 ms | 0.001 | 371 KB | 502 / 2975 ms |
| seller | `/seller/earnings` | 390x844 | 4988 ms | 304 ms | 0.001 | 379 KB | 501 / 1086 ms |
| seller | `/seller/analytics` | 1440x900 | 1796 ms | 43 ms | 0 | 451 KB | 552 / 1399 ms |

- Public routes are unchanged by this work: `check:bundle` reports home 373 / catalog 387 / PDP 403 / cart 372 / checkout 360 KB gzip, identical to the documented storefront numbers. Admin and seller dashboard budgets are 500 KB each (measured 352 / 351 KB for the route manifests; the larger transfer figures above include the shared root chunks plus font/image transfer in the resource timing sum).
- The 5-7 s LCP rows (`/admin/orders`, `/admin/reconciliation`, `/seller/orders`, `/seller/earnings`) are **pre-redesign baselines**: their LCP element is table/content text that arrives after the API response, and API p95 is 1.1-3.0 s largely from the Neon pooler in `ap-southeast-1`. Phase 2/3 must keep or improve these while adding charts; Phase 4 re-measures with the same method.
- TBT stays 43-323 ms and CLS <= 0.009 on every dashboard route, so charts are not competing with the main thread at load.

## 2026-11-22 Admin dashboard Phase 2 (redesign + slow-page fixes)

Method unchanged from the Phase 1 baseline: production build (`NEXT_DIST_DIR=.next-test`) served by `next start` on `:3002`, isolated API `:5001` (`planthaat_test` with the synthetic dashboard-kit data), real Chrome (`channel: chrome`), CDP Slow 4G (1.6/0.75 Mbps, 150 ms RTT) + 4x CPU, cache disabled, `bn` locale, 5 runs, medians. The 390 set is 390x844 and the 1440 set is 1440x900. LCP/CLS/TBT and API p50/p95 are measured exactly as in the Phase 1 table.

| Route | Viewport | LCP before (Phase 1, dev DB) | LCP after (isolated rich data) | TBT after | CLS after | API p50/p95 after | JS transfer |
|---|---|---:|---:|---:|---:|---:|---:|
| `/admin` | 1440 | 1816 ms | **3600 ms** (3468-4268) | 2024 ms | 0.0001 | 454 / 835 ms | 504 KB |
| `/admin` | 390 | 1728 ms | **3300 ms** (3032-6608) | 1676 ms | 0.0013 | 263 / 1464 ms | 409 KB |
| `/admin/orders` | 1440 | **7152 ms** | **3764 ms** (3036-4996) | 1537 ms | 0.0001 | 246 / 449 ms | 483 KB |
| `/admin/orders` | 390 | (no baseline) | **3332 ms** (2904-5180) | 1530 ms | 0.0013 | 252 / 503 ms | 385 KB |
| `/admin/reconciliation` | 1440 | **5984 ms** | **2124 ms** (2044-2280) | 1395 ms | 0.0138 | 372 / 826 ms | 465 KB |
| `/admin/reconciliation` | 390 | (no baseline) | **1992 ms** (1920-2124) | 1172 ms | 0.0062 | 327 / 1020 ms | 379 KB |
| `/admin/complaints` | 1440 | 1856 ms | **4444 ms** (2608-6032) | 1417 ms | 0.0002 | 272 / 774 ms | 485 KB |
| `/admin/complaints` | 390 | (no baseline) | **2840 ms** (2652-4556) | 1321 ms | 0.0013 | 235 / 642 ms | 386 KB |
| `/admin/commission-rules` | 1440 | (no baseline) | **4392 ms** (2572-6132) | 1420 ms | 0.0004 | 267 / 646 ms | 506 KB |
| `/admin/commission-rules` | 390 | (no baseline) | **2616 ms** (2584-2716) | 1259 ms | 0.0014 | 256 / 385 ms | 389 KB |
| `/admin/settings` | 1440 | (no baseline) | **5932 ms** (5568-7480) | 1568 ms | 0.0001 | 261 / 409 ms | 483 KB |
| `/admin/settings` | 390 | (no baseline) | **5440 ms** (5424-5820) | 1618 ms | 0.0013 | 298 / 685 ms | 385 KB |

What changed and why:

- `/admin/orders` is now server-rendered for the first page with the `view=summary` projection and the panels pre-fetched in the same request; LCP improved 47% at 1440. API p95 fell from 2793 ms to 449 ms because the list no longer loads status history/payments/proofs per row.
- `/admin/reconciliation` is below the 2.5 s target at both widths (2124/1992 ms); the bucket composition is rendered from the same read-only panels source and the violations table uses the shared DataTable.
- `/admin` and `/admin/commission-rules` LCP is the Bengali `h1` after the Hind 600 swap on the 4x-CPU/Slow-4G profile (the LCP element is the H1 in every run). This is the same font/heading cost the storefront documents, amplified by the larger `PageHeader` type. It does not indicate a data or hydration stall: TTFB is ~150 ms and the API p50 is under 500 ms.
- `/admin/complaints` and `/admin/settings` still upgrade LCP when client-rendered list/card content arrives. The first complaints page is now server-prefetched (LCP 4444 -> 2840 at 390), but the settings client still shows a skeleton until its settings/registry/history queries resolve; converting that page to server-provided initial data is the remaining lever.
- No public route changed: `check:bundle` reports the same 373/387/403/372/360 KB storefront budgets. Admin route manifests are 364-385 KB (budgets 500 KB each), and the public-manifest guard still forbids dashboard/admin/seller/charts code on public routes.
- The target "<= 2.5 s LCP on every admin page" is **not fully met** on the synthetic rich-data stack: orders/complaints/commission/settings remain above it at 1440, and the dashboard/complaints at 390 are borderline. Recorded honestly; the next pass is server-providing initial data for settings and the remaining list pages, and evaluating an admin-only `font-display: optional` policy for Hind.

## 2026-11-22 Seller dashboard Phase 3

Method unchanged: production build (`NEXT_DIST_DIR=.next-test`) on `:3002`, isolated API `:5001`, real Chrome, CDP Slow 4G (1.6/0.75 Mbps, 150 ms) + 4x CPU, cache off, `bn`, 5 runs, medians. Data is the isolated test stack with the dashboard-kit seller (60 synthetic orders).

| Route | Viewport | LCP before (Phase 1, dev DB) | LCP after | TBT after | CLS after | API p50/p95 after | JS transfer |
|---|---|---:|---:|---:|---:|---:|---:|
| `/seller/dashboard` | 1440 | 1816 ms | **1992 ms** (1776-2716) | 2465 ms | 0.0001 | 197 / 501 ms | 473 KB |
| `/seller/dashboard` | 390 | 1744 ms | **1876 ms** (1716-2588) | 2251 ms | 0.0013 | 180 / 237 ms | 392 KB |
| `/seller/orders` | 1440 | (no baseline) | **3444 ms** (2712-4268) | 1855 ms | 0.0002 | 182 / 243 ms | 469 KB |
| `/seller/orders` | 390 | **5584 ms** | **2728 ms** (2640-3268) | 2032 ms | 0.0013 | 183 / 238 ms | 387 KB |
| `/seller/earnings` | 1440 | (no baseline) | **2556 ms** (2420-3308) | 1042 ms | 0.0001 | 229 / 541 ms | 475 KB |
| `/seller/earnings` | 390 | **4988 ms** | **2368 ms** (2292-2480) | 1140 ms | 0.0013 | 180 / 481 ms | 393 KB |
| `/seller/products` | 1440 | (no baseline) | **4208 ms** (4124-4576) | 1243 ms | 0.0001 | 191 / 357 ms | 484 KB |
| `/seller/products` | 390 | (no baseline) | **3800 ms** (3320-5492) | 1061 ms | 0.0014 | 177 / 251 ms | 402 KB |
| `/seller/analytics` | 1440 | 1796 ms | **2272 ms** (1988-2352) | 1755 ms | 0.0001 | 180 / 382 ms | 450 KB |
| `/seller/analytics` | 390 | (no baseline) | **5396 ms** (5232-7820) | 1252 ms | 0.0013 | 179 / 419 ms | 373 KB |

- Seller orders and wallet are the clear wins: orders 390 -51%, earnings 390 -53%, both now under 2.5 s at 390. Both are server-seeded (first page/list + panels/wallet) and no longer wait for a client round trip.
- Seller dashboard is within ~10% of the Phase 1 baseline at 1440 (+176 ms) and ~8% slower at 390 (+132 ms); it now renders many more widgets (trend/status/wallet/release/disputes/top/ratings/delivery). TBT is higher because of the charts; it is the documented trade-off for the requested dashboard.
- Products is 3.8-4.2 s; the LCP is the product list content/imagery rather than the server-rendered strip. Analytics was not rebuilt in this pass; its 390 number is on the heavier isolated dataset and noisy.
- Public bundles are unchanged (373/387/403/372/360 KB). Seller route manifests are 366-372 KB against 500 KB budgets; `check:bundle` now also budgets `/seller/orders`, `/seller/earnings` and `/seller/products`.

## 2026-11-23 Dashboard UI/UX polish (admin + seller)

Method unchanged: production `.next-test` build on `:3002`, isolated API `:5001`, real Chrome, CDP Slow 4G (1.6/0.75 Mbps, 150 ms) + 4x CPU, cache off, `bn`, 5 runs, medians. Baselines are the Phase 2/3 numbers on this page.

| Route | Viewport | LCP baseline | LCP final | TBT final | CLS final |
|---|---|---:|---:|---:|---:|
| `/admin` | 1440 | 3600 ms | **3624 ms** | 2196 ms | 0.0001 |
| `/admin` | 390 | 3300 ms | **3316 ms** | 2019 ms | 0.0013 |
| `/admin/orders` | 1440 | 3764 ms | **3176 ms** | 2167 ms | 0.0001 |
| `/admin/orders` | 390 | 3332 ms | **3016 ms** | 1809 ms | 0.0013 |
| `/seller/dashboard` | 1440 | 1992 ms | **2096 ms** | 2427 ms | 0.0001 |
| `/seller/dashboard` | 390 | 1876 ms | **2052 ms** | 2581 ms | 0.0013 |
| `/seller/orders` | 1440 | 3444 ms | **2564 ms** | 1989 ms | 0.0002 |
| `/seller/orders` | 390 | 2728 ms | **2404 ms** | 1699 ms | 0.0013 |

- Admin and seller orders improved 9-26%; the admin dashboard is flat (+24/+16 ms, within noise) and the seller dashboard is +104/+176 ms (+5%/+9%) because it now carries a featured KPI, action queue, recent orders and richer charts. This is the documented cost of the requested content and remains far below the public-route targets.
- Page length (the audit's main mobile issue): admin 1440 4,016 -> **2,745 px**, admin 360 7,327 -> **5,018 px**; seller 1440 3,119 -> **2,733 px**, seller 360 5,162 -> **4,790 px**. Secondary analytics now sit behind tabs/queues (details on demand); every item remains reachable.
- Public bundles unchanged: home/catalog/PDP/cart/checkout 373/387/403/372/360 KB. Admin manifests 389 (dashboard) / 365 (orders) / 367 (complaints) KB; seller 372 (dashboard) / 367 (orders) / 372 (earnings) KB against 500 KB budgets. The +3-4 KB on admin is the featured KPI/recent-orders/icons; no new dependency.
- Motion: 220 ms opacity-only chart entrance (`prefers-reduced-motion` -> none), 200 ms transform-only tab indicator, 300 ms transform progress fills, 200 ms sidebar colour transitions. Reduced-motion computed `transition-property: none`/`animation: none`; no looping animation, no table animation, no page transition.
- Accessibility: full axe on `/admin`, `/admin/orders`, `/seller/dashboard`, `/seller/orders`, `/seller/earnings` at bn/en x 1280/360 = **0 violations**; one featured-card contrast failure found and fixed (secondary text /65 -> /80). Tablet rail width 80, focus tooltip opacity 1; drawer labels verified at 360.

## 2026-11-23 Dashboard completion: streaming LCP fix and final medians

**Cause (measured).** The admin dashboard H1 was server-rendered but the page awaited the analytics panels + recent-orders prefetch before returning JSX. The document TTFB was ~153 ms, the Hind 600 font finished at ~2.1 s, yet DOMContentLoaded was ~4.2 s and the H1 LCP was 4.68 s � the H1 was blocked by the data fetch, not by the font. The same pattern affected orders/complaints/seller pages that awaited panels before rendering the header.

**Fix.** The dashboard/list pages now render `PageHeader` immediately and stream the data-dependent content inside `<Suspense>` with a sized `DashboardFallback`/`ListFallback`. The range is resolved inside the streamed child. Orders-list KPI money uses `xl` (20 px) instead of `lg` (30 px) so an after-load price no longer becomes the LCP; complaints/seller-orders gained a readable header description. Chart animation is opacity-only and reduced-motion-safe.

Method: production `.next-test` build on `:3002`, isolated API `:5001`, real Chrome, CDP Slow 4G (1.6/0.75 Mbps, 150 ms) + 4x CPU, cache off, `bn`, **7 runs**, medians.

| Route | Viewport | Before this task | Final | TBT | CLS |
|---|---|---:|---:|---:|---:|
| `/admin` | 1440 | 3600 ms | **2324 ms** | 2075 ms | 0.0001 |
| `/admin` | 390 | 3300 ms | **2112 ms** | 1881 ms | 0.0013 |
| `/admin/orders` | 1440 | 3764 ms | **2168 ms** | 1575 ms | 0.0001 |
| `/admin/orders` | 390 | 3332 ms | **2048 ms** | 1690 ms | 0.0013 |
| `/admin/complaints` | 1440 | 4444 ms | **2152 ms** | 1178 ms | 0.0005 |
| `/admin/complaints` | 390 | 2840 ms | **1948 ms** | 1158 ms | 0.0013 |
| `/admin/reconciliation` | 1440 | 2124 ms | **2360 ms** | 1805 ms | 0.0138 |
| `/admin/reconciliation` | 390 | 1992 ms | **2200 ms** | 1508 ms | 0.0153 |
| `/seller/dashboard` | 1440 | 1992 ms | **2256 ms** | 2216 ms | 0.0001 |
| `/seller/dashboard` | 390 | 1876 ms | **2056 ms** | 1815 ms | 0.0013 |
| `/seller/orders` | 1440 | 3444 ms | **2164 ms** | 1658 ms | 0.0002 |
| `/seller/orders` | 390 | 2728 ms | **2336 ms** | 1198 ms | 0.0013 |
| `/seller/earnings` | 1440 | 2556 ms | **2456 ms** | 1253 ms | 0.0081 |
| `/seller/earnings` | 390 | 2368 ms | **1632 ms** | 791 ms | 0.0000 |

- Every measured admin/seller dashboard/list route is now **<= 2.5 s LCP** at 390 and 1440 except none; reconciliation moved slightly up but remains under the target. The seller dashboard is +13%/+10% vs its old 30-day baseline (now carries the action queue, featured KPI, recent orders and nested tabs) but still under 2.5 s; the fallback/streaming change is the reason it did not regress further.
- Seller mobile page length: **4,790 -> 4,605 px** after merging Shop/Quick links, reducing trend height and keeping secondary analytics behind tabs; no information removed.
- Public bundles: 374/388/404/373/360 KB (one KB above the previous 373/387/403/372/360 because the new admin/seller UI strings are in the shared locale messages), all within the 400/415/430/395/385 budgets. Admin 389/365/359/367/364 KB; seller 373/367/372/367 KB against 500 KB.

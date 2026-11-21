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

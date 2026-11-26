# Live browser check log

| Time | URL | Viewport | Check | Result |
|---|---|---|---|---|
| 2026-11-14 19:17 | http://localhost:3000/ | 1280x800 | Headed Playwright MCP session start; one persistent window/profile | PASS: Chromium window 'PlantHaat - Google Chrome' visible and foregrounded; UA has no HeadlessChrome; snapshot loaded; awaiting owner visual confirmation |
| 2026-11-14 19:18 | http://localhost:3000/ | 1280x800 | Home smooth scroll to feed | PASS � scrolled 4468/5268px, rails/feed rendered |
| 2026-11-14 19:18 | http://localhost:3000/products | 1280x800 | Change sort + scroll | PASS � URL ?sort=price_asc, 68 cards, scrollY 3000 |
| 2026-11-14 19:19 | http://localhost:3000/products/orchid-robd | 1280x800 | Open visible card / PDP | PASS � Orchid PDP, Add to cart present |
| 2026-11-14 19:19 | http://localhost:3000/products?sort=price_asc | 1280x800 | Back restoration | PASS � same URL, scroll 3000, 68 cards |
| 2026-11-14 19:20 | http://localhost:3000/ | 360x800 | Mobile home scroll | PASS � y 4822/5622, no horizontal overflow |
| 2026-11-14 19:20 | http://localhost:3000/ | 360x800 | Console after walkthrough | FAIL (environment) � 49 errors: API :5000 down (502s), picsum 504s, 2 local category-image 500s; API restarted |
| 2026-11-14 19:22 | http://localhost:3000/products | 360x800 | Price symbol order (bn) | PASS � ???? |
| 2026-11-14 19:23 | http://localhost:3000/products | 360x800 | Price symbol order (en) | PASS � ?190 |
| 2026-11-14 19:33 | http://localhost:3000/ | 1280x800 | Feed request storm re-check after API restart | PASS � 2 product API requests in 8s, 2 unique; no repeated-cursor loop |
| 2026-11-14 19:34 | http://localhost:5000/api/v1/health | n/a | Backend warm latency (5 calls) | 940ms cold, then 77/85/75/83ms |
| 2026-11-14 19:34 | http://localhost:5000/api/v1/products... | n/a | Product-list latency (5 calls) | 812ms cold, then 242/204/202/193ms |
| 2026-11-14 19:35 | http://localhost:3000/products | 1280x800 | Skeleton rows with 4s API delay | PASS � complete 4-column rows (12 cards), filter rail present |
| 2026-11-14 19:32 | build | n/a | Next bundle analyzer | Artifact written to frontend/.next/diagnostics/analyze |
| 2026-11-15 00:10 | backend :5000 | n/a | API death investigation | ROOT CAUSE: orphaned `node --watch` tree still owned :5000; supervisor was restart-looping on EADDRINUSE, not a crash. Killed orphan tree and started one supervised process. Health 200, DB up, uptime stable. Logs: backend/logs/api.log. |
| 2026-11-15 12:53 | http://localhost:3000/checkout | 1280x800 | Checkout vertical rhythm after fix | PASS - title->first section 24px, section gap 24px, heading->card 16px/12px, address card 94px, payment card 79px; no stretch |
| 2026-11-15 12:53 | http://localhost:3000/checkout | 1280x800 | Checkout sticky actions (1/3/6 shops) | PASS - summary 704px, Place order 697-741 and Back to cart 749-785 inside viewport at top/middle/bottom; elementFromPoint hits both |
| 2026-11-15 12:53 | http://localhost:3000/checkout | 360x800 | Mobile flow bar | PASS - bar shows only when in-flow Place order is offscreen; exactly 1 visible Place order; no horizontal overflow |
| 2026-11-15 12:55 | shop-checkout e2e | 1024/1280/1440 + 360/390 | Checkout geometry, en/bn, 1/3/6 shops | PASS - 30/30; quantity text Qty/??????; one summary; no mojibake |
| 2026-11-15 12:55 | existing e2e suites | overflow/typography/scroll-restore/messages/cart-quantity | PASS - 63 passed, 2 skipped (ADMIN_PASSWORD); 1 mobile scroll-restore timeout passed on isolated rerun |
| 2026-11-15 12:55 | Vitest | n/a | Full unit suite + encoding scan | PASS - 47/47 with --maxWorkers=1; default concurrency hit two 5s test timeouts, both pass isolated |
| 2026-11-15 21:35 | http://localhost:3000/admin/settings | 1280x800 | Settings grouping, help, sticky Save/Discard, history | PASS - grouped bKash/Nagad/Timing/Checkout cards; 2-column layout; sticky bar; no horizontal overflow; screenshots .artifacts/settings/ |
| 2026-11-15 21:36 | http://localhost:3000/admin/settings | 360x800 | Mobile settings layout | PASS - single column, sticky bar usable; .artifacts/settings/settings-360.png |
| 2026-11-15 22:05 | http://localhost:3000/admin/settings | 1280x800 | Sensitive re-auth, validation, history | PASS - wrong password inline alert, correct password saves, history writes; screenshots settings-reauth-1280.png, settings-validation-1280.png, settings-history-1280.png |
| 2026-11-15 22:10 | http://localhost:3000/checkout | 1280x800 | COD max customer effect | PASS - 3-shop cart shows limit message and API returns PAYMENT_METHOD_NOT_AVAILABLE; settings-cod-blocked-1280.png |
| 2026-11-15 22:10 | http://localhost:3000/ | 1280x800 | Support + return window customer effect | PASS - WhatsApp in footer, 24-hour trust copy; settings-customer-home-1280.png |
| 2026-11-15 22:12 | tests | n/a | Session 2 checks | backend unit 222/222; COD e2e 7/7; frontend Vitest 50/50; settings Playwright 3/3 |
| 2026-11-16 09:30 | isolated test env | :5001 API + :3002 frontend | Settings persistence reproduction | PASS - one save number+enable bKash+enable Advance; response 200; five reloads kept values; inline error when number cleared |
| 2026-11-16 10:20 | planthaat_test | n/a | Batch settings backend tests | PASS - admin 6, settings batch 5, COD 7 (18/18); unit 223/223 |
| 2026-11-16 10:21 | dev check | n/a | Dev settings untouched | PASS - advance false, bKash false, no number |
| 2026-11-16 14:00 | http://localhost:3000/products | 1280/360 bn+en | Product card rating / no shop name | PASS - 2 Playwright runs; screenshots .artifacts/product-card/ |
| 2026-11-16 14:25 | localhost:3000 bn | home/catalog/PDP/cart/checkout/orders | Latin digits scan | PASS - no U+09E6-U+09EF; ? precedes amounts; .artifacts/digits/ |
| 2026-11-16 14:40 | localhost:3000 | en+bn, customer/seller/admin | Auth entry redirects | PASS - 5/5 after server route + guard; stale cookies cleared |
| 2026-11-16 15:00 | localhost:3000 | 1280 | Guest merge -> order -> reload/logout/login/new tab/token expiry | PASS - 1/1; backend atomic cart test 7/7 |
| 2026-11-16 23:30 | :5001/:3002 isolated stack | 360/1280 en+bn | Advance payment journey (buyer/admin/seller) | PASS - checkout selector, payment page states (unpaid/pending/paid/rejected/underpaid/expired), admin verify/reject and refund queues, seller gating, settings preview; screenshots .artifacts/payments/ |
| 2026-11-17 22:05 | :5001/:3002 isolated stack (access TTL 10 s) | desktop + Pixel 7, en+bn | Silent session refresh | PASS - measured cookies: ph_at/ph_rt Path=/, HttpOnly, SameSite=Lax; access cookie Max-Age 300 s while JWT exp 10 s (before fix the access Max-Age equalled the 10 s TTL and vanished). Reproduced /account/sessions -> /login?returnTo=... before the fix with no refresh call; after: customer/seller/admin stay logged in, 10 parallel requests share one refresh generation, two tabs survive, revocation returns to /login with returnTo + localized message and returns to the page after login, no tokens in storage. Playwright session-refresh 8/8 desktop + 8/8 mobile. |
| 2026-11-17 23:55 | :5000 dev API | n/a | API restart does not log out | PASS - login saved, :5000 restarted, /auth/me 200 with the same cookie (sessions are Postgres-backed); headed /account/sessions loaded through :3000. |

| 2026-11-18 17:10 | Production build (:3000) + isolated :5001/:3002 | 390/1280 en+bn | Cart/checkout CLS + checkout LCP | PASS - 5-run medians: cart CLS 0.0042-0.0108, checkout CLS 0.0073-0.0093, checkout LCP 1.83-1.99 s; guest cart 0; 6-shop cart 0.0083. |
| 2026-11-18 17:20 | Isolated production stack | desktop, en+bn, 360/1280 | Settings admin specs | PASS - settings 4/4 and payments-advance 12/12 serially. Found and fixed a real staleness bug: public settings cached for 60 s, so the admin promise "customers will see this on new page loads" was false; now 1 s + tag invalidation. |
| 2026-11-18 17:30 | Isolated production stack (access TTL 10 s) | desktop | Session refresh | 8/8 passed after updating the revoked-session expectation: logout-all clears both cookies, so the proxy correctly returns `auth-required`, not `session-expired`. |
| 2026-11-18 17:40 | :3000 development server | 390/1280 en+bn | Password toggle + card focus + CLS guard | PASS - password 5/5, focus-ring 5/5, CLS 2/2, design-conformance 24/24, home-consistency 7/7. |

### Isolated settings stack

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/test-stack.ps1 start
# API :5001 (planthaat_test), production frontend :3002 (no compile-on-demand)
# test admin: admin@teststack.local / TestAdmin123! (seed fixture)
$env:NEXT_PUBLIC_SITE_URL="http://localhost:3002"
$env:SETTINGS_PERSIST_BASE_URL="http://localhost:3002"
$env:ADMIN_EMAIL="admin@teststack.local"
$env:ADMIN_PASSWORD="TestAdmin123!"
npx playwright test e2e/settings.spec.ts e2e/settings-persist.spec.ts --workers=1 --project=desktop-chromium
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/test-stack.ps1 stop
```

| 2026-11-18 19:05 | Production build (:3000), bundled Chromium + real Chrome channel | 1280/390 en+bn | Card focus after click/Back, hover/active, touch, keyboard | PASS - focus-ring 8/8 bundled + 8/8 real Chrome; design-conformance 43/43, product-card/home-consistency/scroll-restore 58/58; axe home/products clean. Cause: Chrome can match :focus-visible after pointer (focus restoration/settings) and the inset wrapper shadow was painted under the image, so only the text area showed it. Now a ::after overlay above the image, gated on keyboard modality. |
| 2026-11-18 20:10 | Production build (:3000) | 1280/390 en+bn | Wishlist hydration + card focus | PASS - wishlist-hydration 1/1 (no console hydration error, saved heart aria-pressed + "Remove from wishlist"), focus-ring 8/8 bundled + 8/8 Chrome, product-card/design-conformance/home-consistency 54/54, axe home+/products clean, Vitest 66/66. |

## 2026-11-19 Part 4 settlement UI (isolated :5001/:3002)

Full report: `docs/testing/part4-live-report.md`.

Run (serial, production test stack):

```powershell
$env:PAYMENTS_TEST_BASE_URL="http://localhost:3002"
$env:PAYMENTS_TEST_API_URL="http://127.0.0.1:5001"
npx playwright test e2e/part4-settlement.spec.ts --project=desktop-chromium --workers=1
```

The spec seeds nothing itself; it uses the fake test-stack accounts and creates its own
advance/COD/dispute records. It sets only non-sensitive public return-window test settings and, for
the COD dues case, disables auto-deduction through a real admin re-auth token. Axe + 360 px overflow
checks run inside the same spec. `payments-advance.spec.ts` remains the regression suite for Part 3.

## 2026-11-19 Part 4 closing scenarios (isolated production stack)

Split specs (serial, `--project=desktop-chromium --workers=1`): `part4-dispute-reject`,
`part4-withdrawal-reject`, `part4-payout-destination`, `part4-dispute-filters`,
`part4-withdrawal-validation`, `part4-window`, `part4-reconciliation`, `part4-permissions`,
`part4-multi-shop-refund`: **9/9 passed**. `payments-advance.spec.ts`: **12/12 passed**.

`part4-payout-destination` covers wrong/valid re-auth, copy, manual hide, 60 s auto-hide and bn copy.
The breach path was exercised manually with `backend/scripts/part4-breach-test.ts` (test DB guard,
immediate restore). Full table: `docs/testing/part4-live-report.md`.

## 2026-11-20 Task A hero trust row

Real Chrome (channel chrome), dev app :3000, en 1440x900 and bn 390x844: the restored row reads
"Pay when it arrives / Verified nurseries / Problem? Tell us within 48 hours" and
"হাতে পেয়ে টাকা দিন / যাচাই করা নার্সারি / সমস্যা হলে 48 ঘণ্টার মধ্যে জানান", with Latin `48` in
both locales. The 48 comes from the live `return.windowHours` public setting. e2e
(`home-hero.spec.ts --grep "trust row"`, real Chrome): 2/2 passed.

## 2026-11-20 Task B highlights autoplay

Reproduced on the dev app in real Chrome (channel chrome): admin autoplay ON, `intervalSeconds=6`, 3 slides, 1440x900. The public payload and the pause control were present but the index stayed 0 for 20 s. Instrumentation showed `scrollSnapList().length === 1` and `plugin.isPlaying() === false`: `EmblaCarousel(track)` was passed the flex track, so Embla treated the first slide wrapper as its container and the autoplay plugin disabled itself (`init` returns for <=1 snap). The `(min-width: 768px)` check also skipped phones, and `prefers-reduced-motion` skipped the whole engine (not just autoplay).

Fix: pass the `overflow-hidden` root, drop the viewport gate, keep the engine under reduced motion (autoplay only), own pause/resume in the component (hover/focus/interaction/visibility, manual pause wins), and treat only keyboard `:focus-visible` as focus pause so a manual swipe restarts the timer. Admin: updated `autoplayHelp`, added the full inline notice under the switch and in the preview, plus a `data-autoplay-status` line that names the reason it is not playing.

Production build (`.next-test` on :3002, test API :5001, real Chrome, serial)
`highlights-autoplay.spec.ts`: **8/8 passed** (desktop 1440 advance, mobile 390 advance + visible pause control, hover pause + resume, focus pause + resume, swipe restart, hidden-tab pause + resume, reduced motion off with manual next, admin toggle off/on within 1.5 s).
`admin-highlights-ui.spec.ts`: 1/1, `admin-highlights.spec.ts`: 1/1. Screenshots viewed at 1280 and 360: the notice wraps without overflow and the status line reads "Autoplay is off." when the switch is off.

## 2026-11-20 Task C sessions

40-minute real-Chrome dev soak (`scripts/session-soak.mjs`, :3000, demo customer, 2 tabs, 30 s
interval, navigation every third cycle): **22 navigations, 110 API calls, 0 refreshes with an auth
error, 0 401s, 0 `/login` redirects, 0 session dialogs**. One navigation timed out at 200 s during a
dev-server HMR compile (an error in the soak summary, not a session end). The web cookies stayed
valid for the whole run.

Root cause evidence from the accelerated stack: with a 10 s access TTL the `ph_web_rt` hash stopped
changing after 17 s and the API logged `REFRESH_TOKEN_REUSED` at 85 s. The Server Component was
silently rotating and discarding the successor; a failed refresh also cleared cookies on 429. After
the fixes the 2-minute accelerated soak was clean. Test stack (production build): `session-expired`
8/8, `session-cookie-collision` 2/2, `session-refresh` 8/8 (the revoked-session contract now expects
the dialog at the same URL).

## 2026-11-20 Task D admin consolidation

Production test stack, real Chrome, serial: `admin-consolidation` **4/4** (commission edit →
read-only Settings value, highlights autoplay → Settings summary, managed banner placements blocked,
axe at 1280/360), `settings` **3/3**, `admin-highlights` **2/2**, admin route manifest **5/5**
(Vitest). Axe fixes were limited to shared tabs contrast and three missing names in the Highlights
editor; the commission/highlights/banners pages now pass at both widths with no horizontal overflow.

## 2026-11-21 evidence proof (Task 1)

Real Chrome (`channel: chrome`) against the isolated production frontend `:3002` and test API `:5001` (Cloudinary `planthaat/teststack` for this run): seller marked a COD order DELIVERED through the real dialog with one uploaded photo, then replied to a dispute with one photo. `evidence-proof-ui.spec.ts` **1/1** verified ATTACHED rows, buyer order proof, buyer timeline photo, seller order/complaint rendering, admin dispute proof + conversation photo, 1280/360 axe clean and no horizontal overflow; screenshots viewed (`seller-order-1280`, `seller-complaint-1280/360`, `admin-complaint-1280/360`, `buyer-order-1280`). Test-prefix assets were deleted and `.env.test` restored to local.

## 2026-11-23 regression closure on the isolated stack

- Fixture: `test-stack.ps1 start` now seeds `[seed:e2e-demo]` (admin/customer/seller, `demo-nursery`,
  `money-tree-bonsai-xokk`, cart, address) on `planthaat_test` only; cleanup command documented in
  `backend/docs/testing/baseline.md`. Dev data was not modified.
- Security/core, real Chrome, serial: header-nav **5/5**, access-control **9/9**, auth-redirect **5/5**,
  session-expired **8/8** (27/27); `design-conformance` **86/86** (desktop + mobile projects);
  `performance.spec.ts` **1/1**. Short-TTL API: session-refresh **8/8**, session-expired **8/8**,
  session-cookie-collision **2/2** (18/18).
- `seller-panel.spec.ts` was run as an extra check but its `BASE` is hardcoded to `:3000`/dev; the 2
  failures were fixture/rate-limit (no product for seller1, 429) and not reproducible on the isolated
  stack. The equivalent isolated check was done with axe on `/seller/dashboard` (0 violations at
  en/bn x 390/360) plus the length/motion script.
- Seller mobile: **3,466/3,462 px at 390**, **3,592/3,572 at 360**, no overflow, 44 px toggle; expanded
  4,232. Tab-switch trace 0 layout shift / no long tasks; reduced motion instant.
- Backend: payout validator unit **4/4**; settlement payout e2e **2 passed** (11 filtered); typecheck
  clean. Frontend typecheck/build green; no new dependency. Test stack stopped before backend e2e and
  restarted afterwards; dev `:3000`/`:5000` restored, `:3100` off.


## 2026-11-23 cancellation, session handoff and navbar

- Isolated production stack (real Chrome): session-expired **16/16** (8 x desktop/mobile), header-nav **5/5**,
  design-conformance **86/86**, a11y/typography/overflow **130 passed, 2 skipped**, CLS cart/checkout **2/2**
  on rerun. Session-refresh was 14/16 in the serial run; the revoked test passed alone on both projects
  and a direct cookie debug showed `/orders` + dialog. Login throttle (10/min) makes long serial runs flaky.
- Dev real Chrome: cart-persistence **2/2**. An ADVANCE checkout, a cart line added afterwards and a
  customer cancel left only that new line; the ordered variants were not restored. Probe order deleted.
- Browser checks: slow `/auth/me` (2.5 s) on a returning session kept toggle/cart positions and 44 px
  bell/avatar placeholders; guest shows "Log in" immediately; unread/cart 500s did not hide other controls.
  Locale switch kept `/products?sort=newest#main`, header and scroll, no full reload. Toggle 68x44 with
  30x30 circles at 1440/1280/768/390/360; no horizontal overflow.
- Session dialog: 0 inputs, primary link `/login?returnTo=%2Forders&reason=session-expired`, 2 actions,
  axe-clean; login returned to `/orders` with no dialog.
- Screenshots: `_review-shots/navbar-{guest,signed}-{1440,390,360}.png`, `navbar-bn-1440.png`,
  `session-dialog-390.png`.


## 2026-11-24 role-aware auth prompts

- New `auth-prompts.spec.ts` **6/6** (desktop+mobile): guest public browsing has no prompt; guest cart checkout shows **Login required** and returns to `/checkout` with the merged cart; a previously authenticated customer browses `/products` quietly, then `/checkout` shows **Session expired** at the same URL and returns after login.
- `session-expired.spec.ts` **16/16** with the default test TTL after updating the two-tab test to trigger the customer action explicitly. `session-refresh.spec.ts` remains flaky in long serial runs under the 10 s TTL (9/16 latest, 14/16 earlier; revoked/admin pass alone); no code assertion weakened.
- Browser checks: `ph_session_expired` is set by the same-URL expired proxy and client `/auth/me` 401; guest has no marker; `AuthProvider`/localStorage role survives a reload; no global customer prompt on public routes. Screenshots: `_review-shots/login-required-390.png`, `session-expired-checkout-390.png`.


## 2026-11-24 typography, tabs, orders and passwords

- Bangla: seller/products `স্টক স্বাস্থ্য` computed family and shaped width verified before/after
  (`bangla-before.png` / `bangla-after.png`); no wrapping was disabled.
- Orders: customer1 browser run — default **Completed** shows 1, All 6, Cancelled 5, Pending empty with
  its own copy; one panel visible at a time; 1440/1280/768/390/360 no page overflow.
- Password: register page at 390 shows the info popover, missing-only warnings for `plantHaat`
  (number + special), then “Password meets all requirements” for `Str0ngPass1!`; screenshot
  `password-policy-390.png`.
- Tests: Vitest includes `tests/password-policy.test.ts`; backend `password.spec.ts`, auth+checkout e2e
  pass; visual evidence in `_review-shots`.


- Final counts for this pass: backend unit **281/281**, auth+checkout e2e **18/18**; frontend Vitest
  **120/120**, typecheck/lint/build green. Browser: Completed default/All/Cancelled/Pending verified,
  password policy popover/warnings/valid state verified, seller/products Bangla word intact.


### 2026-11-24 My Orders active pill/counts final

- Measured active trigger and indicator at 390/360/1280: trigger 44 px high, indicator 44 px high and
  width matches trigger within 0.2 px before/after tab switch and after horizontal scroll; list 52 px,
  page overflow 0. The fixed indicator uses `left` + `width` with a ResizeObserver, not scaleX (which
  was distorting the rounded background).
- `GET /orders/status-counts` returned `{all: 6, counts: {CANCELLED: 5, DELIVERED: 1}}` for customer1;
  tab badges display 1/6/5 with zero-status badges omitted. Screenshot: `orders-tabs-final-390.png`.


## 2026-11-25 seller/PDP/delivery/wallet checks

- Seller CTA: 1440/1280 header+footer visible, 390 footer only, seller hidden, 0 overflow.
- Seller registration: guest `/register/seller` completed to `/seller/apply` (account cleaned after); no approval bypass.
- PDP: Q&A click sets active Q&A/panel, Delivery tab no district/charge UI, no delivery quote request.
- Conditions: seller1 API defaults both methods; inside/outside cart flags and checkout COD/Advance restrictions verified; backend rejects wrong method with 400.
- Screenshots: `seller-cta-1440.png`, `seller-cta-footer-390.png`, `pdp-tabs-final.png`, `seller-delivery-conditions-390.png`, `checkout-inside-cod-only.png`.


### 2026-11-25 existing-seller delivery backfill

- Seller3 (Sylhet, previously legacy-only) opens /seller/delivery-zones with both **Configured** cards and no manual setup; API rows carry 90/1800/2–5, COD+Advance.
- Customer cart for that shop at district 18 returns 90, INSIDE_DHAKA, COD/Advance allowed; checkout shows both methods and the 90 fee.
- Screenshot: `_review-shots/migrated-seller-conditions.png`.

## 2026-11-26 delivery-quote verification (Prompt 1B)

Isolated production stack (:5001 API, :3002 frontend), real Chrome (`PW_CHANNEL=chrome`), test DB only.

- `e2e/delivery-quote.spec.ts` **7/7 desktop (1280)** and **7/7 mobile (360)**, serial, one worker.
- Covered: logged-in two-shop cart with Dhaka + Sylhet pickups and courier/seller-extra breakdown; guest cart district+thana with no login; saved Dhaka address without thana blocked with a prompt; COD_ONLY removes Advance and restores; seller product weight/extra live example; seller pickup thana and delivery-zones info; admin delivery-rates ids/unverified/override/CSV; admin order delivery snapshot.
- Axe clean on the touched pages; no horizontal overflow at 1280/360; no console errors or failed requests besides the known test-stack realtime CSP warning (`ws://localhost:5000`, already tracked in FRONTEND_CONTEXT).
- Unit: `tests/locations.test.ts` verifies placeholder filtering and duplicate-name de-duplication (2/2).
- Regression found and fixed in this pass: cart fixed-bar Checkout link overflow at 360; long district/thana selects overflow at 360; seller pickup-thana select lost its initial value after async options; admin override number inputs had no accessible name.
- Test-stack seed: `npm run db:seed:delivery-test-stack` (test DB only) sets live OFF, override 1?1 = 55, outside fallback 90, Mirpur/Savar/Zone Not Clear thanas, buyer2 without thana, and a second Sylhet pickup shop.

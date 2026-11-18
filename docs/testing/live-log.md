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

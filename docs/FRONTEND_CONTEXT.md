# FRONTEND_CONTEXT.md - PlantHaat Frontend

Working rules and current state for the Next.js app. Read this and `FRONTEND_DESIGN.md` at the start of a session. The chronological implementation history is the single progress file `backend/docs/progress.md`; UI findings live in `design/`. Do not duplicate those logs here.

## 0. Workspace and repositories

```
PlantHaat/
- AGENTS.md        live agent rules (workspace root)
- backend/         NestJS API repo; docs in backend/docs/
- frontend/        Next.js app repo; docs in frontend/docs/ (this file)
```

- `frontend/` is its own git repo; work on `redesign/phase2`. `backend/` is read-only for frontend tasks; work there only on `feature/payments`.
- Run git, npm and all commands **inside `frontend/`**. The workspace root is not a git repo.
- Commit locally with Conventional Commits; never push unless the task explicitly asks.
- Documentation lives only in `frontend/docs/` and `backend/docs/`; never create root-level docs or a separate docs repo.

## 1. Mission

Build the PlantHaat customer storefront, seller dashboard and admin console against the backend API at `/api/v1`. Bangla-first, mobile-first, fast, accessible, secure, light-only.

## 2. Sources of truth (read in this order)

1. `FRONTEND_DESIGN.md` (this folder) - behavior, UX, architecture, routes.
2. `backend/openapi.json` - exact endpoints and DTO shapes; it wins over prose for field names. Log differences.
3. `backend/docs/BACKEND_CONTEXT.md` - backend layout, decisions/deviations, implemented endpoints, how to run it. Read the relevant sections only.
4. `backend/docs/BACKEND_DESIGN.md` - domain rules (state machines, checkout, commission, windows).
5. `design/DIRECTION.md`, `design/MASTER.md`, `design/audit.md`, `design/performance.md`, `design/typography.md`, `design/cart-checkout.md` for UI work.
6. `backend/docs/payments/api.md`, `backend/docs/auth/sessions.md`, `backend/docs/settings/reference.md` for those contracts.

The backend is read-only. If a backend change is needed, log it in `backend/docs/BACKEND_CHANGE_REQUESTS.md` (or the frontend section of `backend/docs/progress.md`) and continue with a workaround or a clearly marked placeholder.

## 3. Stack (fixed)

Next.js 16 App Router (Cache Components / `use cache`, `proxy.ts`, Turbopack), React 19, TypeScript strict, Tailwind v4 + shadcn/ui (installed via the shadcn CLI), Axios, TanStack Query/Table, react-hook-form + zod, next-intl, openapi-typescript, socket.io-client, `motion` (sparingly, honoring reduced motion), Vitest + Testing Library + MSW, Playwright. Do not add libraries without a logged reason.

## 4. Non-negotiable rules

- **Architecture (developer decision): client â†’ Next.js server â†’ backend.** Browser code never calls the backend. Client Components call the same-origin Route Handler gateway (`/api/v1/*`); Server Components call the backend through `src/server/backend.ts`. The only direct browser â†’ backend connection is the realtime socket (ticket-authenticated).
- **Images:** every upload goes through `uploadsApi` (`POST /uploads/images`, then persist the returned Cloudinary URL). Never construct local `/uploads/...` URLs. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` must be set in `.env.local` so `next.config.ts` allows the Cloudinary host; restart the dev server after changing it. Product, category, shop logo/banner, review, complaint, payment-proof and admin-banner forms use this path.
- **Auth:** httpOnly cookies owned by the Next.js origin (`ph_at`, `ph_rt`, issued only by the gateway/`proxy.ts`); tokens never touch client JS. Three-layer silent refresh: proxy â†’ gateway refresh + replay â†’ browser single-flight fallback; no loops. Contract: `backend/docs/auth/sessions.md`.
- **Payments:** COD and manual Advance (bKash/Nagad TrxID verification) are available; there is no gateway SDK. Advance is feature-flagged by Settings and must follow the real server state. Contract: `backend/docs/payments/api.md`.
- **shadcn/ui through its CLI only.** Search first, then `add`; customize only as allowed in `FRONTEND_DESIGN.md` Â§6.2. Review `git diff` after `add`.
- **Colors:** design tokens only (`FRONTEND_DESIGN.md` Â§6.1 / Appendix B). No hard-coded hex; one marigold CTA per screen region; respect contrast.
- **Light mode only** (`forcedTheme="light"`, `color-scheme: light`, no toggle, no theme storage). QA runs light only.
- **Typography:** Inter for Latin, Hind Siliguri for Bangla. The supplied `Kalpurush.ttf` has no Bengali glyphs and is not wired. Use one `<Price>` renderer, Latin digits, taka sign before amounts.
- **UI must look intentional**, not default components. Follow `design/DIRECTION.md` and `FRONTEND_DESIGN.md` Â§6.5.
- **Look at your work:** Playwright at 360 and 1280 (bn + en), loading/empty/error states, console/network errors, axe where available. A UI task is not done until verified visually.
- `proxy.ts` is a UX gate, not the security boundary: re-verify sessions in server layouts/data access (`requireSession`); the backend stays authoritative.
- **No hard-coded UI text:** every string via next-intl (`bn` default, `en`). Server is authoritative for prices/totals/stock/commission; treat money as opaque strings.
- Messaging is not available: do not build chat UI. No `dangerouslySetInnerHTML`; validate `returnTo`; no secrets in `NEXT_PUBLIC_*`.
- Do not add features, pages or dependencies outside the design. If something is missing, choose the simplest safe option and log it.

## 5. Working protocol

1. Read the relevant docs above, run `git status`, inspect `src/`, and continue from the current state. Do not redo finished work.
2. Work in small vertical slices: implement â†’ tests â†’ `npm run lint`, `npm run typecheck`, `npm test`, targeted Playwright â†’ fix â†’ commit locally.
3. Run a production build once per phase/major step, not after every edit.
4. Visual QA is part of every UI task; list the pages and viewports actually verified.
5. Update the canonical docs (`backend/docs/progress.md`, relevant `frontend/docs/design/*`) instead of creating new files.
6. When the design is ambiguous, choose the simplest safe option and log it. Ask only when blocked by external information or an irreversible money/business choice.
7. If context resets, `FRONTEND_CONTEXT.md` + `FRONTEND_DESIGN.md` + `backend/docs/progress.md` must be enough to resume.

## 6. Engineering standards

- TypeScript strict; no `any` (use `unknown` + narrowing); no unused code; no `console.log` in committed code.
- Server Components by default; `"use client"` only where interactivity requires it. Feature logic in `src/features/*`, not route files.
- Keep loading/empty/error/success/disabled/permission states; guestâ†’authenticated cart; checkout validation; seller-wizard validation.
- Accessibility: semantic HTML, accessible names, keyboard support, visible focus, 44px targets, one `<main>` per page (owned by `SiteShell`), one `h1` per page.
- Money may arrive as strings; display with `Intl.NumberFormat` / `<Price>`, never compute prices as truth.
- Responsive at 360px, not a scaled desktop; verify mixed Bangla/English wrapping and line-height.

## 7. Current decisions and deviations

- Customer pages use `PageHeader` (one `h1` 24/30) + `PageContainer` (wide/reading/form/narrow); `SiteShell` owns the only `<main>`.
- Auth forms are `inert` with disabled Submit until hydration and use `method="post"` as a native fallback (no credentials in the URL).
- One date formatter: `formatLatinDateTime(value, locale)`; `formatDateTime` is a deprecated alias. Latin digits everywhere; à§³ before amounts.
- Home: all 11 categories + All categories, curated plants-only/in-stock rails, adjacent-rail dedupe, sparse rails hidden below 4 unique cards (`HOME_RAIL_MIN = 4`), All products feed includes accessories honestly.
- Home hero (2026-11-20): the owner-preferred editorial left side restored from `f100858` (badge, settings headline/subheadline, native GET search, two links) and a borderless right-side scene of four real cutouts (monstera, palm, snake, calathea) with a progressive-enhancement WebGL wind sway. Static `<picture>` (AVIF primary, WebP fallback) is the no-JS/reduced-motion/save-data/no-WebGL result; admin `home.hero.image` overrides the scene statically. The plants/shadows use a fixed 11:10 inner box (300 px phone, 420 px tablet, centered), so composition ratios stay stable. The sway quality monitor reads raw rAF ticks (warmup 3 s, ignore >250 ms, DPR after >28 ms/3 s, static after >150 ms/5 s) and cached clip rects; 60 s dev/prod Chrome logs stay webgl. Edge-feathered clipped cutouts; palm visible 600/padded 672 px; AVIF q50. Chips are unwired/removed from Settings. `src/config/home-banners.ts` remains unused (owner file untouched).
- Home Highlights (2026-11-19): admin-managed `HOME_HIGHLIGHTS` banners rendered by `HomeHighlightsSlot`; 3:2 mobile / 3:1 desktop aspect boxes, `<picture>` art direction, autoplay off by default, single slide = no carousel JS, multi-slide loads Embla on visibility and only selected-slide images. Off/empty/failure removes the section entirely.
- Admin: **Home â†’ Highlights** (`/admin/highlights`) edits images, overlay/text/position/colors, button/link, schedule, active state and master autoplay/interval controls; Settings â†’ Home holds the hero copy/chips/image and the highlights on/off/title/max keys.
- Shared card surface: `rounded-xl` (feature `rounded-2xl`), `border-border/60`, `shadow-[var(--shadow-soft)]`.
- Checkout with an empty cart shows the shared empty state, not a zero-total form.
- Order detail maps the raw payment enum to the localized label; no raw enums in customer copy.
- Seller/admin keep the dark-ink `DashboardShell` and 36px compact controls; adopting the customer page shell is deferred.
- Seller panel (2026-11-21): every seller page now uses `PageContainer` + `PageHeader`; the shell breadcrumb is a span so the page owns the only `h1`. Detail order/complaint pages use the same header with back links. Product/delivery-zone/payout deletes use `AlertDialog` (no `window.confirm`); lists use `QueryError`/`EmptyState`. The duplicate payout-profile tab and unused `EarningsClient` were removed; `/seller/payout-accounts` is canonical and earnings links to it. Approved sellers no longer see Apply in nav; the standalone `/seller/apply` keeps a back-to-home link. Audit: `backend/docs/seller-audit.md`.
- Header/navigation (2026-11-21): exactly one `En | à¦¬à¦¾à¦‚` control, always visible, switches on one click and restores scroll after the document reload; `html lang` follows the locale. Guests see logo/search/toggle/cart/"Log in" (no Register, bell or profile) and the mobile bottom nav hides Account while keeping Orders. Signed-in users see the bell + profile menu and all five tabs. The bell opens an in-place desktop popover or mobile bottom-sheet dialog (never navigates), with unread badge capped at `9+`, mark-all, paging, relative Latin-digit times and realtime/polling refresh. A non-sensitive `ph_has_session=1` cookie only reserves signed-in chrome before `/auth/me` resolves; it is never authorization. `session:expired` clears the cached user so the header goes guest while the inline re-auth dialog remains open.
- Payment/auth state is never faked in UI; disabled and permission-denied states must remain.
- Performance decisions (2026-11-21): the home palm preload is emitted in the early shell (`HeroPreload`), not inside the hero subtree; catalog cards 1-4 are priority; English uses a 3 KB Hind subset for `৳`/`বাং` instead of downloading full Hind 400+600, while Bangla keeps Hind. The session-expired dynamic-dialog split was measured and reverted (JS +11 KB, one extra chunk). Browser runtime/hydration is the remaining home cost; `/products` API warm p50 356 ms is untouched pending verified index evidence. Guards: `npm run check:bundle` (home 400 / catalog 415 / PDP 430 / cart 395 / checkout 385 KB limits) and home CLS in `e2e/cls.spec.ts`.

## 8. Pages and routes

Authoritative route list: `FRONTEND_DESIGN.md` Â§7. Built areas: public home/catalog/PDP/shops/cart/checkout/payment/auth/static, customer account/orders/wishlist/notifications/complaints, seller onboarding/dashboard/products/orders/earnings, admin dashboard/sellers/products/orders/payments/refunds/payouts/settings/content.

## 9. Environment and how to run

- `npm install`, then `cp .env.example .env.local` and fill values. Backend default `http://localhost:5000`; use `API_INTERNAL_URL=http://127.0.0.1:5000` (IPv4).
- `npm run dev` â†’ `:3000`; one supervised API on `:5000`; `:3100` stays off.
- Production build into a throwaway dir: `NEXT_DIST_DIR=.next-prod npm run build`; do not delete `.next` while the dev server runs.
- Public env: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL`. Server-only: `API_INTERNAL_URL`, `BFF_SHARED_SECRET`, `BACKEND_TIMEOUT_MS`, `GATEWAY_MAX_BODY_MB`, `REVALIDATE_SECRET`, `SITE_ORIGINS_EXTRA`.

## 10. Customer-facing rules (current)

- **Digits:** Latin (0-9) in every locale, including bn. Use the shared formatters; never use a Bangla numbering system. Taka sign precedes the amount.
- **Auth entry:** `/login`, `/register`, `/register/seller` are guest-only; valid sessions redirect to a sanitized relative next/callback/returnTo or role home. Stale cookies clear through `/auth/continue`.
- **Product card:** image, name (2 lines), price, rating row; no shop name. Rating row sits under the price on every variant; count > 0 shows one filled marigold star + one-decimal average + `(count)`; count = 0 shows a muted outline star + "No reviews yet" with the same reserved height and a localized aria-label.
- Demo data: `npm run db:seed:demo:reviews` (cleanup: `npm run db:seed:demo:reviews:cleanup`).

## 11. Known issues and next steps

- Performance (2026-11-21 programme): home LCP medians now **2.86/2.39 s at 390 bn/en** and **2.87/2.87 s at 1440** (was 3.50/3.21 and 4.66/3.16); catalog 390 is **2.51/2.44 s**. Home render delay is ~1.2-1.6 s (hydration), English fonts are 51.6 KB after the Taka/Latin isolation; Bangla is 198 KB. `/products` warm p50 is 356 ms. PDP/cart/checkout image/text LCP still depends on Cloudinary TTFB (0.4-4 s observed) and is the next external bottleneck. Full before/after table and candidate log: `design/performance.md`.
- Catalog/PDP LCP images: first four catalog cards use `priority`; PDP gallery already uses priority/responsive sizes. Do not add more priority without measuring; Cloudinary variant cold-start dominates desktop catalog noise.
- Seller/admin consistency pass (page shell) deferred.
- Real product/category photography is still owner-supplied data; never fabricate or hotlink.
- Settings Playwright specs need the isolated `:5001`/`:3002` stack and an admin password; never run them against dev settings.
- Admin notification/content data can be repetitive in seed; that is data, not UI.

## 12. Documentation

- UI docs: `design/audit.md`, `design/performance.md`, `design/typography.md`, `design/cart-checkout.md`, `design/DIRECTION.md`, `design/MASTER.md`, `testing/live-log.md`.
- Backend contracts: `backend/docs/payments/`, `backend/docs/settings/`, `backend/docs/auth/`, `backend/docs/api/`, `backend/docs/testing/`.
- Single logs: `backend/docs/progress.md`, `backend/docs/decisions-log.md`. Append; do not create new progress files.

## 13. Money-path session (2026-11-18)

- Cart and checkout first paint is now server-rendered from the session cookie (`features/cart/server.ts`); client queries are seeded with that data and the district quote refreshes in place. Cart/checkout CLS measured 0.004-0.011 (target <= 0.1) and checkout LCP 1.83-1.99 s on the production/Slow-4G method. Details and the remaining render-path cost are in `design/performance.md`.
- Shared `<PasswordInput/>` (`components/ui/password-input.tsx`) is the only password field: FormField routes `type="password"` through it, the admin settings re-auth dialog uses it directly, and `tests/password-input-guard.test.ts` blocks raw password inputs.
- Clickable cards use the shared `lib/focus-ring.ts` utilities: keyboard-only rings (`:focus-visible` / `:has(a:focus-visible)`, inset so rails cannot clip them); `:focus-within` is not used on cards.
- Settings specs run on a production isolated stack (`:5001` API, `:3002` production frontend) via `backend/scripts/test-stack.ps1 start|stop|status|seed`; see `testing/live-log.md`.

## 14. Part 4 settlement UI (2026-11-19)

- Seller wallet replaces the old earnings screen at `/seller/earnings`: Available/Pending/On hold/
  Total withdrawn/COD dues, per-order release dates, transactions with type filter, payout profile,
  withdrawal dialog. Nav label is ï¿½Walletï¿½.
- Buyer order detail shows the snapshot return window, ï¿½Report a problemï¿½ and (when enabled)
  ï¿½Everything is fineï¿½ early release with a consequence dialog. Older delivered orders without a
  snapshot show a legacy-settled note.
- Admin: new `/admin/withdrawals` pay/reject queue, money-decision panel on complaint detail with
  order summary/evidence lightbox, settlement block + breach banner on reconciliation, dashboard
  queue counters, nav badges for disputes/withdrawals.
- Money is always rendered with `<Price>` (taka before amount, Latin digits); the test-stack stack
  language uses the existing tokens. No new dependencies.
- Shared header mobile padding/gaps were reduced so authenticated 360 px pages no longer overflow.
- Verification: `e2e/part4-settlement.spec.ts` (1/1, includes axe + 360 overflow) on the isolated
  production stack; `payments-advance.spec.ts` 12/12; Vitest 68 passed/1 skipped; typecheck, lint,
  production build green. Full report: `docs/testing/part4-live-report.md`.
- Known gaps: admin destination reveal is impossible with the masked API contract; dispute list
  seller/age/amount filters need API fields; forced reconciliation breach not created live;
  test-stack realtime still targets `:5000` (existing env issue).

## 15. Part 4 closing pass (2026-11-19)

- Admin withdrawal destination: masked until ï¿½Show payout detailsï¿½; password re-auth, copy, 60 s
  auto-hide/close, no cache. Endpoint contract in `backend/docs/payments/api.md`.
- Dispute filters (seller/age/amount/status) wired to the server; stale decision tabs show a conflict.
- Legacy ledger/order explanation and reconciliation help text added bn/en.
- Part 4 specs are independent (`e2e/part4-*.spec.ts`), including destination, filters, rejects,
  validation, multi-shop refund, window and permissions. Full report:
  `docs/testing/part4-live-report.md`.

## 16. Upload/banner follow-up (2026-11-19)

- Home banners now reference the owner-provided WebP files (anner-1..3 and mobile variants); a Vitest guard fails if a banner path is missing from public/.
- Admin Settings has an Image storage health card that calls POST /admin/uploads/storage-check (tiny upload, HEAD, delete).
- Production builds require NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME; the build fails early if it is missing.
- Storefront product/category images already use the custom Cloudinary loader; no loader change was made in this pass.


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

- **Architecture (developer decision): client → Next.js server → backend.** Browser code never calls the backend. Client Components call the same-origin Route Handler gateway (`/api/v1/*`); Server Components call the backend through `src/server/backend.ts`. The only direct browser → backend connection is the realtime socket (ticket-authenticated).
- **Auth:** httpOnly cookies owned by the Next.js origin (`ph_at`, `ph_rt`, issued only by the gateway/`proxy.ts`); tokens never touch client JS. Three-layer silent refresh: proxy → gateway refresh + replay → browser single-flight fallback; no loops. Contract: `backend/docs/auth/sessions.md`.
- **Payments:** COD and manual Advance (bKash/Nagad TrxID verification) are available; there is no gateway SDK. Advance is feature-flagged by Settings and must follow the real server state. Contract: `backend/docs/payments/api.md`.
- **shadcn/ui through its CLI only.** Search first, then `add`; customize only as allowed in `FRONTEND_DESIGN.md` §6.2. Review `git diff` after `add`.
- **Colors:** design tokens only (`FRONTEND_DESIGN.md` §6.1 / Appendix B). No hard-coded hex; one marigold CTA per screen region; respect contrast.
- **Light mode only** (`forcedTheme="light"`, `color-scheme: light`, no toggle, no theme storage). QA runs light only.
- **Typography:** Inter for Latin, Hind Siliguri for Bangla. The supplied `Kalpurush.ttf` has no Bengali glyphs and is not wired. Use one `<Price>` renderer, Latin digits, taka sign before amounts.
- **UI must look intentional**, not default components. Follow `design/DIRECTION.md` and `FRONTEND_DESIGN.md` §6.5.
- **Look at your work:** Playwright at 360 and 1280 (bn + en), loading/empty/error states, console/network errors, axe where available. A UI task is not done until verified visually.
- `proxy.ts` is a UX gate, not the security boundary: re-verify sessions in server layouts/data access (`requireSession`); the backend stays authoritative.
- **No hard-coded UI text:** every string via next-intl (`bn` default, `en`). Server is authoritative for prices/totals/stock/commission; treat money as opaque strings.
- Messaging is not available: do not build chat UI. No `dangerouslySetInnerHTML`; validate `returnTo`; no secrets in `NEXT_PUBLIC_*`.
- Do not add features, pages or dependencies outside the design. If something is missing, choose the simplest safe option and log it.

## 5. Working protocol

1. Read the relevant docs above, run `git status`, inspect `src/`, and continue from the current state. Do not redo finished work.
2. Work in small vertical slices: implement → tests → `npm run lint`, `npm run typecheck`, `npm test`, targeted Playwright → fix → commit locally.
3. Run a production build once per phase/major step, not after every edit.
4. Visual QA is part of every UI task; list the pages and viewports actually verified.
5. Update the canonical docs (`backend/docs/progress.md`, relevant `frontend/docs/design/*`) instead of creating new files.
6. When the design is ambiguous, choose the simplest safe option and log it. Ask only when blocked by external information or an irreversible money/business choice.
7. If context resets, `FRONTEND_CONTEXT.md` + `FRONTEND_DESIGN.md` + `backend/docs/progress.md` must be enough to resume.

## 6. Engineering standards

- TypeScript strict; no `any` (use `unknown` + narrowing); no unused code; no `console.log` in committed code.
- Server Components by default; `"use client"` only where interactivity requires it. Feature logic in `src/features/*`, not route files.
- Keep loading/empty/error/success/disabled/permission states; guest→authenticated cart; checkout validation; seller-wizard validation.
- Accessibility: semantic HTML, accessible names, keyboard support, visible focus, 44px targets, one `<main>` per page (owned by `SiteShell`), one `h1` per page.
- Money may arrive as strings; display with `Intl.NumberFormat` / `<Price>`, never compute prices as truth.
- Responsive at 360px, not a scaled desktop; verify mixed Bangla/English wrapping and line-height.

## 7. Current decisions and deviations

- Customer pages use `PageHeader` (one `h1` 24/30) + `PageContainer` (wide/reading/form/narrow); `SiteShell` owns the only `<main>`.
- Auth forms are `inert` with disabled Submit until hydration and use `method="post"` as a native fallback (no credentials in the URL).
- One date formatter: `formatLatinDateTime(value, locale)`; `formatDateTime` is a deprecated alias. Latin digits everywhere; ৳ before amounts.
- Home: all 11 categories + All categories, curated plants-only/in-stock rails, adjacent-rail dedupe, sparse rails hidden below 4 unique cards (`HOME_RAIL_MIN = 4`), All products feed includes accessories honestly.
- Shared card surface: `rounded-xl` (feature `rounded-2xl`), `border-border/60`, `shadow-[var(--shadow-soft)]`.
- Checkout with an empty cart shows the shared empty state, not a zero-total form.
- Order detail maps the raw payment enum to the localized label; no raw enums in customer copy.
- Seller/admin keep the dark-ink `DashboardShell` and 36px compact controls; adopting the customer page shell is deferred.
- Payment/auth state is never faked in UI; disabled and permission-denied states must remain.

## 8. Pages and routes

Authoritative route list: `FRONTEND_DESIGN.md` §7. Built areas: public home/catalog/PDP/shops/cart/checkout/payment/auth/static, customer account/orders/wishlist/notifications/complaints, seller onboarding/dashboard/products/orders/earnings, admin dashboard/sellers/products/orders/payments/refunds/payouts/settings/content.

## 9. Environment and how to run

- `npm install`, then `cp .env.example .env.local` and fill values. Backend default `http://localhost:5000`; use `API_INTERNAL_URL=http://127.0.0.1:5000` (IPv4).
- `npm run dev` → `:3000`; one supervised API on `:5000`; `:3100` stays off.
- Production build into a throwaway dir: `NEXT_DIST_DIR=.next-prod npm run build`; do not delete `.next` while the dev server runs.
- Public env: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL`. Server-only: `API_INTERNAL_URL`, `BFF_SHARED_SECRET`, `BACKEND_TIMEOUT_MS`, `GATEWAY_MAX_BODY_MB`, `REVALIDATE_SECRET`, `SITE_ORIGINS_EXTRA`.

## 10. Customer-facing rules (current)

- **Digits:** Latin (0-9) in every locale, including bn. Use the shared formatters; never use a Bangla numbering system. Taka sign precedes the amount.
- **Auth entry:** `/login`, `/register`, `/register/seller` are guest-only; valid sessions redirect to a sanitized relative next/callback/returnTo or role home. Stale cookies clear through `/auth/continue`.
- **Product card:** image, name (2 lines), price, rating row; no shop name. Rating row sits under the price on every variant; count > 0 shows one filled marigold star + one-decimal average + `(count)`; count = 0 shows a muted outline star + "No reviews yet" with the same reserved height and a localized aria-label.
- Demo data: `npm run db:seed:demo:reviews` (cleanup: `npm run db:seed:demo:reviews:cleanup`).

## 11. Known issues and next steps

- Cart/checkout CLS (~0.42/0.40) and checkout LCP ~4.3 s: reserve summary/address geometry or server-render a stable first summary line.
- Catalog LCP ~3.0 s: first-row image priority candidate; verify it does not delay fonts.
- Seller/admin consistency pass (page shell) deferred.
- Real product/category photography is still owner-supplied data; never fabricate or hotlink.
- Settings Playwright specs need the isolated `:5001`/`:3002` stack and an admin password; never run them against dev settings.
- Admin notification/content data can be repetitive in seed; that is data, not UI.

## 12. Documentation

- UI docs: `design/audit.md`, `design/performance.md`, `design/typography.md`, `design/cart-checkout.md`, `design/DIRECTION.md`, `design/MASTER.md`, `testing/live-log.md`.
- Backend contracts: `backend/docs/payments/`, `backend/docs/settings/`, `backend/docs/auth/`, `backend/docs/api/`, `backend/docs/testing/`.
- Single logs: `backend/docs/progress.md`, `backend/docs/decisions-log.md`. Append; do not create new progress files.

# PlantHaat — Frontend Design Document

Audience: the AI coding agent building the Next.js frontend, and the developer reviewing it.
Companions: `FRONTEND_CONTEXT.md` (working rules + progress log), `backend/openapi.json` (exact request/response shapes — **source of truth for DTOs**), `backend/docs/BACKEND_DESIGN.md` (domain rules), `backend/docs/BACKEND_CONTEXT.md` (backend decisions log — read §0, §9 "Decisions & deviations", §10, §11 only), `backend/docs/BACKEND_CHANGE_REQUESTS.md` (backend work the developer gives to the backend agent; check `backend/docs/BACKEND_CONTEXT.md` to see which items are already delivered).

This document describes **behavior, UX and architecture**. Where it conflicts with `openapi.json` on field names/shapes, `openapi.json` wins; log the difference.

---

## 0. Product, users, principles

PlantHaat is a multi-vendor online plant marketplace for Bangladesh. One Next.js app serves three audiences through role-based areas: **customers** (browse, buy with COD, track, review, complain), **sellers** (apply, run a shop, manage products/orders/earnings), **admins** (verify sellers, moderate, handle disputes and finance).

Principles:
1. **Mobile-first.** Most Bangladeshi users are on mid-range Android phones over 3G/4G. Design at 360 px first; keep JS small; fast first paint.
2. **Trust is the product.** Show verified-seller badges, ratings, delivery estimates, clear policies, honest stock/availability.
3. **Bangla and English.** Every user-facing string is translatable; Bangla is the default.
4. **The server is authoritative.** Never compute prices, totals, commission or stock decisions as truth on the client; display what the API returns.
5. **Calm error handling.** Users never see raw errors, expired-session failures, or blank screens.
6. **Use the framework.** Lean on Next.js (App Router) features — Server Components, streaming, caching/revalidation, route-level conventions, built-in image/font/metadata optimization — instead of re-inventing them on the client (§9).

### Assumptions and decisions (change only with a logged reason)
- Single Next.js App Router app, TypeScript strict, Bangla default locale with English toggle. The plan assumes **Next.js 16** (Cache Components / `"use cache"`, `proxy.ts` replacing `middleware.ts`, Turbopack, React 19.2). If the installed major differs, use the equivalent mechanisms and log it. Read the installed version's official docs before using caching/proxy/parallel-route APIs; do not guess signatures.
- **BFF architecture (developer decision): client → Next.js server → backend.** The browser never calls the backend API. Client Components call Next.js Route Handlers; Server Components and Route Handlers call the backend from the Next.js server. The single exception is the realtime socket (§3.6).
- The Next.js server owns the browser cookies; the backend stays unaware of the browser (it receives `Authorization: Bearer` from the BFF).
- Payments: **Cash on Delivery** and manual **Advance** (bKash/Nagad TrxID verification, feature-flagged in Settings) are implemented. There is no gateway SDK.
- Notifications are **realtime over a WebSocket** (ticket-authenticated, direct to the backend) with a polling fallback; the same socket will carry messaging later.
- Guests may browse and fill a cart locally; login is required to check out.

---

## 1. Stack

Use latest stable versions at scaffold time (the developer runs `create-next-app` with TypeScript, Tailwind, ESLint, App Router, `src/` dir, alias `@/*`). Recommended libraries (substitute only with a logged reason):
- **Next.js (App Router) + React**, TypeScript `strict`, Turbopack. Use `server-only` to fence server code.
- **Tailwind CSS v4** + **shadcn/ui** (installed **only through the shadcn CLI**, see §6.2 and Appendix A), `lucide-react`, `sonner`.
- **Axios** — the HTTP client for all application API calls (browser client and server data client; §3.1, §3.5).
- **next-themes** is installed but forced to light (`forcedTheme="light"`, §6.4); there is no dark mode or toggle. Animation: CSS/Tailwind (`tw-animate-css`, transitions) first; **`motion`** (LazyMotion `domAnimation`, dynamically imported, used sparingly, honoring `prefers-reduced-motion`) is allowed for section reveals and add-to-cart feedback (§6.5).
- **TanStack Query** (client server-state), **TanStack Table** (admin/seller tables), **react-hook-form** + **zod** (+ `@hookform/resolvers`).
- **next-intl** (cookie-based locale, no URL prefix in v1).
- **openapi-typescript** for **types only**, generated from `backend/openapi.json` and applied to the Axios helpers.
- **socket.io-client** for realtime.
- **recharts** (dynamic import, analytics only).
- Tests: **Vitest** + Testing Library + **MSW**; **Playwright** for e2e. Optional `@next/bundle-analyzer`.
- Fonts via `next/font`: a Bengali-capable family (e.g. Hind Siliguri or Noto Sans Bengali) + Latin, `display: swap`, limited subsets.

Do not add UI kits, state managers or animation libraries beyond this list without logging the reason.

---

## 2. Project structure

```
frontend/
  src/
    app/
      (public)/            # home, products, shops, static pages
      (auth)/              # login, register, register/seller, verify-email, forgot/reset-password
      (customer)/          # cart, checkout, orders, account, wishlist, notifications, complaints
      (seller)/seller/     # onboarding wizard + dashboard areas
      (admin)/admin/       # admin console
      api/
        v1/[...path]/route.ts   # BFF gateway: browser -> Next.js -> backend (all verbs)
        revalidate/route.ts     # optional, secret-protected on-demand revalidation
      layout.tsx  loading.tsx  error.tsx  global-error.tsx  not-found.tsx
      sitemap.ts  robots.ts  opengraph-image.tsx
    proxy.ts               # (Next 16; middleware.ts on older majors) session refresh + route guard + headers
    server/                # every file imports 'server-only'
      backend.ts           # serverApi (Axios): base URL, per-call Bearer, envelope, errors, timeouts
      session.ts           # getSession()/requireSession(roles) (React cache), JWT exp/role decode (no verify)
      cookies.ts           # backend Set-Cookie -> Next cookies translation, clear helpers
      refresh.ts           # single-flight refresh keyed by refresh-token value
      gateway/             # allow-list, csrf/origin check, header forwarding, body streaming, errors
      cache-tags.ts        # tag names + mutation-route -> tags map
    features/              # per-domain hooks/components (auth, catalog, cart, checkout, orders, seller, admin, notifications)
    lib/                   # client-safe: api/ (browser client -> /api/v1, errors, queryKeys, schema.d.ts), realtime/, i18n/, format/, cart/
    components/            # ui/ (shadcn), layout/, product/, order/, forms/, feedback/
    messages/              # bn.json, en.json
  openapi/openapi.json     # copied from backend (do not hand-edit)
  tests/  e2e/
```
Rules: code under `server/` is never imported from client components (enforced by `server-only`); the backend URL, `BFF_SHARED_SECRET` and any secret never reach the client bundle; feature logic lives in `features/*`, not in route files.

---

## 3. API integration — Backend-for-Frontend (BFF)

### 3.1 Topology (developer decision: client → Next.js server → backend)
Exactly three call paths:
1. **Server Components / cached server functions → backend** through `serverApi` (`src/server/backend.ts`, base `API_INTERNAL_URL`). Public data: no auth. Private data: the session access token is sent as `Authorization: Bearer`. **Never call your own Route Handlers from Server Components** — call the shared server function directly.
2. **Client Components → Next.js Route Handler gateway → backend.** Client code (TanStack Query hooks, forms) calls same-origin `/api/v1/*`; the gateway at `src/app/api/v1/[...path]/route.ts` forwards to `${API_INTERNAL_URL}/api/v1/*`. The path shape equals the backend's, so the generated OpenAPI types apply to both sides.
3. **Realtime socket → backend directly** (WebSockets cannot pass through Route Handlers), authenticated with a short-lived ticket requested through the gateway (§3.6).

**HTTP client rule (developer decision): Axios** is used for all application API calls — the browser client (`src/lib/api/client.ts`) and the server data client (`src/server/backend.ts`, `serverApi`). The only exception is the gateway's upstream forwarding (§3.2), which uses native `fetch` (undici) because it must stream bodies and forward headers and `Set-Cookie` faithfully; log this exception. Configuration in §3.3 and §3.5.

Server Actions are **not** used for backend mutations in v1: one mutation path (the gateway) keeps auth, CSRF, retries, cache invalidation and tests in one place. If added later for progressive enhancement, they must reuse the same server helpers.

### 3.2 Gateway behavior (Node runtime; export `GET POST PUT PATCH DELETE`)
- **Allow-list:** forward only normalized paths under `/api/v1/`; reject anything else (`..`, encoded traversal, absolute URLs). The upstream base is fixed by env — no user-controlled hosts (SSRF safe).
- **CSRF / origin check:** for non-GET/HEAD requests require an `Origin` (or `Referer`) whose origin matches the site's own origin(s) (`NEXT_PUBLIC_SITE_URL` + optional extras); otherwise `403 ORIGIN_NOT_ALLOWED`. Cookies are `SameSite=Lax` as a second layer.
- **Auth to backend:** read the `ph_at` cookie and send `Authorization: Bearer <ph_at>`. Do **not** forward the browser's `Cookie` header. Exception: for `/auth/refresh` and `/auth/logout` send `Cookie: ph_rt=<value>` (the backend reads the refresh token from that cookie). Verify early (F1) that the backend's `OriginGuard` accepts Bearer requests that carry no `Origin`; if not, log a backend change request.
- **Forwarded headers:** `Content-Type`, `Accept-Language`, `Idempotency-Key`, the browser's `User-Agent`, `X-Request-Id` (generate if absent), `X-Forwarded-For` (client IP taken from the hosting platform's trusted header), and `X-BFF-Key: <BFF_SHARED_SECRET>` when configured. Strip hop-by-hop headers; never forward `Host`.
- **Bodies:** stream request and response bodies (multipart uploads, large lists) without buffering where possible; enforce `GATEWAY_MAX_BODY_MB` (default 12); timeouts `BACKEND_TIMEOUT_MS` (default 15 s; 60 s for uploads).
- **Cookie translation:** backend `Set-Cookie` for `ph_at`/`ph_rt` are re-issued to the browser as Next cookies: `httpOnly`, `secure` in production, `sameSite=lax`, `path=/`, `maxAge`/`expires` taken from the backend header; ignore the backend's `Domain`/`Path`. Translate the backend's cookie-clearing headers the same way. **Never** pass any other backend `Set-Cookie` through.
- **Server-side silent refresh + replay:** if the backend answers `401` with `TOKEN_EXPIRED`/`UNAUTHENTICATED` (and the request is not an `/auth/*` call) and `ph_rt` exists: call backend refresh once (**single-flight per `ph_rt` value** in an in-process map), set the new cookies on the outgoing response, and replay the original request once. Buffer small JSON bodies so they can be replayed; for streamed bodies (multipart uploads) refresh **before** forwarding when the access token is expired or within 30 s of expiry (decode `exp` locally for scheduling only). A second `401` is returned as-is.
- **Errors:** backend responses pass through unchanged (status + envelope). Gateway-level failures use the same envelope with codes `GATEWAY_UNREACHABLE` (502), `GATEWAY_TIMEOUT` (504), `ORIGIN_NOT_ALLOWED` (403), `PAYLOAD_TOO_LARGE` (413).
- **Headers on responses:** authenticated and mutation responses `Cache-Control: private, no-store`. Never let shared caches store gateway responses.
- **Cache invalidation:** after a successful mutation, invalidate the tags mapped to that route (§9.3).
- **Logging:** method, path, status, duration, request id only — never tokens, cookies or bodies.

### 3.3 `serverApi` rules (Axios, server-only)
- `import 'server-only'`. One Axios instance: `baseURL: ${API_INTERNAL_URL}/api/v1`, `timeout: BACKEND_TIMEOUT_MS`, and `allowAbsoluteUrls: false` (if the installed Axios supports it) so a caller-supplied absolute URL can never redirect a request — and its credentials — to another host.
- **Never put an `Authorization` default on the shared instance.** The server process serves many users; build headers per call from `getSession()` (`{ headers: { Authorization: 'Bearer …' } }`) to avoid cross-request token leakage.
- Axios does not use Next.js's `fetch` cache. Express caching at **function level**: public reads are `"use cache"` functions with `cacheTag`/`cacheLife` (or `unstable_cache` if the installed Next.js lacks Cache Components). Do not pass `next: {…}` options to Axios, and never pass tokens into cached functions (only serializable, non-secret arguments).
- **Server Components cannot set cookies**, so `serverApi` never refreshes sessions — refresh happens earlier in `proxy.ts` (§4.3) or in the gateway. Use React `cache()` to deduplicate `getSession()`/`me` within one render.
- Envelope unwrapping and error normalization are shared with the browser client (`lib/api/common.ts`).

### 3.4 Envelope and errors
Success: `{ success: true, data, meta? }` → clients unwrap to `{ data, meta }`. Error: `{ success: false, statusCode, error: { code, message, details? } }` → throw `ApiError(code, status, details)`.
- Map `error.code` → i18n key (`errors.<CODE>`); unknown codes fall back to a generic localized message (never show backend English text to users, except validation details).
- `422` with `details[]` (validation / `CHECKOUT_VALIDATION_FAILED`) → field errors in forms or per-line issues in checkout. `429` → friendly retry message (respect `Retry-After`). Network failure → inline retry UI; never a blank page.
- Localize at minimum: auth (`UNAUTHENTICATED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_REGISTERED`, `SESSION_EXPIRED`, `ORIGIN_NOT_ALLOWED`), cart/checkout (`CART_EMPTY`, `INSUFFICIENT_STOCK`, `CHECKOUT_VALIDATION_FAILED`, `SHOP_UNAVAILABLE`, `SHOP_ON_VACATION`, `SHOP_NOT_DELIVERING_TO_DISTRICT`, `PAYMENT_METHOD_NOT_AVAILABLE`), gateway codes, plus every code in `openapi.json` / `backend/docs/BACKEND_CONTEXT.md` §9. Keep one registry file so missing translations are easy to find.

### 3.5 Axios clients and types
`npm run api:types` reads `openapi/openapi.json` and generates `src/lib/api/schema.d.ts` (commit both, so installs don't need the backend). Typed helpers wrap Axios using those `paths` types so each call's params, body and response are typed; where the spec lacks response schemas, write a zod schema/type by hand next to the feature, note it in `FRONTEND_CONTEXT.md`, and report big gaps as backend change requests.

**Browser client** (`src/lib/api/client.ts`):
- `axios.create({ baseURL: '/api/v1', timeout: 15000, allowAbsoluteUrls: false })`; uploads override the timeout per request (60 s). Same-origin cookies are sent automatically; do not enable XSRF features.
- `paramsSerializer: { indexes: null }` so array filters serialize as repeated keys (`light=A&light=B`) instead of Axios's default bracket style — confirm against how the backend parses query arrays.
- Multipart uploads: pass `FormData` and let Axios set the boundary (never set `Content-Type` manually); use `onUploadProgress` for progress UI; pass TanStack Query's `signal` as Axios's `signal` for cancellation.
- **Response interceptor:** normalize every `AxiosError` into `ApiError` (`code`, `status`, `details`; network failure → `NETWORK_ERROR`, `ECONNABORTED` → `TIMEOUT`, cancellation re-thrown as cancellation); successful responses keep the envelope and helpers return `{ data, meta }`.
- **Refresh interceptor** (§4.3 layer 3): single-flight refresh, retry the original request once using a `_retried` flag on the request config (augment `AxiosRequestConfig`), never for `/auth/*` URLs.
- Pin an exact current Axios 1.x version and keep it updated.

### 3.6 Realtime (WebSocket, ticket-authenticated)
- Hook `useRealtime()` (client-only, mounted once in the authenticated layouts) with a single typed socket module (event map) that messaging will reuse later.
- **Connect:** `POST /api/v1/realtime/ticket` through the gateway → `{ ticket, url? }` (one-time, ~30 s). Then `io(NEXT_PUBLIC_REALTIME_URL, { transports: ['websocket'], auth: { ticket }, reconnection: false })`. This is the only direct browser→backend connection; it carries no cookies.
- **Reconnect manually:** on disconnect (server `reauth` after max age, network loss, server restart) fetch a **fresh ticket** (the gateway refreshes the session if needed) and reconnect with exponential backoff + jitter (1 s → 30 s). Disconnect when the tab has been hidden > 2 minutes (mobile battery); reconnect on visible. Disconnect on logout.
- **Events (server → client):** `notification:new` (prepend to the notifications cache, bump the unread count, toast if visible, deep-link by `type`), `notification:unread_count` (set count), `notification:refresh` (invalidate notification queries), `session:revoked` (clear auth state, redirect to login). Future: `message:*`.
- **Fallback:** if the socket cannot connect (blocked network, or the backend feature is not deployed yet) poll `GET /notifications/unread-count` every 60 s while the tab is visible and on focus; stop polling while the socket is connected. Implement the polling path first behind the same hook so F4 does not depend on the backend change.
- The backend must run on a persistent server (not serverless) for sockets; the frontend host does not need to support WebSockets.

### 3.7 Data conventions
- Money: Decimal values may arrive as **strings**. Treat as opaque; format with `Intl.NumberFormat` (`bn-BD`/`en-BD`, `BDT`, ৳) for display only. Never sum/multiply money on the client except trivial display math the server also returns.
- Dates are UTC ISO strings; display in `Asia/Dhaka`.
- Pagination: `?page&limit` with `meta {page, limit, total, totalPages}`; filters live in the URL query string (shareable, back-button safe). Query keys centralized in `queryKeys.ts`; mutations invalidate precisely.
- Phone numbers: accept `01XXXXXXXXX`, `+8801…`; validate with `^(?:\+?88)?01[3-9]\d{8}$`.
- Uploads: `POST /uploads/images` (multipart `file`, `purpose` ∈ avatar|product|shop-logo|shop-banner|review|complaint|banner|category) → `{ url, key }`; seller documents `POST /uploads/documents` → `{ key }`, both through the gateway (streamed). Client-side checks (type, ≤ 5 MB images / 10 MB PDFs) are UX only; show progress and per-file errors. If the host limits request bodies (many serverless hosts cap them around 4–5 MB), test early and log it; the fallback is the optional presigned-upload change request.

---

## 4. Authentication (BFF model)

### 4.1 Cookie model
`ph_at` (access token, 15 min) and `ph_rt` (refresh token, 30 days) are **httpOnly cookies owned by the Next.js origin**, issued only by the gateway/`proxy.ts` (translated from the backend's headers, §3.2): `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/` (both, so `proxy.ts` and Server Components can use them). The browser never talks to the backend and **JavaScript never reads or stores tokens** (no localStorage/sessionStorage/memory copies). Login/register/refresh responses also return `accessTokenExpiresAt` (epoch ms) for scheduling. Optional production hardening: `__Host-` cookie name prefix (needs `Secure`, `Path=/`, no `Domain`) — adopt only if it works across the target browsers and local dev; log the decision.

### 4.2 AuthProvider and session reads
- **Private areas** (`(customer)`, `(seller)`, `(admin)` layouts) are dynamic Server Components: `requireSession(roles)` calls `GET /auth/me` via `serverApi` (React `cache`), redirects anonymous users to `/login?returnTo=` and wrong roles to a localized "not allowed" page, and passes `initialUser` to a client `AuthProvider`.
- **Public pages** stay static/cached; auth-dependent bits (header menu, cart count, wishlist hearts) resolve on the client through `AuthProvider`/TanStack Query (`GET /api/v1/auth/me`), with skeletons — they must never make the whole page dynamic.
- Provider API: `login`, `register`, `registerSeller`, `logout`, `refreshUser`. After login/register: update the provider, merge the guest cart (§8.1), `router.replace(returnTo || roleHome)` and `router.refresh()` so Server Components re-render with the new cookies. After logout: gateway clears cookies, clear TanStack caches and the socket, `router.refresh()`.

### 4.3 Silent refresh (users never notice expiry; the API is not spammed)
Three layers, in order of preference:
1. **`proxy.ts` (before rendering private routes).** Matcher: private areas (`/cart`, `/checkout`, `/orders`, `/account`, `/wishlist`, `/notifications`, `/complaints`, `/seller`, `/admin`) — not `/api`, static assets or public pages. If `ph_at` is missing or has ≤ 30 s left (decode `exp`) and `ph_rt` exists: call the backend refresh (**single-flight per `ph_rt` value**), set the new cookies on the response **and** on the forwarded request headers (`NextResponse.next({ request: { headers } })`) so Server Components in the same render see the fresh token. Refresh fails → clear cookies, redirect to `/login?returnTo=`. No cookies at all → redirect to login. Skip refresh for prefetch requests (`Next-Router-Prefetch` / `Purpose: prefetch`) and use `prefetch={false}` on links into private areas. Also do coarse role routing from the decoded `role` for `/admin` and `/seller` — **UX only**.
2. **Gateway refresh + replay** for client-initiated API calls (§3.2).
3. **Browser client fallback:** if a `401 TOKEN_EXPIRED` still reaches the browser client (non-replayable request), run a **single-flight** `POST /api/v1/auth/refresh` and retry the original request **once**; a failure → toast "session ended" and redirect to login. Schedule a proactive refresh ~60 s before `accessTokenExpiresAt` and on tab focus. Sync tabs with `BroadcastChannel('planthaat-auth')` (fallback `storage` event): refresh result, logout, `session:revoked`. `/auth/login`, `/auth/register*`, `/auth/refresh`, `/auth/logout` never trigger refresh-and-retry, so there are no loops.
The backend's 10-second refresh grace window is the safety net for races (prefetch bursts, parallel tabs); the in-process single-flight reduces them but cannot span server instances.

### 4.4 Guards and policies
- `proxy.ts` is a performance/UX gate, **not the security boundary** (middleware-bypass advisories have existed in the ecosystem). Every private Server Component layout/data access re-verifies with `requireSession`, and the backend remains authoritative.
- **Email verification gating:** customers can browse/cart without verifying, but checkout and seller-application submit require it. Persistent dismissible banner with "Resend email" (60 s cooldown countdown) and a `/verify-email?token=` page.
- **Seller status gating** (`me.sellerStatus`): `DRAFT` → onboarding wizard; `PENDING` → "under review" screen; `REJECTED` → show `rejectionReason`, edit and resubmit; `SUSPENDED` → notice, operational pages disabled; `APPROVED` → dashboard. Onboarding endpoints (`/seller/application*`, `/seller/shop`, `/seller/delivery-zones`, payout accounts) work for any seller status; operational endpoints (products, orders, earnings, analytics, dashboard) need `APPROVED` + active shop.
- Sessions page (`/account/sessions`): list devices from `GET /auth/sessions`, revoke one, "log out everywhere" (`POST /auth/logout-all`), mark the current one.
- `423 ACCOUNT_LOCKED` → wait message; generic message for `INVALID_CREDENTIALS` (never hint whether the email exists).

---

## 5. Internationalization and formatting

- `next-intl`, locales `bn` (default) and `en`; locale stored in a cookie (`NEXT_LOCALE`); language switcher in header/footer. All strings live in `messages/{bn,en}.json` (namespaced by feature). **No hard-coded UI text** in components.
- Use bilingual API fields when present: `nameBn`/`name` for products, categories, districts. Fall back to the other language when empty.
- Numbers/currency/dates via `Intl` with `bn-BD`/`en-BD`; Bangla digits in `bn`. Order numbers, SKUs and phone numbers always render in Latin digits to avoid confusion when copying.
- Write natural Bangla copy (not literal translation); the developer reviews wording. Keep a glossary in `messages/README.md` (e.g. order = অর্ডার, cart = কার্ট, delivery charge = ডেলিভারি চার্জ, verified seller = যাচাইকৃত বিক্রেতা).
- Order status labels (localized, with color + icon, never color alone): `PENDING` awaiting seller, `CONFIRMED`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `FAILED_DELIVERY`; same for product, seller, complaint and refund statuses.

---

## 6. Design system and UX standards

- Visual identity: fresh, natural, trustworthy — forest greens with a warm marigold call-to-action (§6.1), generous whitespace, capsule/pill buttons and chips, rounded cards, large touch targets (≥ 44 px). All colors, radius, spacing and type scale are design tokens (CSS variables mapped through Tailwind v4 `@theme inline`; Appendix B); **light and dark themes** (§6.4) and a modern visual language (§6.5).
- Layout: sticky mobile header (logo, search, cart with count, account), bottom navigation on mobile for customers (Home, Categories, Cart, Orders, Account); desktop header with mega category menu. Seller/admin: collapsible sidebar on desktop, drawer on mobile; tables degrade to cards on small screens.
- Every list/detail has **loading (skeleton), empty (helpful message + action), error (retry)** states.
- Forms: react-hook-form + zod, inline field errors, disabled-while-submitting buttons, preserve input on error, accessible labels/`aria-*`, correct `inputmode`/`autocomplete` (tel, email, address fields).
- Destructive or irreversible actions (cancel order, reject seller, remove product, suspend) use a confirm dialog with required reason where the API requires one.
- Toasts for transient success/failure; page-level alerts for persistent states (unverified email, shop on vacation, seller pending).
- Accessibility: semantic HTML, keyboard navigation, visible focus, color contrast AA, `alt` text, reduced-motion respected, screen-reader labels on icon buttons. Target Lighthouse a11y ≥ 95.
- Performance targets (mid-range Android, 4G): LCP < 2.5 s on home and product pages, CLS < 0.1, public-page initial JS ≲ 150 KB gzip. Use `next/image` with sizes/lazy loading, dynamic import for charts/editors/dialogs, no heavy libs on public pages, server-render catalog pages.
- Product descriptions are plain text: render with `white-space: pre-wrap`; never `dangerouslySetInnerHTML`.

### 6.1 Color system (decided)
The developer's forest-green palette is the **brand base**; it suits a plant marketplace (nature, freshness, calm trust). Because a monochrome green UI makes the buy button blend in with everything else — and the product photos are green too — add derived neutrals and **one warm accent reserved for the primary conversion action**.

| Token | Hex | Role |
|---|---|---|
| ink | `#0F2A1D` | Text, headings, dark chrome (footer, seller/admin sidebar) |
| forest | `#375534` | Primary brand/UI actions, links, active navigation (white text on it: 8.4:1) |
| sage | `#6B9071` | Form-control borders, icons, decorative accents. **Never text on light backgrounds** (3.0–3.6:1) |
| mist | `#AEC3B0` | Decorative dividers, subtle borders, disabled fills, chips |
| cream | `#E3EED4` | Section bands, hover/selected surfaces, badges |
| paper (derived) | `#F6FAF0` | App background |
| white | `#FFFFFF` | Cards, inputs, popovers (product photos sit on white) |
| muted text (derived) | `#4F6B55` | Secondary text (4.9:1 on cream, 5.9:1 on white) |
| **marigold (CTA)** | `#F2A93B` | Primary purchase/conversion actions and rating stars; text on it is **ink** (7.7:1) |
| offer | `#C2562D` | Discount/offer badges only (white text 4.5:1) |
| success / warning / error / info | `#2E7D32` / text `#8A5A00` on `#FDF3DC` / `#B3261E` / `#1F6F8B` | Semantic states (always with icon + label) |

Rules:
1. **One primary CTA per screen region** uses marigold (Add to cart, Place order, Submit application, Apply filters on mobile). Everything else is forest (primary), outline, or ghost. Do not use marigold for decoration.
2. Text contrast ≥ 4.5:1 (AA) and UI-boundary contrast ≥ 3:1. Allowed text pairs: ink on white/paper/cream/mist; forest on white/paper/cream; white or cream on forest; cream on ink; ink on marigold; white on offer/error/success/info. **Forbidden:** sage or mist as text on light backgrounds; ink on forest.
3. Keep the UI around product photos neutral (white cards, paper background) so the green plants stand out; use forest/ink for chrome, not as card backgrounds behind photos.
4. Never convey status by color alone; pair with an icon and a label.
5. The vertical cream → forest gradient from the palette may be used for hero/marketing bands only, with text placed where contrast is verified; never behind forms or tables.
6. No hard-coded hex values in components — tokens only (`bg-primary`, `bg-cta`, `text-muted-foreground`, …).
7. Verify with axe and with Playwright screenshots (§6.3); re-check contrast after any token change. Colors can be A/B tested after launch; the stated reasons are contrast, CTA salience and consistency, not a guaranteed psychological effect.

### 6.2 shadcn/ui rules
- **UI primitives come from shadcn/ui through its CLI only.** Never hand-write, copy-paste or "re-implement" a component that shadcn provides (button, input, dialog, sheet, select, tabs, table, form fields, toast via `sonner`, sidebar, chart, …). Before building a UI piece: `npx shadcn@latest search <term>` / `list` / `docs <component>` / `view <component>`; if it exists, install it with `npx shadcn@latest add <component>`.
- Installed files in `src/components/ui/` may be **customized after install** (token usage, extra `cva` variants such as `cta` and `offer` on `Button`/`Badge`, i18n or accessibility fixes). After every `add`, review `git diff` so nothing customized is overwritten; do not pass `--overwrite` blindly.
- Anything shadcn does not ship (product card, order timeline, price block, quantity stepper, district picker, …) is **composed from installed shadcn primitives** in `src/components/<area>/` or `src/features/*`, never placed in `ui/`.
- Install components **per phase when needed** (lists in Appendix A); do not run `add --all`.
- Use the project tokens (Appendix B) only; keep Radix accessibility attributes intact.

### 6.3 Visual QA with Playwright (every UI task)
The agent has Playwright configured; use it to look at what you build:
1. Run the backend and the frontend dev server; open the page(s) you changed in a Playwright browser.
2. Take screenshots at **360×800 (primary)**, 768×1024 and 1280×800 and inspect them. Check: horizontal overflow, truncated or overlapping text, touch-target size, alignment/spacing, color use per §6.1, images missing/broken, Bangla rendering (font fallback, line-height ≥ 1.6, long words wrapping), both locales (`NEXT_LOCALE=bn|en`).
3. Exercise states: loading (throttle or delay responses), empty, error (intercept routes), validation errors, disabled/pending buttons, keyboard Tab order and visible focus, modal/sheet open and close.
4. Capture console errors/warnings and failed network requests; fix them.
5. Run axe (`@axe-core/playwright`) on the page; fix violations.
6. Iterate until clean. **A UI task is not done until it has been viewed at mobile and desktop widths**; record the pages/viewports verified in the progress log. Screenshots and reports are not committed (git-ignored).

### 6.4 Dark mode (DISABLED - light-only)

- The app is light-only (`forcedTheme="light"`, `:root { color-scheme: light }`); there is no toggle and no theme cookie/localStorage read. The `.dark` token block stays in `globals.css` unused until a new dark palette is designed.
- QA runs in light mode only, bn + en, at 360/768/1280.

### 6.5 Modern visual language (the UI must not look like unstyled defaults)
Target feel: fresh, airy, premium, organic — like a modern direct-to-consumer plant brand. Apply this to the shell and pages already built first, then to everything new.
- **Layout and rhythm:** `max-w-7xl` container, generous section spacing (`py-12 md:py-20`), 8-pt spacing rhythm, consistent radii (`rounded-2xl` cards, `rounded-3xl` feature blocks, pill buttons/chips), bento-style grids for categories/feature blocks, horizontal snap-scroll rails (`snap-x`) for product carousels on mobile.
- **Typography:** clear hierarchy — large display headings (`clamp(2.25rem, 6vw, 4.5rem)` on the hero), restrained body size (16 px mobile). **Never apply negative letter-spacing to Bangla text** (it breaks conjuncts); Bangla line-height 1.6–1.7; Latin headings may use tight tracking.
- **Surfaces:** layered cards with a 1 px `border-border/60`, soft shadows that lift on hover, subtle palette gradients (cream → paper in light; ink → background in dark), a few static decorative organic shapes (inline SVG leaves/blobs). Avoid large blur areas and animated blobs (low-end phones).
- **Header and navigation:** sticky, translucent header with `backdrop-blur` (header and mobile bottom nav only), prominent search (command-style with suggestions), category chip row; mobile bottom navigation for customers.
- **Home page:** hero with the palette's vertical gradient, strong headline, search, trust chips (verified sellers · cash on delivery · plant-safe packaging) and plant imagery; category bento grid; product rails (new arrivals, popular); featured verified shops as banner cards; "how it works" in 3 steps; reviews; seller call-to-action band; rich footer (policies, contact, language, theme).
- **Product card:** 4:5 image, hover zoom on desktop only, wishlist heart overlay, badges (offer, low stock, verified shop), rating, price with struck-through compare-at, shop name, quick-add (opens a variant sheet) as a marigold pill; skeleton shimmer while loading.
- **Product detail:** swipeable gallery with thumbnails, sticky purchase panel on desktop and a sticky bottom CTA bar on mobile, care-guide icon grid (light, watering, difficulty, pet-safe, height), delivery estimator by district, shop card, review summary with rating bars.
- **Seller/admin:** dark-ink sidebar, KPI cards with small charts (dynamic-imported), tables with sticky headers and filters, comfortable but dense layouts, polished empty states.
- **Motion (subtle, purposeful):** 150–250 ms ease-out transitions, hover lift, press feedback (`active:scale-[0.98]`), skeleton shimmer, sheet/dialog transitions from shadcn, add-to-cart feedback (cart icon bump + toast), at most one decorative animation per viewport; everything respects `prefers-reduced-motion`.
- **Imagery and icons:** real seeded product photos in consistent aspect ratios with blur placeholders; `lucide-react` with one stroke weight; simple inline-SVG illustrations for empty states.
- **Guardrails:** keep the performance targets of §9.5 (no heavy filters, no autoplay video, minimal JS for animation). Reviewer checklist before a UI task is done: one clear focal point per screen, consistent spacing and radii, token-only colors, real imagery, micro-interactions present, light mode verified at 360/768/1280.

---

## 6.5.1 Customer page shell and 2026-11 additions (implemented)

- **Page shell:** `PageHeader` (one `h1` 24 px mobile / 30 px md, 700, description + actions) and `PageContainer` (wide 7xl, reading 5xl, form 3xl, narrow 2xl; shared `px-4 py-8 lg:py-12`). `SiteShell` owns the only `<main id="main">`; pages never nest `<main>`. AuthCard has a real `h1`; auth forms are inert until hydration with a native POST fallback.
- **Home:** all 11 categories + All categories, five plants-only/in-stock rails (adjacent dedupe, sparse rails hidden below 4 unique cards), one Highlights band, honest All products feed. `HOME_RAIL_MIN = 4`; curation lives in `home-rail-products.ts`.
- **Typography:** Inter for Latin, Hind Siliguri for Bangla (Kalpurush file is invalid and not wired), one `<Price>` renderer, Latin digits with the taka sign before amounts, one `formatLatinDateTime` implementation.
- **Payments:** checkout selector (COD | Advance) driven by public Settings; buyer payment page is snapshot-driven with provider toggle, copyable number, 4 steps, TrxID/proof form and UNPAID/PENDING/PAID/REJECTED/EXPIRED/underpaid states; admin verification/refund queues; seller shipping gate until PAID. Contract: `backend/docs/payments/api.md`.
- **Auth sessions:** 15-minute access JWT; role-based sliding + absolute refresh sessions (customer 30/90, seller 14/60, admin 7/30 days); proxy + gateway + browser single-flight refresh; no tokens in JS storage. Contract: `backend/docs/auth/sessions.md`.
- **Docs layout:** all docs live in `frontend/docs/` and `backend/docs/`; no workspace-root docs (the root holds `AGENTS.md` and opencode config only).

## 7. Information architecture and routes

Legend: 🌐 public, 🔑 any logged-in, C customer, S seller, A admin.

### 7.1 Public & auth
| Route | Purpose | API |
|---|---|---|
| 🌐 `/` | Home: hero banners, featured categories/products/shops, new arrivals, trust strip | `GET /home` |
| 🌐 `/products` | Search/browse with filters (category, price, light, difficulty, indoor, pet-safe, in-stock, delivers-to district, sort) in URL query | `GET /products`, `GET /categories`, `GET /locations/districts` |
| 🌐 `/products/[slug]` | Gallery, variant selector (size/pot, price, stock), care guide (light, watering, difficulty, pet-safe), shop card (verified badge, rating), delivery estimate by district, reviews, add to cart/wishlist, JSON-LD | `GET /products/:slug`, `GET /products/:slug/reviews` |
| 🌐 `/shops`, `/shops/[slug]` | Shop directory; storefront (banner, logo, rating, vacation notice, products) | `GET /shops`, `/shops/:slug`, `/shops/:slug/products` |
| 🌐 static | `/about`, `/how-it-works`, `/sell-with-us`, `/policies/{terms,privacy,refund-cancellation,delivery}`, `/contact` | content in code/messages |
| 🌐 `/login` `/register` `/register/seller` `/forgot-password` `/reset-password` `/verify-email` | Auth screens | `/auth/*` |

### 7.2 Customer (C)
| Route | Purpose | API |
|---|---|---|
| `/cart` | Grouped by shop, per-item issues, quantity steppers, delivery estimate by chosen district | `GET/PUT/DELETE /cart…` |
| `/checkout` | Address → per-shop delivery summary → payment (COD) → place order | `/addresses`, `/cart`, `POST /checkout` |
| `/orders`, `/orders/[id]` | History; detail with per-shop-order status timeline, tracking, actions (cancel, request cancellation, review, complaint) | `/orders…`, `/reviews`, `/complaints` |
| `/account` | Profile (name, phone, avatar), password change, notification preferences if exposed | `/users/me`, `/auth/change-password` |
| `/account/addresses`, `/account/sessions` | Address book (default rule, district select), device sessions | `/addresses`, `/auth/sessions` |
| `/wishlist` | Saved plants with availability | `/wishlist` |
| `/notifications` | List, mark read/all | `/notifications…` |
| `/complaints`, `/complaints/[id]` | Open, list, thread with seller/admin comments (internal notes never shown), attachments | `/complaints…` |

### 7.3 Seller (S) — `/seller/*`
| Route | Purpose | API |
|---|---|---|
| `/seller/apply` | Onboarding wizard (see §8.4) | `/seller/application…`, `/seller/shop`, `/seller/delivery-zones`, `/seller/payout-accounts`, `/uploads/documents` |
| `/seller/dashboard` | KPIs, pending orders, low stock, unread notifications, rating | `GET /seller/dashboard`, `/seller/analytics/overview` |
| `/seller/products`, `/new`, `/[id]/edit` | Product list (status filters), editor with variants, images, care info, stock | `/seller/products…`, `/seller/variants/:id/stock` |
| `/seller/orders`, `/[id]` | Incoming orders, status actions, tracking info, cancellation requests inbox | `/seller/orders…`, `/seller/cancellation-requests…` |
| `/seller/shop` | Shop profile, logo/banner, vacation mode | `/seller/shop…` |
| `/seller/delivery-zones` | Zones (districts or nationwide, charge, free-above, ETA) with overlap errors | `/seller/delivery-zones…` |
| `/seller/reviews`, `/seller/complaints(/[id])` | Reply/report reviews; respond to complaints | `/seller/reviews…`, `/seller/complaints…` |
| `/seller/earnings` | Balance, ledger, payouts (see §8.6) | `GET /seller/earnings` |
| `/seller/analytics`, `/seller/notifications`, `/seller/payout-accounts` | Charts; notifications; payout accounts (masked) | respective |

### 7.4 Admin (A) — `/admin/*`
Dashboard (`/admin/analytics/overview`); Sellers queue + detail with documents viewer and approve/reject/suspend/reactivate; Shops; Products moderation; Categories CRUD; Orders (+ status override, cancellation requests); Complaints (+ resolve, internal notes); Refunds; Review reports; Commission rules; Payouts, ledger, dues, adjustments; Users (suspend/reactivate, create admin); Content (banners, homepage sections); Announcements; Settings; Audit logs; Analytics. All lists are server-paginated with filters in the URL; sensitive actions use confirm dialogs and show the resulting audit entry or toast.

---

## 8. Key flows

### 8.1 Guest cart and merge
Backend carts require login. Guests get a **local cart** (`ph_guest_cart_v1` in localStorage; non-sensitive): items `{variantId, qty, snapshot{name, variantName, imageUrl, priceDisplay, shopName, slug}}`; quantity 1–20. Show a note that prices/availability are confirmed at login. On login/register: fetch server cart; for each guest line call `PUT /cart/items` with `min(20, serverQty + guestQty)` (clamp on `INSUFFICIENT_STOCK`, toast what changed); then clear the guest cart. Logged-in users use only the server cart (TanStack Query with optimistic quantity updates and rollback).

### 8.2 Cart and checkout
- Cart shows live per-item `issues[]` (out of stock, insufficient stock with `available`, product/shop unavailable) with fix actions; checkout is blocked until resolved.
- Checkout page (single page, stepped sections): (1) address - pick or add (district select with Bangla names), phone validation; (2) per-shop summary with delivery charge, free-delivery threshold progress, estimated days; (3) payment - COD or Advance per Settings (Advance redirects to the payment page); (4) review totals and **Place order**.
- Requires verified email (banner + resend if not). Generate an `Idempotency-Key` (UUID) per checkout attempt, keep it in memory/ref, **reuse it on retries after network errors/timeouts** (outcome unknown), and regenerate it only after a definitive failure or success.
- `422 CHECKOUT_VALIDATION_FAILED` → show details per line/shop (stock, vacation, not delivering to district) with links to fix; do not clear the cart.
- Success → `/orders/[id]` with a confirmation state (order number, per-shop orders, COD amounts, expected delivery); invalidate cart/orders queries.

### 8.3 Order tracking and customer actions
Per shop order: status stepper (PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED; cancelled and failed-delivery variants), history timestamps if the API returns them, courier/tracking/ETA when present, totals with delivery charge.
Actions by status: `PENDING` → cancel; `CONFIRMED|PACKED` → request cancellation (reason; show pending/approved/rejected state); `SHIPPED` → no cancel, show "file a complaint" for non-delivery/late; `DELIVERED` → review each item (within the review window; rating 1–5, comment, up to 3 images) and complaint (within the 48 h window — show remaining time; photos required for damaged/not-as-described). Disable actions outside their windows with an explanation.

### 8.4 Seller onboarding wizard (`/seller/apply`)
Steps with autosave per step: (1) business profile; (2) documents (NID front/back, trade license optional, nursery photo) uploaded via `/uploads/documents` then attached; (3) shop details (name, slug preview, description, logo/banner, location); (4) delivery zones (≥ 1 required; district multi-select or nationwide; overlap errors surfaced); (5) payout account (optional now; number is write-only — show masked values afterwards); (6) review & submit (requires verified email; completeness errors listed per step). After submit → "under review" state with polling/refresh of `me`; on rejection show reason and let the seller edit and resubmit. Approval triggers a notification and unlocks the dashboard.

### 8.5 Seller product editor
Tabs/sections: basics (name, Bangla name, category, scientific name, description), care guide (light, watering, difficulty, indoor, pet-safe, height, instructions), **variants table** (name, size, pot, price, compare-at, stock, threshold, active; at least one), images (upload, reorder, primary; max 8; ≥ 1 to activate), status (draft/active/inactive; show "pending review" or rejection reason depending on settings). Stock adjust dialog (add/remove/set with reason). Warn on leaving with unsaved changes. Low-stock badges.

### 8.6 Seller orders and earnings
Orders list by status tabs with counts; detail shows items, customer contact and address (only for the seller's own shop order), commission and net amounts. Status actions follow the state machine (PENDING→CONFIRMED/CANCELLED; CONFIRMED→PACKED/CANCELLED; PACKED→SHIPPED(+courier, tracking, ETA)/CANCELLED; SHIPPED→DELIVERED/FAILED_DELIVERY; FAILED_DELIVERY→SHIPPED/CANCELLED(+restock choice)); show only valid next actions; reasons required for cancel/failed.
Earnings: the ledger balance is **signed — positive means PlantHaat owes the seller, negative means the seller owes PlantHaat** (COD commission due). Present plainly in words ("PlantHaat will pay you ৳X" / "You owe PlantHaat ৳X commission from cash-on-delivery orders"), then ledger rows (type, order link, amount, date) and payout history. Read-only.

### 8.7 Admin seller review
Queue filtered by status; detail page shows profile, shop, zones and documents. Documents come from an authenticated endpoint: fetch with credentials, render via blob URL (images inline, PDFs in viewer/new tab); never expose raw storage paths. Approve (one click + confirm) or reject (required reason) or suspend/reactivate; show audit trail entries for the seller.

### 8.8 Notifications
Realtime via the socket (§3.6) with the polling fallback. Bell dropdown shows the latest items; the full list supports mark read / mark all read; toasts for new items while the tab is visible; deep-link by notification `type` and `data`. The unread count lives in one TanStack Query entry updated by socket events, mutations and the fallback poll.

---

## 9. Next.js feature usage, caching, SEO and performance

Use the installed Next.js version's official docs for exact APIs (the names below are Next.js 16 concepts); prefer stable APIs; log any experimental flag you enable.

### 9.1 Rendering and caching strategy
| Route | Strategy |
|---|---|
| `/` | Static shell + cached sections via **Cache Components** (`"use cache"`, `cacheLife` minutes, `cacheTag('home','banners','categories')`); below-the-fold sections streamed with `<Suspense>`; client-resolved auth bits |
| `/products` | Server Component reading `searchParams`; the data function is cached per normalized query (`cacheTag('products')`, short `cacheLife`); filters are a client island using URL state + `useTransition`; `loading.tsx` skeleton |
| `/products/[slug]` | `generateStaticParams` for the top N products + on-demand for the rest; cached with tags `products`, `product:<slug>`, `shop:<shopSlug>`; reviews/related streamed in `<Suspense>`; **client island refetches live price/stock** (TanStack Query via gateway, short `staleTime`) because cached HTML can be stale; `generateMetadata`, JSON-LD, `opengraph-image` |
| `/shops`, `/shops/[slug]` | Same pattern, tags `shops`, `shop:<slug>` |
| Static content pages | Fully static |
| Private areas | Dynamic, `noindex`, `loading.tsx` skeletons, no shared caching |

### 9.2 Framework features to use
- Route groups with nested layouts per audience; `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx` at the right segments.
- **Parallel + intercepting routes** for a product **quick-view modal** on listing pages (a direct hit renders the full page); provide `default.tsx` for parallel slots as the installed version requires.
- **Streaming** with `<Suspense>` boundaries; avoid waterfalls (`Promise.all` in Server Components); preload the LCP image.
- `next/image` (remote patterns for the storage/CDN host, `sizes`, `priority` only for the LCP image, blur placeholders), `next/font`, `next/script` with a lazy strategy for anything third-party, `next/dynamic` for heavy client components (charts, rich editors, large dialogs).
- Metadata API (`metadataBase`, `generateMetadata`, canonical URLs), `sitemap.ts`, `robots.ts`, `opengraph-image` (`ImageResponse`), JSON-LD (`Product`, `Offer`, `AggregateRating`; serialize safely, escape `<`).
- React: `useOptimistic` + `useTransition` for wishlist toggles and cart quantity; Suspense for data; **React Compiler** if stable in the installed version (enable, run the test suite, log the decision).
- `after()` for non-critical post-response work (e.g. gateway metrics); `proxy.ts` for session refresh/guard/headers (§4.3); typed routes if stable.
- Link prefetch: default for public links; `prefetch={false}` for private-area links.
- Tooling: Turbopack, bundle analyzer script (`npm run analyze`), budget checks in CI.

### 9.3 Invalidation
Tags: `home`, `banners`, `categories`, `products`, `product:<slug>`, `shops`, `shop:<slug>`, `product-reviews:<slug>`. `src/server/cache-tags.ts` holds a **mutation-route → tags** map used by the gateway after successful mutations (e.g. seller product/variant/stock/image routes and admin product moderation → `products`; admin categories → `categories`, `products`; banners/sections → `home`, `banners`; seller shop/vacation/zones → `shops`; review create/reply/hide → `product-reviews`). Use the invalidation API appropriate for Route Handlers in the installed version (consult its docs for the immediate-vs-stale semantics). Backend-originated changes (cron auto-cancel, admin actions made elsewhere) rely on time-based expiry (60–300 s).

### 9.4 SEO
`generateMetadata` per product/shop/category; sitemap generated by paging through the API; `robots.ts` disallowing `/seller`, `/admin`, `/cart`, `/checkout`, `/account`, `/orders`, `/wishlist`, `/notifications`, `/complaints`; `noindex` on private pages; canonical URLs; no `hreflang` in v1 (cookie locale). Product `viewCount` is incremented by the backend on `GET /products/:slug`, which cached pages no longer hit per visit — send a once-per-session view beacon through the gateway when the backend provides it (change request).

### 9.5 Performance targets and measures
LCP < 2.5 s on home and product pages (mid-range Android, 4G), CLS < 0.1, public-page initial JS ≲ 150 KB gzip. Server-render catalog pages, keep client components small and leaf-level, dynamic-import charts/editors, compress images, subset fonts, no layout shift from late-loading banners (reserve space). Track with Lighthouse CI or equivalent in F8.

---

## 10. Security
- Tokens only in httpOnly cookies owned by the Next.js origin; no tokens in JS; no secrets in `NEXT_PUBLIC_*`; server-only modules fenced with `server-only`.
- Gateway: path allow-list and normalization, fixed upstream, origin/CSRF check on mutations, header allow-list forwarding, body size and timeout limits, no logging of secrets, `private, no-store` on authenticated responses.
- Security headers via `proxy.ts` or `next.config` (CSP appropriate for self + image host + the realtime URL in `connect-src`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection). Prefer a nonce-based CSP if feasible; log any relaxation.
- Keep Next.js and dependencies patched; run `npm audit` in CI.
- Validate `returnTo` (relative same-origin only). Render all user content as text; never `dangerouslySetInnerHTML` (JSON-LD excepted, serialized safely).
- Respect rate limits (`429`) with backoff; do not auto-retry mutations except the idempotent checkout flow.
- Seller documents and admin views: authenticated fetch, blob URLs, no persistence beyond the session.
- Rate limiting and lockout rely on the real client IP forwarded by the BFF — see the backend change request on trusted client IP.

---

## 11. Environment variables (`.env.example` lists all; validate with zod in separate server/client env modules)
Server-only: `API_INTERNAL_URL` (e.g. `http://localhost:5000`), `BFF_SHARED_SECRET` (optional locally; must equal the backend's when set), `BACKEND_TIMEOUT_MS`, `GATEWAY_MAX_BODY_MB`, `REVALIDATE_SECRET` (only if the optional revalidate route is used), `SITE_ORIGINS_EXTRA` (optional).
Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE=bn`, `NEXT_PUBLIC_SUPPORT_PHONE`/`EMAIL` (placeholders).
The backend's `CORS_ORIGINS`/`APP_URL` must include the frontend origin (`http://localhost:3000` locally) because the realtime socket handshake is checked against it.

---

## 12. Testing and quality gates
- **Unit/component (Vitest + Testing Library + MSW):** gateway (allow-list rejects traversal; origin check rejects cross-origin POST; Bearer forwarding; `ph_rt` only on refresh/logout; `Set-Cookie` translation incl. clears; header stripping; refresh + replay **single-flight with parallel 401s → exactly one backend refresh**; error envelope for upstream failures), `proxy.ts` refresh logic (skips prefetch, sets request + response cookies), browser client (envelope unwrap, error mapping, retry-once, no loop on `/auth/*`), proactive refresh scheduling, guest-cart merge/clamping, money/date/phone helpers, auth gates, key forms.
- **E2E (Playwright, local backend + demo seed/test DB):** register/login; **silent refresh** (delete only `ph_at`; open a private page → no login redirect via `proxy.ts`; fire parallel client calls → no visible error; count backend refresh calls); guest cart → login merge → COD checkout; seller flow (apply → admin approve → product → confirm → ship → deliver); review after delivery; role gating; realtime (a seller status change produces a notification toast within seconds — skip with a clear marker until the backend feature exists; polling fallback must pass regardless); upload through the gateway (5 MB image).
- Axios layer (MSW): refresh interceptor single-flight and retry-once, error normalization (network, timeout, envelope errors), array param serialization, upload progress/cancellation.
- Gate before a phase is done: `lint`, `tsc --noEmit`, unit tests, `next build`, the phase's e2e flows, axe checks on key pages, and the Playwright **visual QA** of §6.3 for every UI built in the phase (light and dark).

---

## 13. Build phases (acceptance criteria)
| Phase | Content | Done when |
|---|---|---|
| F0 | Scaffold review (Next 16 config: Cache Components, typed routes, React Compiler decision), tokens (Appendix B), shadcn init + base components (Appendix A), Axios clients, i18n (bn/en), fonts, route-group layouts, env modules, `server/` helpers, **gateway skeleton** (allow-list, origin check, header forwarding, cookie translation), `proxy.ts` skeleton, `api:types`, browser client skeleton, git hygiene | app runs, health call works through gateway and via `serverApi`, `build` green |
| F1 | Auth: gateway refresh + replay, `proxy.ts` refresh, browser fallback, AuthProvider, login/register/seller register/verify/forgot/reset, guards (`requireSession`), sessions page, verification banner, logout | refresh unit tests + silent-refresh e2e pass; Bearer-without-Origin check logged |
| F2 | Public catalog: home, product list with filters, product detail (live price/stock island), shop pages, quick-view parallel/intercepting route, caching + tags, SEO | Lighthouse targets met; filters sync with URL; tag invalidation verified |
| F3 | Guest + server cart, cart issues, checkout (COD), orders list/detail, cancel/cancellation request | multi-shop checkout e2e green; idempotency retry verified |
| F4 | Account (profile, addresses, sessions), wishlist, **notifications (polling fallback now; socket when the backend delivers it)**, reviews, complaints | windows/validation behave as the API dictates |
| F5 | Seller onboarding wizard + status screens, shop, delivery zones, payout accounts | apply → admin approve → dashboard access works end-to-end |
| F6 | Seller operations: products/variants/images/stock, orders & cancellations, reviews, complaints, earnings, analytics | seller flow e2e green |
| F7 | Admin console: seller review (documents viewer), moderation, orders, complaints, refunds, finance, content, announcements, settings, audit logs, analytics | all admin areas guarded and usable on mobile |
| F8 | Polish & hardening: a11y pass, performance budgets, error/empty states audit, CSP/security headers, README, Playwright suite, deployment notes | checklist in `FRONTEND_CONTEXT.md` fully ticked |

**R1 — Retrofit (do immediately if the app already exists without it, then continue the phases):** (1) keep the existing light-only `next-themes` setup (the former dark-mode step is superseded by §6.4); (2) apply the modern visual language (§6.5) to the shell, home, listing and any product pages already built — time-boxed; (3) verify the changed pages at 360/768/1280 in light mode; (4) commit and log in `FRONTEND_CONTEXT.md`. Every later phase must meet §6.4–6.5 from the start.

---

## 14. Backend change requests (log status in `FRONTEND_CONTEXT.md`; never edit `backend/` yourself)
Full specs are in `backend/docs/BACKEND_CHANGE_REQUESTS.md` (the developer gives it to the backend agent). Until an item is delivered (check `backend/docs/BACKEND_CONTEXT.md` §9/§10 and `openapi.json`), use the stated workaround:
1. **Realtime gateway + `POST /realtime/ticket`** — workaround: polling fallback (§3.6).
2. **Trusted client IP behind the BFF** (`BFF_SHARED_SECRET`, `X-Forwarded-For`) — without it all users share the Next.js server's IP for throttling/sessions/audit; works locally, **must be delivered before production**.
3. **S3/R2 storage driver** (currently a stub) — production blocker; local driver works in dev.
4. **`GET /admin/payments`** — admin payments page blocked until delivered.
5. **Production start** (`tsx` as a production dependency / verified `npm ci --omit=dev && npm start`).
6. **OpenAPI response schemas** for the endpoints the frontend uses most — workaround: hand-written zod types.
7. **Verify** order status history and shop-order fields in order detail responses, notification preferences via `PATCH /users/me`, and that login/register/refresh return `accessTokenExpiresAt` and `user`.
8. **Product view beacon** `POST /products/:id/view` (view counting under cached pages).
9. **Optional (only if the developer asks):** presigned direct uploads for hosts that limit request bodies.
Resolved by the BFF design (no backend change needed): widening the refresh-cookie path, browser CORS/cookie-domain setup.

---

## Appendix A — shadcn/ui commands (run inside `frontend/`)
Prefer non-interactive commands. If a flag is not recognized by the installed CLI, run `npx shadcn@latest init --help` / `add --help`, use the equivalent, and log it.

```bash
# F0 — once. Detects Next.js + Tailwind v4, writes components.json, src/lib/utils.ts and the theme in globals.css
npx shadcn@latest init -d --base radix
npx shadcn@latest info            # verify what was detected/configured
# then replace the theme variables in src/app/globals.css with Appendix B

# Inspect before using anything
npx shadcn@latest search <term>
npx shadcn@latest list
npx shadcn@latest docs <component>
npx shadcn@latest view <component>
```
Dark mode is disabled: the app is light-only via `forcedTheme="light"`; see 6.4.
Optional: if your agent client supports MCP, `npx shadcn@latest mcp init --client <client>` lets the agent browse and install components through the shadcn MCP server.

**Install per phase** (`npx shadcn@latest add …`; `toast` is replaced by `sonner`):
- **F0 base set:** `button input label textarea select checkbox radio-group switch card badge separator skeleton sonner dialog alert-dialog sheet dropdown-menu popover tabs tooltip avatar alert scroll-area breadcrumb`
- **Forms:** run `npx shadcn@latest docs form` and install what the installed CLI recommends for react-hook-form (`form` or the newer `field` primitives).
- **F2 (catalog):** `navigation-menu carousel pagination aspect-ratio accordion hover-card collapsible toggle-group slider command drawer` (+ `empty` if available per `search`)
- **F3 (cart/orders):** `progress table`
- **F5–F7 (seller/admin):** `table sidebar chart calendar toggle` (the data table, combobox and date-range picker are **patterns composed from installed primitives** per shadcn docs: table + TanStack Table, popover + command, popover + calendar)
After every `add`: review `git diff`; run lint/typecheck; do not hand-edit generated files except for the customizations allowed in §6.2.

## Appendix B — Design tokens for `src/app/globals.css` (Tailwind v4 + shadcn theme)
Replace the generated color variables with these values (keep the generated structure; hex is acceptable — if the CLI emitted OKLCH, either convert consistently or keep hex consistently). The app is light-only (§6.4). The `.dark` block is retained but unused.

```css
:root {
  --radius: 0.75rem;
  --background: #F6FAF0;            --foreground: #0F2A1D;
  --card: #FFFFFF;                  --card-foreground: #0F2A1D;
  --popover: #FFFFFF;               --popover-foreground: #0F2A1D;
  --primary: #375534;               --primary-foreground: #FFFFFF;
  --secondary: #E3EED4;             --secondary-foreground: #0F2A1D;
  --muted: #EDF3E3;                 --muted-foreground: #4F6B55;
  --accent: #E3EED4;                --accent-foreground: #0F2A1D;
  --destructive: #B3261E;           --destructive-foreground: #FFFFFF;
  --border: #AEC3B0;                /* decorative dividers */
  --input: #6B9071;                 /* control borders (>= 3:1 on white) */
  --ring: #375534;
  /* project tokens */
  --cta: #F2A93B;                   --cta-foreground: #0F2A1D;
  --offer: #C2562D;                 --offer-foreground: #FFFFFF;
  --success: #2E7D32;               --success-foreground: #FFFFFF;
  --warning: #FDF3DC;               --warning-foreground: #8A5A00;
  --info: #1F6F8B;                  --info-foreground: #FFFFFF;
  --chart-1: #375534; --chart-2: #6B9071; --chart-3: #F2A93B; --chart-4: #C2562D; --chart-5: #1F6F8B;
  /* seller/admin sidebar: dark ink */
  --sidebar: #0F2A1D;               --sidebar-foreground: #E3EED4;
  --sidebar-primary: #F2A93B;       --sidebar-primary-foreground: #0F2A1D;
  --sidebar-accent: #375534;        --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #375534;        --sidebar-ring: #AEC3B0;
}
@theme inline {
  --color-cta: var(--cta);                 --color-cta-foreground: var(--cta-foreground);
  --color-offer: var(--offer);             --color-offer-foreground: var(--offer-foreground);
  --color-success: var(--success);         --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);         --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);               --color-info-foreground: var(--info-foreground);
}
```
```css
.dark {
  --background: #0A1C13;            --foreground: #E3EED4;
  --card: #102A1D;                  --card-foreground: #E3EED4;
  --popover: #102A1D;               --popover-foreground: #E3EED4;
  --primary: #AEC3B0;               --primary-foreground: #0F2A1D;
  --secondary: #16382A;             --secondary-foreground: #E3EED4;
  --muted: #16382A;                 --muted-foreground: #A9BFAE;
  --accent: #1C3F2D;                --accent-foreground: #E3EED4;
  --destructive: #F2766B;           --destructive-foreground: #0F2A1D;
  --border: #2E4F3D;                --input: #7FA687;
  --ring: #AEC3B0;
  --cta: #F2A93B;                   --cta-foreground: #0F2A1D;
  --offer: #F08A5D;                 --offer-foreground: #0F2A1D;
  --success: #66BB6A;               --success-foreground: #0F2A1D;
  --warning: #2E2410;               --warning-foreground: #F2C265;
  --info: #5BB5D5;                  --info-foreground: #0F2A1D;
  --chart-1: #AEC3B0; --chart-2: #7FA687; --chart-3: #F2A93B; --chart-4: #F08A5D; --chart-5: #5BB5D5;
  --sidebar: #071410;               --sidebar-foreground: #E3EED4;
  --sidebar-primary: #F2A93B;       --sidebar-primary-foreground: #0F2A1D;
  --sidebar-accent: #16382A;        --sidebar-accent-foreground: #E3EED4;
  --sidebar-border: #16382A;        --sidebar-ring: #AEC3B0;
}
```
Dark-theme contrast (checked): cream text on background 14.7:1, on card 12.7:1; muted text on muted 6.6:1; mist on card 8.2:1; control borders `#7FA687` on card 5.6:1; ink text on marigold 7.7:1, on offer 6.2:1, on success 6.5:1, on info 6.6:1, on destructive 5.5:1; warning text 9.2:1.

Add `cta` (marigold) and `offer` variants to the installed `Button`/`Badge` via their `cva` definitions. Buttons and chips use the pill shape (`rounded-full`); cards `rounded-2xl`; inputs use `--radius`. Hover/pressed states for marigold: darken in small steps and re-verify ink-text contrast ≥ 4.5:1.

### Shared password field and keyboard-only card focus (2026-11-18)

- Every password input renders through `<PasswordInput/>` (`src/components/ui/password-input.tsx`): shadcn Input + one 44 px toggle button (`type="button"`, Eye/EyeOff, aria-pressed, aria-controls, "Show/Hide password" / "পাসওয়ার্ড দেখান/লুকান"). It only flips `type`; it never changes value, autocomplete, focus or caret, and the Edge/IE `::-ms-reveal` eye is hidden in `globals.css`. Do not add raw password inputs; `tests/password-input-guard.test.ts` enforces this.
- Card focus: exactly ONE complete frame around the whole card, only for real keyboard focus, painted ABOVE the artwork. Clickable cards carry `data-card-focus`; a `::after` overlay (`position:absolute; inset:0; border:2px solid transparent; border-radius:inherit; pointer-events:none; z-index:15`) turns `var(--ring)` only under `html[data-input-modality="keyboard"]` AND `:has(a:focus-visible)` (or the anchor itself is `data-card-focus` and `:focus-visible`). The modality attribute is set by `components/layout/input-modality.tsx` (any keydown = keyboard, any pointerdown = pointer). Never use `:focus-within`, never an inset box-shadow under the image, never a second link ring. Pointer clicks, hover, active and Back show no green frame even if Chrome marks the link `:focus-visible`.

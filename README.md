# PlantHaat Frontend

Next.js (App Router) storefront, seller dashboard and admin console for
PlantHaat, consuming the backend API through a Backend-for-Frontend (BFF).

See `docs/FRONTEND_DESIGN.md` (spec) and `docs/FRONTEND_CONTEXT.md` (working rules +
progress log).

## Architecture (BFF)

The browser never calls the backend directly. Three paths:

1. **Server Components → backend** via `src/server/backend.ts` (`serverApi`,
   Axios). Reads are wrapped in `"use cache"` with `cacheTag`/`cacheLife`
   (`src/features/*/server.ts`) so the catalog is cached by tag, not by URL.
2. **Client Components → `/api/v1/*` Route Handler gateway**
   (`src/app/api/v1/[...path]/route.ts`) → backend. The gateway enforces an
   origin allow-list, forwards `Authorization: Bearer` + `ph_rt`, translates the
   backend's `Set-Cookie` into Next-origin httpOnly cookies, refreshes once on a
   401 (single-flight) and invalidates cache tags after successful mutations.
3. **Realtime socket → backend directly** (ticket-authenticated, `backend/docs/api/realtime.md`).

`src/proxy.ts` (Next 16 middleware) refreshes the session before private routes
render. Tokens live only in httpOnly cookies owned by the Next.js origin
(`ph_at` 15 min, `ph_rt` 30 days).

## Setup

```bash
npm install
cp .env.example .env.local   # fill values (API_INTERNAL_URL etc.)
npm run api:types            # regenerate src/lib/api/schema.d.ts (already committed)
npm run dev
```

The backend must be running (default `http://localhost:5000`). Its
`CORS_ORIGINS`/`APP_URL` should include `http://localhost:3000`, and if
`BFF_SHARED_SECRET` is set there, set the same value in `.env.local`.
Use `API_INTERNAL_URL=http://127.0.0.1:5000` (IPv4), not `localhost` — on Node
`localhost` can resolve to `::1` first and add latency/spikes.

## Environment variables

Public (sent to the browser, `NEXT_PUBLIC_*`): `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`,
`NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
Server-only: `API_INTERNAL_URL`, `BFF_SHARED_SECRET`, `BACKEND_TIMEOUT_MS`,
`GATEWAY_MAX_BODY_MB`, `REVALIDATE_SECRET`, `SITE_ORIGINS_EXTRA`.
Validated with zod at boot (`src/env/server.ts`, `src/env/client.ts`).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm run api:types` | Generate API types from `openapi/openapi.json` |
| `npm test` / `test:watch` | Vitest (unit/component) |
| `npm run test:e2e` | Playwright (reuses a running `:3000`; never starts servers) |

Production build into a throwaway dir: `NEXT_DIST_DIR=.next-prod npm run build`
then `NEXT_DIST_DIR=.next-prod npx next start -p 3100`.

## Caching

- Public catalog reads use function-level `"use cache"` + `cacheTag`/`cacheLife`
  (`src/server/cache-tags.ts`); the gateway calls `revalidateTag(tag, "max")`
  after mutations.
- Lists that change often (`GET /products` cursor pages, `GET /categories`,
  filter facets) are cached briefly on the backend (in-memory), and the
  home `/products` feed is cached under a 15-minute seed.
- Private pages (account/seller/admin/cart/checkout/orders) are `no-store` and
  `noindex` (see `robots.ts` + `next.config.ts` headers).

## Testing

- Unit/component: Vitest + Testing Library + MSW (`tests/`, `src/**/*.spec`).
- E2E: Playwright (`e2e/`) against the running servers, `reuseExistingServer`.
  Run per-suite with `--workers=1` when the dev server is compiling.

## Conventions

- Server Components by default; `"use client"` only where interactivity needs it.
- Money may arrive as strings — display with `Intl.NumberFormat`, never compute
  prices as truth.
- All user-facing text goes through next-intl (`bn` default, `en`).
- UI primitives come from shadcn/ui (installed via its CLI); colors are design
  tokens only. Bangla uses the self-hosted Hind Siliguri fallback (the supplied
  `Kalpurush.ttf` has no Bengali glyphs / layout tables, so it is not wired).

## Cloudinary image storage

Backend (`backend/`):
- Env: `STORAGE_DRIVER=auto|cloudinary|s3|local` (auto = Cloudinary when
  `CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET` are set, else local),
  `CLOUDINARY_FOLDER_PREFIX` (default `planthaat/<NODE_ENV>`). Local disk is
  refused in production; tests always use local.
- Uploads keep multer memory storage + magic-byte checks + the sharp pipeline
  (EXIF rotate before stripping, no upscale, 2000 px products / 1600 px others),
  then stream to Cloudinary. Public images use `type=upload` +
  `access_mode=public`; seller documents are `type=authenticated` under
  `planthaat/<env>/private/seller-docs` and are only exposed via a ~5-minute
  signed URL (the admin document route redirects to it).
- Orphan control: every upload is a `PENDING` `UploadedAsset`; attaching its URL
  marks it `ATTACHED`; an hourly cron removes `PENDING` assets older than 24 h.
- Cloudinary account settings to check: **Settings ? Security ? Restricted media
  types** must allow PDFs (otherwise signed/private delivery 401s).
- Live checks after filling the env:
  `npm run uploads:smoke` (public 200, private unsigned not 200, signed 200,
  delete) and `npm run uploads:migrate` (dry-run; add `-- --apply` to move local
  `/uploads/...` files and rewrite stored URLs).

Frontend:
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` enables `src/lib/images/cloudinary-loader.ts`
  (`f_auto,q_auto,c_limit,w_<width>` inserted after `/upload/`); non-Cloudinary
  URLs keep the default `/_next/image` optimizer.
- `PlantImage` (`src/components/plant-image.tsx`) is the single product-image
  component: fixed-aspect callers, blurred placeholder while loading, the
  neutral plant placeholder (`public/placeholders/plant-placeholder.webp`) on
  error or when no image exists. Replace that file with the final artwork.
- `next.config.ts` allows only `res.cloudinary.com/<cloud>/**` when Cloudinary is
  configured (production CSP `img-src` likewise); localhost images are allowed in
  dev and when Cloudinary is not configured.

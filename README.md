# PlantHaat Frontend

Next.js (App Router) storefront, seller dashboard and admin console for
PlantHaat, consuming the backend API through a Backend-for-Frontend (BFF).

See `../FRONTEND_DESIGN.md` (spec) and `../FRONTEND_CONTEXT.md` (working rules +
progress log).

## Architecture (BFF)

The browser never calls the backend directly. Three paths:

1. **Server Components → backend** via `src/server/backend.ts` (`serverApi`).
2. **Client Components → `/api/v1/*` Route Handler gateway** (`src/app/api/v1/[...path]/route.ts`)
   → backend. The gateway forwards `Authorization: Bearer` and translates the
   backend's `ph_at`/`ph_rt` `Set-Cookie` headers into Next-origin cookies.
3. **Realtime socket → backend directly** (ticket-authenticated, §3.6).

`src/proxy.ts` (Next 16's `middleware`) refreshes the session before private
routes render. Tokens live only in httpOnly cookies owned by the Next.js origin.

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

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm run api:types` | Generate API types from `openapi/openapi.json` |
| `npm test` / `test:watch` | Vitest (unit/component) |
| `npm run test:e2e` | Playwright |

## Conventions

- Server Components by default; `"use client"` only where interactivity needs it.
- Money may arrive as strings — display with `Intl.NumberFormat`, never compute
  prices as truth.
- All user-facing text goes through next-intl (`bn` default, `en`).
- UI primitives come from shadcn/ui (installed via its CLI); colors are design
  tokens only.
